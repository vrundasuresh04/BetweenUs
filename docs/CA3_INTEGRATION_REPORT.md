# BetweenUs — CA3 Verified Baseline Integration Report

## 1. Package Inspection and Artifact Inventory (Task 1)

The baseline package `BetweenUs_CA3_verified_baseline` was inspected and integrated cleanly as an **offline analytics module** alongside the existing web application.

### Identified Files and Artifacts:
- **`run_pipeline.py`** (located at `baseline_ca3/run_pipeline.py` and `public/assets/aistudio/run_pipeline_671139d1.py`):
  Standalone Python execution script taking `--relationship` and `--nlp` zip files and emitting verified output artifacts into `--out results`.
- **`README.md`** (located at `baseline_ca3/README.md` and `public/assets/aistudio/README_2c85daf8.md`):
  Official baseline documentation with verified metrics, execution instructions, limitations, and viva voce response guide.
- **Dependencies Required by Python Pipeline:**
  `pandas`, `numpy`, `scikit-learn`, `matplotlib`, `python >= 3.8`.
- **Generated Artifacts Ingested:**
  - `results/relationship_summary.json`: 564,907 matched P1/P2 pairs, mean PGS = 1.5311, execution mode disclosure.
  - `results/pgs_by_interaction_type.csv`: Breakdown across 5 interaction types (Conflict Discussion, Financial Planning, Daily Logistics, Emotional Checkin, Leisure Planning).
  - `results/nlp_metrics.json`: GoEmotions 9-class TF-IDF + Logistic Regression evaluation (Accuracy = 0.5779, Macro F1 = 0.5831).
  - `results/nlp_classification_report.txt`: Per-class precision, recall, and F1 metrics for 9 emotion categories.
  - `results/nlp_stress_probes.csv`: 10 unvalidated stress-test example probes explicitly labeled as non-bullying detection results.
  - `results/structured_ml_warning.txt`: Target leakage prevention directive marking structured ML as pending.

---

## 2. Pipeline Mechanics & Output Locations (Task 2)

### A. Relationship MapReduce Pipeline
1. **Input:** CSV containing columns `Communication`, `Trust`, `Support`, `Conflict_Resolution`, `Couple_ID`, `Interaction_ID`, `Partner_ID`, `Interaction_Type`.
2. **Mapper:** Emits `(Couple_ID, Interaction_ID)` as composite key, and partner ratings + interaction metadata as value.
3. **Simulated Shuffle:** Groups records by composite key in memory using a Python dictionary. *(Disclosed as an in-memory simulation, not an executed Hadoop cluster).*
4. **Reducer:** Matches Partner 1 (`P1`) and Partner 2 (`P2`) records for the same interaction; calculates:
   $$\text{PGS} = \frac{(P1_{\text{comm}} - P2_{\text{comm}})^2 + (P1_{\text{trust}} - P2_{\text{trust}})^2 + (P1_{\text{supp}} - P2_{\text{supp}})^2 + (P1_{\text{conf}} - P2_{\text{conf}})^2}{4}$$
   Computes mean PGS ($1.5311$) across $564,907$ complete matched pairs from $1,129,814$ input rows.
5. **Output Storage:** `results/relationship_summary.json` and `results/pgs_by_interaction_type.csv`.

### B. NLP Baseline Pipeline
1. **Input:** Google Research GoEmotions dataset (211,225 annotation rows; 58,011 unique comment IDs) across 9 emotion labels (`anger`, `annoyance`, `disapproval`, `disgust`, `gratitude`, `joy`, `love`, `sadness`, `neutral`).
2. **Preprocessing:** Groups multi-rater annotations by comment `id` *before* train/test splitting to prevent comment-ID data leakage. Caps each class at 1,000 samples ($8,989$ chosen total).
3. **Model:** `TfidfVectorizer(ngram_range=(1,2), max_features=35000)` + `LogisticRegression(class_weight='balanced', max_iter=350)`.
4. **Evaluation:** Held-out test set ($1,798$ comments):
   - **Accuracy:** $0.5779$ ($57.79\%$)
   - **Macro F1:** $0.5831$
5. **Output Storage:** `results/nlp_metrics.json`, `results/nlp_classification_report.txt`, and `results/nlp_stress_probes.csv`.

---

## 3. Perspective Gap Score Integration into Dashboard (Task 3)

The dashboard (`DashboardView.tsx`) and insights view now incorporate the verified synthetic baseline benchmark ($1.53 \text{ Mean PGS}$ across $564,907$ paired interactions) alongside the live couple's actual calculated scores:
- When the live couple has completed mutual reflections, their real calculated PGS is displayed alongside the verified baseline benchmark for contextual reference.
- When no reflections have been completed, the empty state displays: *"No session scores yet. Complete a reflection session together to record genuine perspective data"*, with a note showing the verified baseline benchmark.
- Visual hierarchy and navigation were **100% preserved**.

---

## 4. Architectural Determination: Offline Batch Pipeline vs. Node.js (Task 4)

- **Determination:** The Python analytics pipeline is architected as an **offline batch pipeline**.
- **Rationale:**
  1. The live web application requires sub-second response times for real-time two-way messaging, which runs on Node.js/Express with SQLite WAL mode.
  2. The relationship dataset contains over $1.1$ million rows ($150 \text{ MiB}$), requiring substantial RAM and specialized C-compiled libraries (`numpy`, `pandas`, `scikit-learn`, `matplotlib`).
  3. The Express backend serves as the **Serving Layer**, ingesting and exposing the verified output artifacts via REST APIs (`/api/baseline/*`), while the offline Python scripts remain available for batch execution on cluster or workstation environments.

---

## 5. Truthful Execution & Avoidance of Fabricated Predictions (Tasks 5 & 6)

- The application **does not claim** that the full $150 \text{ MiB}$ / $1.1\text{M}$ row pipeline or GoEmotions training ran inside the live dev container.
- Results are transparently attributed to the verified offline baseline run.
- **Zero fabricated predictions:** Live chat messages are not passed to a fake ML model. Live users get real PGS computed from their own submitted assessments. Pre-send feedback in chat uses transparent, restrained rule-based cue detection.

---

## 6. Experimental NLP Labeling & Limitations (Task 7)

- The GoEmotions model is explicitly labeled **EXPERIMENTAL BASELINE**.
- The following warning is permanently displayed in the UI:
  > *"A GoEmotions classifier is NOT an insult, bullying, sarcasm, or intention detector. The 10 stress probes are illustration ONLY without labeled cases, and have no accuracy metric. Emotion labels from Reddit comments do not prove a partner's intention or emotional state in private communication."*

---

## 7. Structured ML Marked as Pending (Task 8)

- The structured ML component is marked **STATUS: PENDING VALIDATION (Not Trained)**.
- The target leakage warning from `results/structured_ml_warning.txt` is displayed in full:
  > *"No structured ML accuracy reported. A target created from PGS and predicted using its four component differences would be target leakage. Choose an independent outcome (e.g. future Satisfaction_Score) with careful temporal validation before training a meaningful structured model."*

---

## 8. Integration Status: Tested vs. Incomplete (Task 10)

### Verified & Tested:
- [x] Baseline script (`baseline_ca3/run_pipeline.py`) and documentation (`baseline_ca3/README.md`) preserved and accessible.
- [x] Verified baseline results (`results/*.json`, `results/*.csv`, `results/*.txt`) ingested and served via `/api/baseline/*`.
- [x] Dashboard and Insights views connected to verified synthetic baseline benchmark ($1.5311$).
- [x] GoEmotions experimental baseline metrics and 10 stress probes rendered in Project Studio Tab 4.
- [x] Target leakage directive displayed; structured ML marked pending.
- [x] Existing registration, login, two-way messaging, partner linking, reflections, dual demo mode, and visual styling intact.
- [x] Automated unit tests (7/7 passed), `tsc --noEmit` (0 errors), `vite build` (clean compilation).

### Incomplete / External Dependencies:
- The full 150 MiB ZIP file (`relationship_patterns_150MB_compressed (5).zip`) and GoEmotions raw ZIP (`nlp datsets.zip`) are external datasets not checked into the Git repository to preserve bundle size; the pipeline runs offline using the standalone `run_pipeline.py` script on any machine with `pandas`, `scikit-learn`, and `matplotlib` installed.
- Real-time sarcasm/threat detection: As noted in the CA3 baseline, a GoEmotions model cannot reliably detect insults or sarcasm; this remains an open research task requiring a dedicated, labeled couples-communication dataset.
