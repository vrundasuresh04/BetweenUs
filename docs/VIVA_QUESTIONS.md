# BetweenUs — MCA AIML Project Viva Voce Preparation

### Question 1: What is the primary problem BetweenUs addresses?
**Answer:** BetweenUs addresses communication misunderstandings between two connected partners. It operates on the principle that two individuals can interpret the exact same message differently. It provides private messaging, optional wording clarity feedback, and independent reflection assessments to quantify perspective divergence without claiming to diagnose relationship health or read emotional intentions.

### Question 2: What is the Perspective Gap Score (PGS) and how is it derived?
**Answer:** PGS measures perceptual discrepancy across four dimensions (Communication, Trust, Support, Conflict Resolution):
$$\text{PGS} = \frac{1}{4} \left[ (A_{\text{comm}} - B_{\text{comm}})^2 + (A_{\text{trust}} - B_{\text{trust}})^2 + (A_{\text{supp}} - B_{\text{supp}})^2 + (A_{\text{conf}} - B_{\text{conf}})^2 \right]$$
Scores range from 0 to 16. A score of 0 indicates complete rating alignment. Higher scores indicate where perspectives diverged most.

### Question 3: How does the Lambda Architecture function in this system?
**Answer:** 
- **Speed Layer:** Express and SQLite in WAL mode for low-latency live messaging, instant message feedback, and immediate reflection score computation.
- **Batch Layer:** Ingests the 1 GB synthetic relationship interaction dataset into HDFS and uses Hadoop MapReduce (`mapper.py` and `reducer.py`) to join partner pairs and compute long-term historical aggregates.
- **Serving Layer:** Unified REST APIs providing analytics snapshots and ML inference without cross-couple data leakage.

### Question 4: How is data leakage prevented in the Machine Learning pipeline?
**Answer:** Couple-stratified train-test splitting is enforced. Entire couple histories are assigned strictly to either the training set (80%) or the test set (20%). No couple ID appears in both partitions. Additionally, target leakage is avoided by predicting current interaction discrepancy using only prior historical interactions.

### Question 5: Why is Communication Intelligence rule-based rather than an ungrounded LLM?
**Answer:** To guarantee predictable, restrained, non-judgmental feedback that does not hallucinate emotional diagnoses, does not label either partner "toxic", and operates deterministically and privately without transmitting confidential relationship discussions to third-party cloud APIs.
