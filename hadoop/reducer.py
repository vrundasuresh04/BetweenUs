#!/usr/bin/env python3
"""
Hadoop MapReduce Reducer for BetweenUs Relationship Interaction Dataset.

Consumes sorted stream keyed by:
<couple_id>\t<interaction_id>\t<partner_id>|<comm>|<trust>|<supp>|<conf>|<interaction_type>|<timestamp>

Pairs partner assessments for each interaction and calculates Perspective Gap Score (PGS):
  PGS = [(P1_comm - P2_comm)^2 + (P1_trust - P2_trust)^2 + (P1_supp - P2_supp)^2 + (P1_conf - P2_conf)^2] / 4.0

Emits:
- Per-couple aggregate records: <couple_id>\t<json_summary>
- Final overall batch metrics: __AGGREGATE_SUMMARY__\t<json_summary>
"""

import sys
import json
from collections import defaultdict

def calculate_interaction_pgs(p1, p2):
    diff_c = p1['comm'] - p2['comm']
    diff_t = p1['trust'] - p2['trust']
    diff_s = p1['supp'] - p2['supp']
    diff_cf = p1['conf'] - p2['conf']
    
    sq_sum = (diff_c ** 2) + (diff_t ** 2) + (diff_s ** 2) + (diff_cf ** 2)
    pgs = round(sq_sum / 4.0, 4)
    
    return {
        'pgs': pgs,
        'comm_gap': round(abs(diff_c), 4),
        'trust_gap': round(abs(diff_t), 4),
        'supp_gap': round(abs(diff_s), 4),
        'conf_gap': round(abs(diff_cf), 4),
        'interaction_type': p1.get('type') or p2.get('type') or 'General',
        'timestamp': p1.get('ts') or p2.get('ts') or ''
    }

def flush_couple(couple_id, interactions_dict, global_stats):
    valid_pairs = 0
    incomplete = 0
    couple_pgs_sum = 0.0
    dim_sums = {'communication': 0.0, 'trust': 0.0, 'support': 0.0, 'conflict_resolution': 0.0}
    recent_interactions = []

    for iid, partners in interactions_dict.items():
        if len(partners) >= 2:
            p_keys = list(partners.keys())
            p1 = partners[p_keys[0]]
            p2 = partners[p_keys[1]]
            
            res = calculate_interaction_pgs(p1, p2)
            valid_pairs += 1
            couple_pgs_sum += res['pgs']
            dim_sums['communication'] += res['comm_gap']
            dim_sums['trust'] += res['trust_gap']
            dim_sums['support'] += res['supp_gap']
            dim_sums['conflict_resolution'] += res['conf_gap']
            
            # Update global stats
            global_stats['total_paired_interactions'] += 1
            global_stats['total_pgs_sum'] += res['pgs']
            itype = res['interaction_type']
            global_stats['by_type'][itype]['count'] += 1
            global_stats['by_type'][itype]['pgs_sum'] += res['pgs']

            if len(recent_interactions) < 5:
                recent_interactions.append({
                    'interaction_id': iid,
                    'pgs': res['pgs'],
                    'type': res['interaction_type'],
                    'timestamp': res['timestamp']
                })
        else:
            incomplete += 1
            global_stats['total_incomplete'] += 1

    mean_pgs = round(couple_pgs_sum / valid_pairs, 4) if valid_pairs > 0 else 0.0
    avg_dims = {
        k: round(dim_sums[k] / valid_pairs, 4) if valid_pairs > 0 else 0.0
        for k in dim_sums
    }

    couple_summary = {
        'couple_id': couple_id,
        'valid_pairs_count': valid_pairs,
        'incomplete_count': incomplete,
        'mean_pgs': mean_pgs,
        'dimension_gaps': avg_dims,
        'sample_recent': recent_interactions
    }
    
    print(f"{couple_id}\t{json.dumps(couple_summary)}")

def main():
    current_couple = None
    current_interactions = defaultdict(dict)
    
    global_stats = {
        'total_couples': 0,
        'total_paired_interactions': 0,
        'total_incomplete': 0,
        'total_pgs_sum': 0.0,
        'by_type': defaultdict(lambda: {'count': 0, 'pgs_sum': 0.0})
    }

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        parts = line.split('\t')
        if len(parts) < 3:
            # Check for 2-part format: couple_id \t payload (legacy)
            if len(parts) == 2:
                cid, payload = parts[0].strip(), parts[1].strip()
                p_items = payload.split('|')
                if len(p_items) >= 7:
                    iid = p_items[0]
                    pid = p_items[1]
                    comm, trust, supp, conf, itype, ts = p_items[2:8] if len(p_items) >= 8 else (p_items[2], p_items[3], p_items[4], p_items[5], 'General', p_items[6] if len(p_items) > 6 else '')
                else:
                    continue
            else:
                continue
        else:
            cid, iid, payload = parts[0].strip(), parts[1].strip(), parts[2].strip()
            p_items = payload.split('|')
            if len(p_items) < 5:
                continue
            pid = p_items[0].strip()
            try:
                comm = float(p_items[1])
                trust = float(p_items[2])
                supp = float(p_items[3])
                conf = float(p_items[4])
                itype = p_items[5].strip() if len(p_items) > 5 and p_items[5].strip() else 'General'
                ts = p_items[6].strip() if len(p_items) > 6 else ''
            except ValueError:
                continue

        record = {
            'partner_id': pid,
            'comm': float(comm),
            'trust': float(trust),
            'supp': float(supp),
            'conf': float(conf),
            'type': itype,
            'ts': ts
        }

        if current_couple == cid:
            current_interactions[iid][pid] = record
        else:
            if current_couple is not None:
                flush_couple(current_couple, current_interactions, global_stats)
                global_stats['total_couples'] += 1
            current_couple = cid
            current_interactions = defaultdict(dict)
            current_interactions[iid][pid] = record

    if current_couple is not None:
        flush_couple(current_couple, current_interactions, global_stats)
        global_stats['total_couples'] += 1

    # Output overall aggregate summary
    n_pairs = global_stats['total_paired_interactions']
    overall_mean_pgs = round(global_stats['total_pgs_sum'] / n_pairs, 4) if n_pairs > 0 else 0.0

    type_breakdown = []
    for itype, data in sorted(global_stats['by_type'].items(), key=lambda x: -x[1]['count']):
        cnt = data['count']
        mean_p = round(data['pgs_sum'] / cnt, 4) if cnt > 0 else 0.0
        type_breakdown.append({
            'type': itype,
            'count': cnt,
            'mean_pgs': mean_p
        })

    aggregate_summary = {
        'total_couples_processed': global_stats['total_couples'],
        'total_paired_interactions': n_pairs,
        'total_incomplete_interactions': global_stats['total_incomplete'],
        'overall_mean_pgs': overall_mean_pgs,
        'pgs_formula': 'mean of four squared assessment differences: [(c1-c2)^2 + (t1-t2)^2 + (s1-s2)^2 + (cf1-cf2)^2] / 4.0',
        'interaction_type_breakdown': type_breakdown
    }

    print(f"__AGGREGATE_SUMMARY__\t{json.dumps(aggregate_summary)}")

if __name__ == '__main__':
    main()
