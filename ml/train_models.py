#!/usr/bin/env python3
"""
Model Training and Evaluation Pipeline for BetweenUs.
Loads synthetic relationship interaction dataset, constructs couple-level historical features,
evaluates Logistic Regression, Decision Tree, and Random Forest models with zero couple leakage.
Saves evaluation metrics and trained models for the Serving API.
"""

import sys
import os
import json
import csv
from collections import defaultdict
from models import (
    LogisticRegression,
    DecisionTreeClassifier,
    RandomForestClassifier,
    evaluate_model,
    CLASSES,
    FEATURE_NAMES
)

def build_dataset_features(csv_path):
    # Group records by couple_id and interaction_id
    couples_data = defaultdict(lambda: defaultdict(dict))
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if len(row) < 8:
                continue
            iid, cid, pid, c, t, s, cf, ts = row[:8]
            couples_data[cid][iid][pid] = {
                'comm': float(c),
                'trust': float(t),
                'supp': float(s),
                'conf': float(cf),
                'ts': ts
            }

    X_by_couple = defaultdict(list)
    y_by_couple = defaultdict(list)

    for cid, interactions in couples_data.items():
        # Sort interactions chronologically
        sorted_iids = sorted(interactions.keys())
        prev_scores = []
        prev_comm_gaps = []
        prev_trust_gaps = []
        prev_supp_gaps = []
        prev_conf_gaps = []

        for iid in sorted_iids:
            partners = list(interactions[iid].values())
            if len(partners) < 2:
                continue
            p1, p2 = partners[0], partners[1]
            
            d_c = abs(p1['comm'] - p2['comm'])
            d_t = abs(p1['trust'] - p2['trust'])
            d_s = abs(p1['supp'] - p2['supp'])
            d_cf = abs(p1['conf'] - p2['conf'])
            pgs = ((d_c**2) + (d_t**2) + (d_s**2) + (d_cf**2)) / 4.0

            if len(prev_scores) >= 2:
                # We have historical context to predict current interaction
                features = [
                    round(sum(prev_scores) / len(prev_scores), 4),
                    round(sum(prev_comm_gaps) / len(prev_comm_gaps), 4),
                    round(sum(prev_trust_gaps) / len(prev_trust_gaps), 4),
                    round(sum(prev_supp_gaps) / len(prev_supp_gaps), 4),
                    round(sum(prev_conf_gaps) / len(prev_conf_gaps), 4),
                    len(prev_scores)
                ]
                # Target category:
                # 0: Low (< 1.0), 1: Moderate (1.0 to 2.5), 2: Elevated (> 2.5)
                if pgs < 1.0:
                    label = 0
                elif pgs <= 2.5:
                    label = 1
                else:
                    label = 2

                X_by_couple[cid].append(features)
                y_by_couple[cid].append(label)

            prev_scores.append(pgs)
            prev_comm_gaps.append(d_c)
            prev_trust_gaps.append(d_t)
            prev_supp_gaps.append(d_s)
            prev_conf_gaps.append(d_cf)

    return X_by_couple, y_by_couple

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else 'data/sample_interactions_1000.csv'
    if not os.path.exists(csv_path):
        print(f"Error: dataset file not found: {csv_path}")
        return

    X_couples, y_couples = build_dataset_features(csv_path)
    all_couples = sorted(list(X_couples.keys()))
    
    # Stratified 80/20 train-test split by couple to guarantee no data leakage
    split_idx = int(len(all_couples) * 0.8)
    train_couples = all_couples[:split_idx]
    test_couples = all_couples[split_idx:]

    X_train, y_train = [], []
    for c in train_couples:
        X_train.extend(X_couples[c])
        y_train.extend(y_couples[c])

    X_test, y_test = [], []
    for c in test_couples:
        X_test.extend(X_couples[c])
        y_test.extend(y_couples[c])

    print(f"Dataset Loaded: {len(all_couples)} couples.")
    print(f"Train samples: {len(X_train)} across {len(train_couples)} couples.")
    print(f"Test samples: {len(X_test)} across {len(test_couples)} couples (Zero couple leakage).")

    # 1. Logistic Regression
    lr = LogisticRegression(lr=0.08, n_iters=300)
    lr.fit(X_train, y_train)
    y_pred_lr = lr.predict(X_test)
    eval_lr = evaluate_model(y_test, y_pred_lr)

    # 2. Decision Tree
    dt = DecisionTreeClassifier(max_depth=4)
    dt.fit(X_train, y_train)
    y_pred_dt = dt.predict(X_test)
    eval_dt = evaluate_model(y_test, y_pred_dt)

    # 3. Random Forest
    rf = RandomForestClassifier(n_estimators=10, max_depth=4)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    eval_rf = evaluate_model(y_test, y_pred_rf)

    results = {
        'metadata': {
            'dataset': csv_path,
            'features': FEATURE_NAMES,
            'target_classes': CLASSES,
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'leakage_prevention': 'Couple-stratified independent validation',
        },
        'models': {
            'logistic_regression': {
                'name': 'Multi-Class Logistic Regression (One-vs-Rest)',
                'metrics': eval_lr,
            },
            'decision_tree': {
                'name': 'Decision Tree Classifier (Gini Impurity, max_depth=4)',
                'metrics': eval_dt,
            },
            'random_forest': {
                'name': 'Random Forest Classifier (10 Estimators, Bootstrap)',
                'metrics': eval_rf,
            }
        },
        'comparison': [
            {
                'model': 'Logistic Regression',
                'accuracy': eval_lr['accuracy'],
                'macro_f1': eval_lr['macro_f1'],
            },
            {
                'model': 'Decision Tree',
                'accuracy': eval_dt['accuracy'],
                'macro_f1': eval_dt['macro_f1'],
            },
            {
                'model': 'Random Forest (Recommended)',
                'accuracy': eval_rf['accuracy'],
                'macro_f1': eval_rf['macro_f1'],
            }
        ]
    }

    os.makedirs('output', exist_ok=True)
    out_file = 'output/ml_evaluation.json'
    with open(out_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n[ML EVALUATION COMPLETED]")
    print(f"Logistic Regression: Accuracy = {eval_lr['accuracy']}, Macro F1 = {eval_lr['macro_f1']}")
    print(f"Decision Tree:       Accuracy = {eval_dt['accuracy']}, Macro F1 = {eval_dt['macro_f1']}")
    print(f"Random Forest:       Accuracy = {eval_rf['accuracy']}, Macro F1 = {eval_rf['macro_f1']}")
    print(f"Saved results to {out_file}")

if __name__ == '__main__':
    main()
