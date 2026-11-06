# BetweenUs — An Intelligent Communication and Relationship Analytics Platform

**Subtitle:** An Intelligent Communication and Relationship Analytics Platform  
**Academic Context:** Five-Member MCA Artificial Intelligence and Machine Learning Project for Big Data Analytics  

---

## 1. Project Overview

BetweenUs is an intelligent private communication platform built for two connected partners. The platform is founded on a core observational premise:

> **"Two people can interpret the exact same message differently. BetweenUs helps partners communicate naturally, recognize possible wording misunderstandings, and reflect on their differing perspectives."**

Unlike conventional messaging platforms, BetweenUs combines:
1. **Natural Two-Way Text Chat:** Real-time messaging with relational SQLite database persistence.
2. **Restrained Communication Intelligence:** Private sender-first wording reviews (`Review My Message`) and recipient perspective insights (`Understand This Reply`) based on observable linguistic cues—without diagnostic claims.
3. **Reflect Together & Perspective Gap Score (PGS):** Independent 4-dimension assessments (Communication, Trust, Support, Conflict Resolution) with mutual consent gating and divergence quantification.
4. **Big Data Analytics (BDA) Pipeline:** A Lambda Architecture processing synthetic relationship interaction datasets up to 1 GB via Hadoop MapReduce (`mapper.py` and `reducer.py`).
5. **Machine Learning Pipeline:** Multi-class classification models (Logistic Regression, Decision Tree, Random Forest) predicting future perspective discrepancy categories with zero couple leakage.
6. **Dual-Partner Single-Laptop Demonstration Mode:** A split-screen authorized dual-identity environment enabling simultaneous real-time evaluation.

---

## 2. System Architecture

BetweenUs is architected using the **Lambda Architecture**:

```text
                               +-----------------------------+
                               |     Client Application      |
                               | (React 19 + Tailwind CSS)   |
                               +--------------+--------------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
                   v                                                     v
        +----------------------+                              +----------------------+
        |     Speed Layer      |                              |     Batch Layer      |
        |----------------------|                              |----------------------|
        | - Express API        |                              | - 1 GB Synthetic CSV |
        | - SQLite (WAL mode)  |                              | - Hadoop HDFS        |
        | - Instant PGS Engine |                              | - Hadoop MapReduce   |
        | - Real-time polling  |                              | - Feature Generator  |
        +----------+-----------+                              +----------+-----------+
                   |                                                     |
                   +--------------------------+--------------------------+
                                              |
                                              v
                                   +---------------------+
                                   |    Serving Layer    |
                                   |---------------------|
                                   | - Unified Analytics |
                                   | - ML Inference API  |
                                   | - Snapshot Queries  |
                                   +---------------------+
```

---

## 3. Mathematical Foundations

### Perspective Gap Score (PGS)
For any paired interaction evaluated independently across 4 dimensions:

$$\text{PGS} = \frac{1}{4} \sum_{i=1}^{4} (A_i - B_i)^2 = \frac{(A_{\text{comm}} - B_{\text{comm}})^2 + (A_{\text{trust}} - B_{\text{trust}})^2 + (A_{\text{supp}} - B_{\text{supp}})^2 + (A_{\text{conf}} - B_{\text{conf}})^2}{4}$$

- **Range:** $0.00 \le \text{PGS} \le 16.00$
- **Interpretation:** $\text{PGS} = 0$ indicates identical submitted ratings; larger values denote greater perceptual divergence.

---

## 4. Directory Structure

```text
BetweenUs/
├── hadoop/                   # Big Data Hadoop MapReduce streaming scripts
│   ├── mapper.py             # Emits <couple_id>\t<interaction_id>|<partner>|<ratings>
│   ├── reducer.py            # Joins partner records and computes PGS aggregates
│   ├── validate_dataset.py   # Chunked validator for datasets up to 1 GB
│   ├── prepare_dataset.py    # Synthetic dataset generator & normalizer
│   └── run_hadoop.sh         # Cluster execution & local pipe runner
├── ml/                       # Machine Learning discrepancy modeling
│   ├── models.py             # Logistic Regression, Decision Tree, Random Forest
│   ├── train_models.py       # Couple-stratified train/test evaluator
│   └── predict.py            # Serving layer inference CLI/callable
├── server/                   # Backend database engine
│   └── db.ts                 # SQLite relational schema, constraints, and indexes
├── src/                      # Frontend Vite + React application
│   ├── components/           # Navbar, modals, layout primitives
│   ├── services/             # Client API service
│   ├── utils/                # Pure logic: pgs.ts, communicationIntelligence.ts
│   └── views/                # Product pages (Chat, Reflections, Insights, etc.)
├── docs/                     # Academic deliverables, architecture, viva Q&A
├── data/                     # Validated benchmark datasets
├── server.ts                 # Full-stack Express entry point mounting Vite
└── package.json              # Dependencies and execution scripts
```

---

## 5. Execution & Running Instructions

### Development Server
```bash
npm install
npm run dev
```
Runs on `http://localhost:3000`.

### Running Unit Tests
```bash
npx --yes tsx --test src/utils/pgs.test.ts src/utils/communicationIntelligence.test.ts
```

### Running Hadoop MapReduce
```bash
# Generate sample interactions
python3 hadoop/prepare_dataset.py data/sample_interactions_1000.csv 50 10

# Execute MapReduce local pipe test
bash hadoop/run_hadoop.sh local data/sample_interactions_1000.csv output/hadoop_results
```

### Running Machine Learning Pipeline
```bash
python3 ml/train_models.py data/sample_interactions_1000.csv
```

---

## 6. Five-Member Team Organization

- **Member 1 (Team Leader):** Overall Architecture, PGS Algorithm, Hadoop Integration, ML Pipeline.
- **Member 2 (Backend Developer):** Express APIs, SQLite Schema, Authentication, Message Persistence.
- **Member 3 (Frontend Developer):** Product Design, Chat Interface, Reflections, Responsive UI.
- **Member 4 (Data Engineering):** 1 GB Dataset Validation, Chunked Preprocessing, MapReduce Scripts.
- **Member 5 (QA & Testing):** Automated Unit Testing, Security Edge Cases, Viva Documentation.
