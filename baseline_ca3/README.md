# BetweenUs — CA3 verified offline analysis (initial baseline)

These scripts analyze the TWO uploaded ZIP datasets. This package **does not modify or deploy your BetweenUs website**. The original ZIP datasets are not redistributed in this output; retain the files you uploaded.

## Run

Install: `pip install pandas numpy scikit-learn matplotlib`

Then:

```bash
python run_pipeline.py --relationship "relationship_patterns_150MB_compressed (5).zip" --nlp "nlp datsets.zip" --out results
```

## Verified on uploaded files

- Relationship: 1,129,814 rows; 564,907 matched P1/P2 interactions; zero malformed, duplicate or incomplete grouped interactions in the processed data.
- Mapper: `(Couple_ID, Interaction_ID)` grouping key, partner's four 1–5 assessment values as the mapped record.
- Simulated shuffle: groups by this composite key.
- Reducer: pairs P1 with P2; computes PGS = mean squared disagreement in Communication, Trust, Support, Conflict_Resolution. The mathematical range is 0–16.
- Mean PGS: 1.5311 in **synthetic data**. Do not infer a real-world population finding.
- This is an **in-memory Python MapReduce simulation**, expressly permitted by the CA3 prompt; **not Hadoop execution**. Memory requirement may be substantial due to grouped records.
- NLP: 211,225 GoEmotions annotation rows; 58,011 unique text IDs; nine categories, up to 1000 clear-label texts per category, 8,989 chosen. Grouping repeated ratings by ID before splitting prevents comment-ID train/test leakage. TF-IDF bi-grams + class-balanced Logistic Regression; 7,191 train / 1,798 test. Accuracy **0.5779**; macro-F1 **0.5831**. This is a measured baseline, not production-ready.

## Critical limitations and additional tasks

1. **A GoEmotions classifier is NOT an insult/bullying/sarcasm/intention detector.** The stress probes are illustration ONLY; without labeled cases, they have no accuracy metric. Never claim to detect *all* hostile messages or trick questions.
2. For a more appropriate **consensual message-feedback** feature, add a separately labeled, opt-in dataset of context/reply pairs. Evaluate insults, teasing, sarcasm, code-mixed slang, ambiguous commands, threats, and neutral speech with held-out annotated ground truth, reporting precision, recall, false-positive rates, and abstentions. Surface language such as 'might sound abrupt', not 'your partner is angry'.
3. The 1 GB target was not met by the uploaded relationship CSV: uncompressed size is about 150 MiB. This isn't a required CA3 minimum. Do not exaggerate it.
4. CA3 rubric specifically requires a **public-source dataset**. GoEmotions meets that as a supplementary public dataset; the main 150 MiB relationship dataset is synthetic. Show tangible NLP analysis results in the CA3 report and credit its source: Google Research GoEmotions, Demszky et al., ACL 2020, https://github.com/google-research/google-research/tree/master/goemotions .
5. A meaningful structured prediction model is *not yet trained*. Avoid predicting PGS from the same dimensions defining PGS (target leakage). A separate outcome or future temporal target is required.
6. Outputs from this package are **not yet connected to the website's backend**. Never show real-time chat as using this model until a real API/inference integration is completed and tested.
7. If the demo audience sends abusive messages or bait questions, provide **optional, private, sender-side feedback** with an uncertainty fallback and manual control. Do not auto-block, auto-send responses, label people, or expose private chats to a public audience.

## Output files

- `results/relationship_summary.json`: paired counts, mean PGS, grouped summaries and execution-mode disclosure.
- `results/pgs_by_interaction_type.csv`: real computed group averages from synthetic records.
- `results/pgs_chart.png`: chart.
- `results/nlp_metrics.json` and `results/nlp_classification_report.txt`: measured NLP baseline.
- `results/nlp_stress_probes.csv`: unvalidated hard cases (not accuracy testing).
- `results/structured_ml_warning.txt`: leakage warning.

## Useful viva response

'We use a Python MapReduce simulation because CA3 explicitly allows simulation. Our mapper emits couple/interactions as keys, shuffle groups records by key, and reducer matches the two partner assessments to compute their average squared difference (PGS, range 0–16). We validated 564,907 paired interactions from 1,129,814 synthetic records. Separately, our public GoEmotions text dataset trains a nine-category TF-IDF/Logistic Regression NLP baseline. The held-out accuracy was 57.79% and macro-F1 was 58.31%. Emotion labels do not prove a partner’s intention or predict harassment reliably; we report that limitation and treat wording feedback as optional and uncertain.'
