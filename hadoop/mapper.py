#!/usr/bin/env python3
"""
Hadoop MapReduce Mapper for BetweenUs Relationship Interaction Dataset.

Dynamically maps columns by header name rather than assuming fixed positions or an 8-column schema.
Supports the full 18-column schema, 8-column baseline schema, or custom CSV layouts.

Required logical fields:
- Couple_ID
- Interaction_ID
- Partner_ID
- Communication (1.0 to 5.0)
- Trust (1.0 to 5.0)
- Support (1.0 to 5.0)
- Conflict_Resolution (1.0 to 5.0)

Optional fields:
- Interaction_Type (e.g. Conflict_Discussion, Financial_Planning, Daily_Logistics, Emotional_Checkin, Leisure_Planning)
- Timestamp / Date

Emits:
<Couple_ID>\t<Interaction_ID> \t <Partner_ID>|<Communication>|<Trust>|<Support>|<Conflict_Resolution>|<Interaction_Type>|<Timestamp>
"""

import sys
import csv

def normalize_header(name):
    return name.lower().replace('_', '').replace(' ', '').strip()

def find_column_index(normalized_headers, candidate_names):
    for candidate in candidate_names:
        norm_candidate = normalize_header(candidate)
        for idx, h in enumerate(normalized_headers):
            if h == norm_candidate:
                return idx
    return None

def main():
    reader = csv.reader(sys.stdin)
    
    col_couple_id = None
    col_interaction_id = None
    col_partner_id = None
    col_interaction_type = None
    col_comm = None
    col_trust = None
    col_supp = None
    col_conf = None
    col_ts = None
    
    header_found = False

    for row in reader:
        if not row or all(c.strip() == '' for c in row):
            continue

        # Detect and parse header row
        if not header_found:
            normalized = [normalize_header(c) for c in row]
            
            # Check if this row looks like a header
            has_id = any('id' in h for h in normalized)
            has_comm = any('comm' in h for h in normalized)
            
            if has_id or has_comm:
                col_couple_id = find_column_index(normalized, ['couple_id', 'coupleid', 'couple'])
                col_interaction_id = find_column_index(normalized, ['interaction_id', 'interactionid', 'interaction'])
                col_partner_id = find_column_index(normalized, ['partner_id', 'partnerid', 'partner'])
                col_interaction_type = find_column_index(normalized, ['interaction_type', 'interactiontype', 'type'])
                col_comm = find_column_index(normalized, ['communication', 'comm'])
                col_trust = find_column_index(normalized, ['trust'])
                col_supp = find_column_index(normalized, ['support', 'supp'])
                col_conf = find_column_index(normalized, ['conflict_resolution', 'conflictresolution', 'conflict', 'conf'])
                col_ts = find_column_index(normalized, ['timestamp', 'created_at', 'date', 'ts'])
                header_found = True
                continue
            else:
                # If no header was present, apply standard positional defaults
                col_couple_id = 0
                col_interaction_id = 1
                col_partner_id = 2
                col_comm = 3
                col_trust = 4
                col_supp = 5
                col_conf = 6
                header_found = True

        # Process data rows
        try:
            # Extract fields dynamically based on detected header indices
            couple_id = row[col_couple_id].strip() if col_couple_id is not None and col_couple_id < len(row) else ''
            interaction_id = row[col_interaction_id].strip() if col_interaction_id is not None and col_interaction_id < len(row) else ''
            partner_id = row[col_partner_id].strip() if col_partner_id is not None and col_partner_id < len(row) else ''
            
            if not couple_id or not interaction_id or not partner_id:
                continue

            comm_str = row[col_comm].strip() if col_comm is not None and col_comm < len(row) else ''
            trust_str = row[col_trust].strip() if col_trust is not None and col_trust < len(row) else ''
            supp_str = row[col_supp].strip() if col_supp is not None and col_supp < len(row) else ''
            conf_str = row[col_conf].strip() if col_conf is not None and col_conf < len(row) else ''
            
            comm = float(comm_str)
            trust = float(trust_str)
            supp = float(supp_str)
            conf = float(conf_str)

            # Rating validity: ratings must be within [1.0, 5.0]
            if not (1.0 <= comm <= 5.0 and 1.0 <= trust <= 5.0 and 1.0 <= supp <= 5.0 and 1.0 <= conf <= 5.0):
                continue

            interaction_type = (row[col_interaction_type].strip() if col_interaction_type is not None and col_interaction_type < len(row) else 'General') or 'General'
            timestamp = (row[col_ts].strip() if col_ts is not None and col_ts < len(row) else '')

            # Composite Key: Couple_ID\tInteraction_ID
            # Value: partner_id|comm|trust|supp|conf|interaction_type|timestamp
            key = f"{couple_id}\t{interaction_id}"
            val = f"{partner_id}|{comm:.2f}|{trust:.2f}|{supp:.2f}|{conf:.2f}|{interaction_type}|{timestamp}"
            print(f"{key}\t{val}")

        except (ValueError, IndexError, TypeError):
            # Malformed line skipped safely
            continue

if __name__ == '__main__':
    main()
