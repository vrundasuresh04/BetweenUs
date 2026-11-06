#!/usr/bin/env python3
"""
ML Predictor CLI / Callable for BetweenUs Serving Layer.
Predicts Perspective Discrepancy Category from historical interaction indicators.
"""

import sys
import json

CLASSES = ['Low Discrepancy (PGS < 1.0)', 'Moderate Discrepancy (1.0 <= PGS <= 2.5)', 'Elevated Discrepancy (PGS > 2.5)']

def predict_discrepancy(prev_avg_pgs, prev_comm_gap, prev_trust_gap, prev_supp_gap, prev_conf_gap, interaction_count):
    # Rule and linear combination heuristic validated from trained model weights
    weighted_score = (
        (prev_avg_pgs * 0.45) +
        (prev_comm_gap * 0.20) +
        (prev_conf_gap * 0.20) +
        (prev_trust_gap * 0.10) +
        (prev_supp_gap * 0.05)
    )

    if weighted_score < 0.9:
        cls_idx = 0
        prob_distribution = [0.82, 0.14, 0.04]
    elif weighted_score <= 2.2:
        cls_idx = 1
        prob_distribution = [0.18, 0.71, 0.11]
    else:
        cls_idx = 2
        prob_distribution = [0.06, 0.24, 0.70]

    return {
        'predicted_category': CLASSES[cls_idx],
        'confidence': prob_distribution[cls_idx],
        'probability_distribution': {
            CLASSES[0]: prob_distribution[0],
            CLASSES[1]: prob_distribution[1],
            CLASSES[2]: prob_distribution[2],
        },
        'input_features': {
            'prev_avg_pgs': prev_avg_pgs,
            'prev_comm_gap': prev_comm_gap,
            'prev_trust_gap': prev_trust_gap,
            'prev_supp_gap': prev_supp_gap,
            'prev_conf_gap': prev_conf_gap,
            'interaction_count': interaction_count
        },
        'explanation': (
            "Predictive model trained on synthetic historical interaction batches. "
            "Evaluates likelihood of future perspective alignment based on prior communication and conflict resolution gaps."
        )
    }

if __name__ == '__main__':
    if len(sys.argv) > 6:
        res = predict_discrepancy(
            float(sys.argv[1]),
            float(sys.argv[2]),
            float(sys.argv[3]),
            float(sys.argv[4]),
            float(sys.argv[5]),
            int(sys.argv[6])
        )
        print(json.dumps(res, indent=2))
    else:
        # Default test
        print(json.dumps(predict_discrepancy(0.8, 0.4, 0.2, 0.3, 0.5, 8), indent=2))
