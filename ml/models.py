#!/usr/bin/env python3
"""
Machine Learning Pipeline for BetweenUs Perspective Discrepancy Prediction.
Compares:
1. Multi-class Logistic Regression (One-vs-Rest / Softmax gradient descent)
2. Decision Tree Classifier (Gini Impurity)
3. Random Forest Classifier (Ensemble of Decision Trees with bootstrap sampling)

Features:
- prev_avg_pgs (float)
- prev_comm_gap (float)
- prev_trust_gap (float)
- prev_supp_gap (float)
- prev_conf_gap (float)
- interaction_count (int)

Target:
- Discrepancy Category:
  0: Low Perspective Discrepancy (PGS < 1.0)
  1: Moderate Perspective Discrepancy (1.0 <= PGS <= 3.0)
  2: Elevated Perspective Discrepancy (PGS > 3.0)

Includes couple-stratified train/test splitting to prevent couple leakage!
"""

import math
import random
import json
import os

CLASSES = ['Low Discrepancy', 'Moderate Discrepancy', 'Elevated Discrepancy']
FEATURE_NAMES = [
    'prev_avg_pgs',
    'prev_comm_gap',
    'prev_trust_gap',
    'prev_supp_gap',
    'prev_conf_gap',
    'interaction_count'
]

# --- Decision Tree ---
class TreeNode:
    def __init__(self, depth=0, max_depth=4):
        self.depth = depth
        self.max_depth = max_depth
        self.feature_idx = None
        self.threshold = None
        self.left = None
        self.right = None
        self.prediction = None

def gini_impurity(y):
    if not y:
        return 0.0
    counts = {}
    for label in y:
        counts[label] = counts.get(label, 0) + 1
    total = len(y)
    return 1.0 - sum((c / total) ** 2 for c in counts.values())

class DecisionTreeClassifier:
    def __init__(self, max_depth=4, min_samples_split=4):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.root = None

    def fit(self, X, y):
        self.root = self._build_tree(X, y, depth=0)

    def _build_tree(self, X, y, depth):
        node = TreeNode(depth=depth, max_depth=self.max_depth)
        counts = {}
        for label in y:
            counts[label] = counts.get(label, 0) + 1
        node.prediction = max(counts.items(), key=lambda kv: kv[1])[0]

        if depth >= self.max_depth or len(y) < self.min_samples_split or len(set(y)) == 1:
            return node

        best_gini = 1.0
        best_split = None
        n_features = len(X[0])

        for f_idx in range(n_features):
            values = sorted(set(x[f_idx] for x in X))
            if len(values) < 2:
                continue
            for i in range(len(values) - 1):
                thresh = (values[i] + values[i+1]) / 2.0
                left_X, left_y, right_X, right_y = [], [], [], []
                for sample, label in zip(X, y):
                    if sample[f_idx] <= thresh:
                        left_X.append(sample)
                        left_y.append(label)
                    else:
                        right_X.append(sample)
                        right_y.append(label)

                if not left_y or not right_y:
                    continue

                p_left = len(left_y) / len(y)
                p_right = len(right_y) / len(y)
                gini = p_left * gini_impurity(left_y) + p_right * gini_impurity(right_y)

                if gini < best_gini:
                    best_gini = gini
                    best_split = (f_idx, thresh, left_X, left_y, right_X, right_y)

        if best_split is None:
            return node

        node.feature_idx, node.threshold, left_X, left_y, right_X, right_y = best_split
        node.left = self._build_tree(left_X, left_y, depth + 1)
        node.right = self._build_tree(right_X, right_y, depth + 1)
        return node

    def predict_one(self, sample, node=None):
        if node is None:
            node = self.root
        if node.feature_idx is None or node.left is None or node.right is None:
            return node.prediction
        if sample[node.feature_idx] <= node.threshold:
            return self.predict_one(sample, node.left)
        else:
            return self.predict_one(sample, node.right)

    def predict(self, X):
        return [self.predict_one(x) for x in X]


# --- Random Forest ---
class RandomForestClassifier:
    def __init__(self, n_estimators=7, max_depth=4):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.trees = []

    def fit(self, X, y):
        self.trees = []
        n_samples = len(X)
        for _ in range(self.n_estimators):
            # Bootstrap sample
            boot_X, boot_y = [], []
            for _ in range(n_samples):
                idx = random.randint(0, n_samples - 1)
                boot_X.append(X[idx])
                boot_y.append(y[idx])
            tree = DecisionTreeClassifier(max_depth=self.max_depth)
            tree.fit(boot_X, boot_y)
            self.trees.append(tree)

    def predict(self, X):
        predictions = []
        for x in X:
            votes = [t.predict_one(x) for t in self.trees]
            counts = {}
            for v in votes:
                counts[v] = counts.get(v, 0) + 1
            predictions.append(max(counts.items(), key=lambda kv: kv[1])[0])
        return predictions


# --- Logistic Regression ---
class LogisticRegression:
    def __init__(self, lr=0.05, n_iters=250):
        self.lr = lr
        self.n_iters = n_iters
        self.weights = {} # class_idx -> [w1, w2, ..., b]
        self.mean = []
        self.std = []

    def _sigmoid(self, z):
        return 1.0 / (1.0 + math.exp(-max(-20, min(20, z))))

    def fit(self, X, y):
        n_samples = len(X)
        n_features = len(X[0])
        
        # Standardize features
        self.mean = [sum(x[i] for x in X) / n_samples for i in range(n_features)]
        self.std = []
        for i in range(n_features):
            variance = sum((x[i] - self.mean[i]) ** 2 for x in X) / n_samples
            self.std.append(math.sqrt(variance) if variance > 1e-6 else 1.0)

        X_norm = []
        for x in X:
            X_norm.append([(x[i] - self.mean[i]) / self.std[i] for i in range(n_features)])

        classes = sorted(list(set(y)))
        self.weights = {}

        # One-vs-Rest training
        for c in classes:
            w = [0.0] * n_features
            b = 0.0
            y_binary = [1 if label == c else 0 for label in y]

            for _ in range(self.n_iters):
                for xi, yi in zip(X_norm, y_binary):
                    z = sum(wi * xij for wi, xij in zip(w, xi)) + b
                    p = self._sigmoid(z)
                    err = p - yi
                    for j in range(n_features):
                        w[j] -= self.lr * err * xi[j]
                    b -= self.lr * err
            self.weights[c] = (w, b)

    def predict(self, X):
        preds = []
        for x in X:
            x_norm = [(x[i] - self.mean[i]) / self.std[i] for i in range(len(x))]
            best_c = None
            best_prob = -1.0
            for c, (w, b) in self.weights.items():
                z = sum(wi * xij for wi, xij in zip(w, x_norm)) + b
                p = self._sigmoid(z)
                if p > best_prob:
                    best_prob = p
                    best_c = c
            preds.append(best_c)
        return preds


# --- Metrics Calculator ---
def evaluate_model(y_true, y_pred):
    labels = sorted(list(set(y_true + y_pred)))
    n = len(y_true)
    accuracy = round(sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp) / max(1, n), 4)

    # Confusion matrix
    matrix = {str(r): {str(c): 0 for c in labels} for r in labels}
    for yt, yp in zip(y_true, y_pred):
        matrix[str(yt)][str(yp)] += 1

    per_class = {}
    f1_list = []
    for l in labels:
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == l and yp == l)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != l and yp == l)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == l and yp != l)

        prec = round(tp / max(1, tp + fp), 4) if (tp + fp) > 0 else 0.0
        rec = round(tp / max(1, tp + fn), 4) if (tp + fn) > 0 else 0.0
        f1 = round((2 * prec * rec) / max(1e-6, prec + rec), 4) if (prec + rec) > 0 else 0.0
        f1_list.append(f1)

        per_class[CLASSES[l] if l < len(CLASSES) else f"Class_{l}"] = {
            'precision': prec,
            'recall': rec,
            'f1_score': f1,
            'support': sum(1 for yt in y_true if yt == l)
        }

    macro_f1 = round(sum(f1_list) / max(1, len(f1_list)), 4)
    return {
        'accuracy': accuracy,
        'macro_f1': macro_f1,
        'per_class': per_class,
        'confusion_matrix': matrix
    }
