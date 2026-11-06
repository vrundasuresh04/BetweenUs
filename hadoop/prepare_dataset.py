#!/usr/bin/env python3
"""
Synthetic Dataset Generator & Preprocessor for BetweenUs Big Data Analytics Pipeline.
Generates realistic relationship interaction records with:
- Paired Partner A & Partner B assessments per interaction
- 4 dimensions (communication, trust, support, conflict_resolution) with controlled divergence
- Structured timestamps and couple IDs
- Used for MapReduce testing, benchmark validation, and machine learning feature extraction.
"""

import os
import sys
import csv
import random
from datetime import datetime, timedelta

def generate_dataset(output_path, num_couples=100, interactions_per_couple=10):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    start_date = datetime(2026, 1, 1, 10, 0, 0)
    
    headers = [
        'interaction_id', 'couple_id', 'partner_id',
        'communication', 'trust', 'support', 'conflict_resolution', 'timestamp'
    ]
    
    rows_written = 0
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for c_idx in range(1, num_couples + 1):
            couple_id = f"CPL-{c_idx:04d}"
            partner_a_id = f"USR-{c_idx:04d}-A"
            partner_b_id = f"USR-{c_idx:04d}-B"
            
            # Baseline compatibility for this couple (1.0 to 5.0)
            base_comm = random.uniform(2.5, 4.8)
            base_trust = random.uniform(2.8, 5.0)
            base_supp = random.uniform(2.5, 4.8)
            base_conf = random.uniform(2.2, 4.5)
            volatility = random.choice([0.4, 0.8, 1.3])
            
            for i_idx in range(1, interactions_per_couple + 1):
                interaction_id = f"INT-{c_idx:04d}-{i_idx:03d}"
                ts = (start_date + timedelta(days=i_idx * 2, hours=random.randint(1, 12))).isoformat() + "Z"
                
                # Partner A ratings
                a_comm = round(max(1.0, min(5.0, base_comm + random.gauss(0, volatility * 0.5))), 1)
                a_trust = round(max(1.0, min(5.0, base_trust + random.gauss(0, volatility * 0.4))), 1)
                a_supp = round(max(1.0, min(5.0, base_supp + random.gauss(0, volatility * 0.5))), 1)
                a_conf = round(max(1.0, min(5.0, base_conf + random.gauss(0, volatility * 0.6))), 1)
                
                # Partner B ratings with realistic perspective difference
                b_comm = round(max(1.0, min(5.0, a_comm + random.gauss(0, volatility))), 1)
                b_trust = round(max(1.0, min(5.0, a_trust + random.gauss(0, volatility * 0.8))), 1)
                b_supp = round(max(1.0, min(5.0, a_supp + random.gauss(0, volatility * 0.9))), 1)
                b_conf = round(max(1.0, min(5.0, a_conf + random.gauss(0, volatility * 1.1))), 1)
                
                writer.writerow([interaction_id, couple_id, partner_a_id, a_comm, a_trust, a_supp, a_conf, ts])
                writer.writerow([interaction_id, couple_id, partner_b_id, b_comm, b_trust, b_supp, b_conf, ts])
                rows_written += 2

    file_size_kb = round(os.path.getsize(output_path) / 1024, 2)
    print(f"Generated {rows_written} rows at {output_path} ({file_size_kb} KB)")
    return output_path

if __name__ == '__main__':
    out_file = sys.argv[1] if len(sys.argv) > 1 else 'data/sample_interactions_1000.csv'
    couples = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    interactions = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    generate_dataset(out_file, couples, interactions)
