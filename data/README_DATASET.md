# BetweenUs — Offline Relationship Analytics Dataset Specification

This directory houses the offline relationship interaction datasets used for Big Data Analytics, Hadoop MapReduce batch processing, and machine learning feature extraction in BetweenUs.

---

## 1. Storage & Confidentiality Rules (Rule 6)

1. **Strictly Offline Analytics Input**: All dataset files in this directory (`data/`) are offline inputs for backend batch processing and Hadoop Streaming jobs.
2. **Never Exposed to Frontend**: Dataset files in `data/` must **never** be copied into `public/`, `src/assets/`, or client-accessible bundle paths.
3. **No Browser Ingestion**: The 150 MB dataset must not be fetched or loaded directly in client browsers.

---

## 2. Dataset Schema (18-Column & 8-Column Supported)

The updated `hadoop/mapper.py` reads column headers dynamically and supports:

### Standard 18-Column Schema:
| Column # | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| 1 | `Couple_ID` | String | Unique couple identifier (e.g., `CPL-0001`) |
| 2 | `Interaction_ID` | String | Unique interaction identifier (e.g., `INT-0001-001`) |
| 3 | `Partner_ID` | String | Individual partner identifier (`P1`, `P2`, or UUID) |
| 4 | `Interaction_Type` | String | Category (`Conflict_Discussion`, `Financial_Planning`, `Daily_Logistics`, `Emotional_Checkin`, `Leisure_Planning`) |
| 5 | `Timestamp` | ISO String | Event timestamp (UTC) |
| 6 | `Communication` | Float [1.0–5.0] | Self-assessed communication clarity rating |
| 7 | `Trust` | Float [1.0–5.0] | Perceived mutual trust rating |
| 8 | `Support` | Float [1.0–5.0] | Feeling of partner emotional support rating |
| 9 | `Conflict_Resolution` | Float [1.0–5.0] | Constructive conflict management rating |
| 10 | `Empathy_Score` | Float | Measured empathetic response score |
| 11 | `Listening_Score` | Float | Active listening index |
| 12 | `Tone_Index` | Float | Tone positivity/openness rating |
| 13 | `Message_Length_Avg`| Integer | Word count of interaction exchanges |
| 14 | `Response_Delay_Sec`| Float | Turn-taking response latency in seconds |
| 15 | `Sentiment_Score` | Float | Polarity index (-1.0 to 1.0) |
| 16 | `Attachment_Style`| String | Secure, Anxious, Avoidant, or Fearful |
| 17 | `Stress_Level` | Float [1.0–10.0]| Ambient stress indicator |
| 18 | `Satisfaction_Score`| Float [1.0–10.0]| Post-interaction satisfaction |

### Baseline 8-Column Schema:
`interaction_id, couple_id, partner_id, communication, trust, support, conflict_resolution, timestamp`

---

## 3. Perspective Gap Score (PGS) Mathematical Definition

For paired partner assessments ($P1$ and $P2$) on interaction $i$:

$$\text{PGS}_i = \frac{1}{4} \left[ (P1_{\text{comm}} - P2_{\text{comm}})^2 + (P1_{\text{trust}} - P2_{\text{trust}})^2 + (P1_{\text{supp}} - P2_{\text{supp}})^2 + (P1_{\text{conf}} - P2_{\text{conf}})^2 \right]$$

- **Range**: $0.0$ (complete consensus) to $16.0$ (maximum divergence, e.g. rating $1$ vs rating $5$ across all four dimensions).
- **Verified Benchmark**: $1.5311$ across $564,907$ matched interaction pairs in the original synthetic dataset.

---

## 4. Ingesting the 150 MB Dataset

When copying the original 150 MB dataset into this environment:
1. Place the uncompressed CSV at:
   `data/relationship_patterns_150MB.csv`
2. Execute the Hadoop / MapReduce runner:
   ```bash
   bash hadoop/run_hadoop.sh data/relationship_patterns_150MB.csv output/hadoop_results
   ```
