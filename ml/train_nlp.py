#!/usr/bin/env python3
"""
BetweenUs Reproducible GoEmotions NLP Model Trainer.
Trains a 9-class Emotion Classifier using the authentic GoEmotions CSV dataset.
Pure Python standard library implementation with zero external dependencies.
Extracts unigram/bigram TF-IDF features and trains One-vs-Rest Logistic Regression with balanced class weights.
Exports model artifact (vocabulary, IDF, coefficients, biases, evaluation metrics) for real-time serving.
"""

import sys
import os
import re
import math
import json
import csv
import io
import time
import random
import zipfile
from collections import defaultdict, Counter

LABELS = [
    'anger',
    'annoyance',
    'disapproval',
    'disgust',
    'gratitude',
    'joy',
    'love',
    'sadness',
    'neutral'
]

PROBES = [
    'You are such an idiot.',
    'That was really helpful, thanks!',
    'Sure, whatever you say.',
    'I am proud of you.',
    'Stop messaging me.',
    'Yeah right, brilliant idea genius.',
    'You always ruin everything.',
    'Haha you idiot, I missed you!',
    'Could you please explain that again?',
    'I am upset about what happened.'
]

def tokenize(text):
    words = re.findall(r"\b[a-zA-Z0-9']+\b", text.lower())
    unigrams = words
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    return unigrams + bigrams

def load_and_preprocess_dataset(data_path):
    grouped_scores = defaultdict(lambda: [0.0] * len(LABELS))
    grouped_counts = defaultdict(int)
    grouped_text = {}
    raw_rows = 0

    if os.path.isdir(data_path):
        print(f"[1/5] Reading extracted GoEmotions CSV files from directory: {data_path}...")
        csv_files = sorted([os.path.join(data_path, f) for f in os.listdir(data_path) if f.lower().endswith('.csv')])
        if not csv_files:
            raise ValueError(f"No CSV files found in directory {data_path}")
        for csv_file in csv_files:
            print(f"      Processing {os.path.basename(csv_file)}...")
            with open(csv_file, 'r', encoding='utf-8', errors='replace') as fp:
                reader = csv.reader(fp)
                header = next(reader)
                id_idx = header.index('id')
                text_idx = header.index('text')
                label_indices = [header.index(l) for l in LABELS]
                for row in reader:
                    if len(row) <= max(label_indices):
                        continue
                    raw_rows += 1
                    cid = row[id_idx]
                    if cid not in grouped_text:
                        grouped_text[cid] = row[text_idx]
                    scores = grouped_scores[cid]
                    for idx, lidx in enumerate(label_indices):
                        scores[idx] += float(row[lidx])
                    grouped_counts[cid] += 1
    else:
        print(f"[1/5] Reading GoEmotions dataset from ZIP archive: {data_path}...")
        z = zipfile.ZipFile(data_path)
        csv_names = [n for n in sorted(z.namelist()) if n.lower().endswith('.csv')]
        if not csv_names:
            raise ValueError("No CSV files found in dataset archive")
        for n in csv_names:
            print(f"      Processing {n}...")
            with z.open(n) as fp:
                reader = csv.reader(io.TextIOWrapper(fp, encoding='utf-8', errors='replace'))
                header = next(reader)
                id_idx = header.index('id')
                text_idx = header.index('text')
                label_indices = [header.index(l) for l in LABELS]
                for row in reader:
                    if len(row) <= max(label_indices):
                        continue
                    raw_rows += 1
                    cid = row[id_idx]
                    if cid not in grouped_text:
                        grouped_text[cid] = row[text_idx]
                    scores = grouped_scores[cid]
                    for idx, lidx in enumerate(label_indices):
                        scores[idx] += float(row[lidx])
                    grouped_counts[cid] += 1
                cid = row[id_idx]
                if cid not in grouped_text:
                    grouped_text[cid] = row[text_idx]
                scores = grouped_scores[cid]
                for idx, lidx in enumerate(label_indices):
                    scores[idx] += float(row[lidx])
                grouped_counts[cid] += 1

    print(f"      Loaded {raw_rows} raw annotation rows across {len(grouped_text)} unique comment IDs.")

    # Group by label: keep comments where single top vote > second-highest vote and > 0
    by_label = defaultdict(list)
    for cid, total_scores in grouped_scores.items():
        text = grouped_text[cid]
        if not text or not text.strip():
            continue
        c = grouped_counts[cid]
        mean_scores = [s / c for s in total_scores]
        sorted_s = sorted(mean_scores)
        if sorted_s[-1] > sorted_s[-2] and sorted_s[-1] > 0:
            top_idx = mean_scores.index(sorted_s[-1])
            by_label[LABELS[top_idx]].append({'id': cid, 'text': text, 'label': LABELS[top_idx]})

    # Balance classes (capped at 1,000 per class with random_state=42)
    chosen = []
    for l in LABELS:
        items = by_label[l]
        rng = random.Random(42)
        sample = rng.sample(items, min(1000, len(items))) if len(items) >= 1000 else items
        chosen.extend(sample)

    print(f"      Filtered {len(chosen)} unique, single-dominant labeled comments across 9 classes.")

    # Stratified 80/20 train/test split with random_state=42
    by_chosen_label = defaultdict(list)
    for item in chosen:
        by_chosen_label[item['label']].append(item)

    train_set, test_set = [], []
    for l in LABELS:
        items = by_chosen_label[l]
        rng = random.Random(42)
        items_shuffled = list(items)
        rng.shuffle(items_shuffled)
        split = int(len(items_shuffled) * 0.8)
        train_set.extend(items_shuffled[:split])
        test_set.extend(items_shuffled[split:])

    # Shuffle train and test
    rng_train = random.Random(42)
    rng_train.shuffle(train_set)
    rng_test = random.Random(42)
    rng_test.shuffle(test_set)

    print(f"      Train set: {len(train_set)} samples. Test set: {len(test_set)} samples.")
    return raw_rows, len(grouped_text), chosen, train_set, test_set

def build_vectorizer(train_texts, min_df=2, max_features=18000):
    print(f"[2/5] Building TF-IDF Vocabulary (min_df={min_df}, max_features={max_features})...")
    df = Counter()
    doc_tokens = []
    for t in train_texts:
        tokens = tokenize(t)
        doc_tokens.append(tokens)
        unique_tokens = set(tokens)
        for tok in unique_tokens:
            df[tok] += 1

    # Filter by min_df and sort by document frequency (descending)
    filtered = [(tok, count) for tok, count in df.items() if count >= min_df]
    filtered.sort(key=lambda x: x[1], reverse=True)
    if len(filtered) > max_features:
        filtered = filtered[:max_features]

    vocab = {tok: idx for idx, (tok, _) in enumerate(filtered)}
    n_docs = len(train_texts)

    # Scikit-learn formula: idf = ln((1 + n_docs) / (1 + df)) + 1
    idf = [math.log((1.0 + n_docs) / (1.0 + df[tok])) + 1.0 for tok, _ in filtered]

    print(f"      Vocabulary size: {len(vocab)} unigram/bigram features.")
    return vocab, idf

def transform_to_tfidf(texts, vocab, idf):
    vectors = []
    for text in texts:
        tokens = tokenize(text)
        tf = Counter(tok for tok in tokens if tok in vocab)
        if not tf:
            vectors.append({})
            continue

        raw = {vocab[tok]: count * idf[vocab[tok]] for tok, count in tf.items()}
        # L2 norm
        norm = math.sqrt(sum(v * v for v in raw.values()))
        if norm > 1e-9:
            vectors.append({k: v / norm for k, v in raw.items()})
        else:
            vectors.append({})
    return vectors

def train_classifier(X_train, y_train, vocab_size, labels, epochs=35, lr=0.45, reg=1e-5):
    print(f"[3/5] Training 9-class One-vs-Rest Logistic Regression (epochs={epochs}, lr={lr})...")
    label_to_idx = {l: i for i, l in enumerate(labels)}
    n_classes = len(labels)
    n_samples = len(X_train)

    # Calculate balanced class weights: n_samples / (n_classes * class_count)
    counts = Counter(y_train)
    class_weights = [n_samples / (n_classes * max(1, counts[l])) for l in labels]

    weights = {l: [0.0] * vocab_size for l in labels}
    biases = {l: 0.0 for l in labels}

    start_time = time.time()
    rng = random.Random(42)
    indices = list(range(n_samples))

    for epoch in range(epochs):
        rng.shuffle(indices)
        decayed_lr = lr / (1.0 + 0.04 * epoch)

        for idx in indices:
            x_dict = X_train[idx]
            y_label = y_train[idx]

            for c_idx, l in enumerate(labels):
                target = 1.0 if l == y_label else 0.0
                cw = class_weights[c_idx]
                w_vec = weights[l]

                # Dot product
                z = biases[l] + sum(w_vec[feat] * val for feat, val in x_dict.items())
                # Sigmoid with clipping
                z = max(-18.0, min(18.0, z))
                p = 1.0 / (1.0 + math.exp(-z))
                err = (p - target) * cw

                # Gradient step with L2 regularisation
                for feat, val in x_dict.items():
                    w_vec[feat] -= decayed_lr * (err * val + reg * w_vec[feat])
                biases[l] -= decayed_lr * err

    elapsed = time.time() - start_time
    print(f"      Training completed in {elapsed:.2f} seconds.")
    return weights, biases

def predict_probabilities(x_dict, weights, biases, labels):
    # One-vs-rest logits converted to normalised probabilities via softmax
    logits = []
    for l in labels:
        w_vec = weights[l]
        z = biases[l] + sum(w_vec[feat] * val for feat, val in x_dict.items())
        logits.append(max(-20.0, min(20.0, z)))

    max_z = max(logits)
    exp_z = [math.exp(z - max_z) for z in logits]
    total_exp = sum(exp_z)
    probs = [ez / total_exp for ez in exp_z]
    return {l: round(p, 4) for l, p in zip(labels, probs)}

def evaluate(X_test, y_test, weights, biases, labels):
    print("[4/5] Evaluating model on held-out test split (1,798 samples)...")
    preds = []
    for x_dict in X_test:
        probs = predict_probabilities(x_dict, weights, biases, labels)
        pred_label = max(probs.items(), key=lambda kv: kv[1])[0]
        preds.append(pred_label)

    # Accuracy
    total = len(y_test)
    correct = sum(1 for yt, yp in zip(y_test, preds) if yt == yp)
    accuracy = round(correct / total, 4)

    # Confusion matrix & Per-class Precision, Recall, F1
    matrix = {row: {col: 0 for col in labels} for row in labels}
    for yt, yp in zip(y_test, preds):
        matrix[yt][yp] += 1

    per_class = {}
    f1_list = []
    for l in labels:
        tp = matrix[l][l]
        fp = sum(matrix[other][l] for other in labels if other != l)
        fn = sum(matrix[l][other] for other in labels if other != l)
        support = sum(matrix[l].values())

        prec = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
        rec = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
        f1 = round((2 * prec * rec) / (prec + rec), 4) if (prec + rec) > 0 else 0.0
        f1_list.append(f1)

        per_class[l] = {
            'precision': prec,
            'recall': rec,
            'f1_score': f1,
            'support': support
        }

    macro_f1 = round(sum(f1_list) / len(f1_list), 4)
    print(f"      Accuracy: {accuracy * 100:.2f}% | Macro F1: {macro_f1:.4f}")
    return accuracy, macro_f1, per_class, matrix

def format_classification_report(per_class, accuracy, macro_f1, labels):
    lines = []
    lines.append(f"{'':>15}  {'precision':>10}  {'recall':>10}  {'f1-score':>10}  {'support':>10}")
    lines.append("-" * 65)
    total_support = 0
    for l in labels:
        metrics = per_class[l]
        total_support += metrics['support']
        lines.append(f"{l:>15}  {metrics['precision']:>10.2f}  {metrics['recall']:>10.2f}  {metrics['f1_score']:>10.2f}  {metrics['support']:>10}")
    lines.append("-" * 65)
    lines.append(f"{'accuracy':>15}  {'':>10}  {'':>10}  {accuracy:>10.2f}  {total_support:>10}")
    lines.append(f"{'macro avg':>15}  {sum(m['precision'] for m in per_class.values())/len(labels):>10.2f}  {sum(m['recall'] for m in per_class.values())/len(labels):>10.2f}  {macro_f1:>10.2f}  {total_support:>10}")
    return "\n".join(lines) + "\n"

def main():
    extracted_dir = 'data/goemotions'
    zip_path = 'public/assets/aistudio/nlp_datsets_b35d8d4c.zip'
    out_dir = 'results'
    os.makedirs(out_dir, exist_ok=True)

    if os.path.exists(os.path.join(extracted_dir, 'goemotions_1.csv')):
        data_source = extracted_dir
    elif os.path.exists(zip_path):
        data_source = zip_path
    else:
        print(f"Error: Neither extracted directory {extracted_dir} nor archive {zip_path} found.")
        sys.exit(1)

    raw_rows, unique_ids, chosen, train_set, test_set = load_and_preprocess_dataset(data_source)

    train_texts = [item['text'] for item in train_set]
    y_train = [item['label'] for item in train_set]
    test_texts = [item['text'] for item in test_set]
    y_test = [item['label'] for item in test_set]

    # Vectorize
    vocab, idf = build_vectorizer(train_texts, min_df=2, max_features=18000)
    X_train = transform_to_tfidf(train_texts, vocab, idf)
    X_test = transform_to_tfidf(test_texts, vocab, idf)

    # Train
    weights, biases = train_classifier(X_train, y_train, len(vocab), LABELS, epochs=35, lr=0.45)

    # Evaluate
    accuracy, macro_f1, per_class, confusion = evaluate(X_test, y_test, weights, biases, LABELS)

    # Evaluate stress test probes
    print("[5/5] Scoring reference stress probes...")
    probe_results = []
    for p in PROBES:
        p_vec = transform_to_tfidf([p], vocab, idf)[0]
        probs = predict_probabilities(p_vec, weights, biases, LABELS)
        best_label = max(probs.items(), key=lambda kv: kv[1])[0]
        confidence = probs[best_label]
        probe_results.append({
            'text': p,
            'predicted_goemotions_label': best_label,
            'model_probability': confidence,
            'probabilities': probs,
            'note': 'Unvalidated stress-test example: not a bullying/sarcasm detection result'
        })

    # Save artifacts
    metrics_data = {
        'raw_annotation_rows': raw_rows,
        'unique_comment_ids': unique_ids,
        'filtered_labeled_comments': len(chosen),
        'train': len(train_set),
        'test': len(test_set),
        'evaluated_labels': LABELS,
        'model': 'TF-IDF (1-2 grams) + LogisticRegression, 9-class subset (Reproducible Pure-Python SGD)',
        'accuracy': accuracy,
        'macro_f1': macro_f1,
        'status': 'Trained & Operational Experimental Baseline',
        'public_source_credit': 'Google Research GoEmotions, Demszky et al., ACL 2020',
        'limitations': 'Emotions in Reddit comments, not relationship intent, toxicity, sarcasm, partner perception, or real-world risk. A GoEmotions classifier is NOT an insult/bullying/sarcasm/intention detector. Stress probes are illustration only.'
    }

    with open(os.path.join(out_dir, 'nlp_metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(metrics_data, f, indent=2)

    report_str = format_classification_report(per_class, accuracy, macro_f1, LABELS)
    with open(os.path.join(out_dir, 'nlp_classification_report.txt'), 'w', encoding='utf-8') as f:
        f.write(report_str)

    # Save stress probes CSV
    with open(os.path.join(out_dir, 'nlp_stress_probes.csv'), 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'predicted_goemotions_label', 'model_probability', 'note'])
        for pr in probe_results:
            writer.writerow([f'"{pr["text"]}"', pr['predicted_goemotions_label'], pr['model_probability'], pr['note']])

    # Compact export of model artifact for runtime serving
    active_features = set()
    for feat_idx in range(len(vocab)):
        if any(abs(weights[l][feat_idx]) > 0.05 for l in LABELS):
            active_features.add(feat_idx)

    old_to_new = {}
    new_vocab = {}
    new_idf = []
    inv_vocab = {idx: tok for tok, idx in vocab.items()}

    for old_idx in sorted(active_features):
        tok = inv_vocab[old_idx]
        new_idx = len(new_vocab)
        old_to_new[old_idx] = new_idx
        new_vocab[tok] = new_idx
        new_idf.append(round(idf[old_idx], 4))

    pruned_weights = {
        l: [round(weights[l][old_idx], 4) for old_idx in sorted(active_features)]
        for l in LABELS
    }
    rounded_biases = {l: round(biases[l], 4) for l in LABELS}

    model_artifact = {
        'version': '1.0.0',
        'architecture': 'Tfidf_LogisticRegression_9class',
        'labels': LABELS,
        'label_mapping': {label: idx for idx, label in enumerate(LABELS)},
        'inverse_label_mapping': {idx: label for idx, label in enumerate(LABELS)},
        'vocabulary': new_vocab,
        'vocabulary_size': len(new_vocab),
        'idf': new_idf,
        'weights': pruned_weights,
        'biases': rounded_biases,
        'metrics': {
            'accuracy': accuracy,
            'macro_f1': macro_f1,
            'per_class': per_class
        },
        'stress_probes': [
            {'text': pr['text'], 'predicted': pr['predicted_goemotions_label'], 'confidence': pr['model_probability']}
            for pr in probe_results
        ]
    }

    artifact_path = os.path.join(out_dir, 'nlp_model_artifact.json')
    with open(artifact_path, 'w', encoding='utf-8') as f:
        json.dump(model_artifact, f, indent=2)

    file_size_kb = os.path.getsize(artifact_path) / 1024
    print(f"\n[SUCCESS] Model artifact successfully saved to {artifact_path} ({file_size_kb:.1f} KB, {len(new_vocab)} active terms).")

if __name__ == '__main__':
    main()
