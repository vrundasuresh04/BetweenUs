# Apache Hadoop Cluster Execution Guide for BetweenUs

This guide provides instructions for deploying and running the BetweenUs Big Data Analytics MapReduce pipeline on an actual Apache Hadoop cluster (version 3.2.x or 3.3.x).

---

## 1. Prerequisites on Hadoop Cluster Nodes

1. **Java Runtime**: OpenJDK 8 or 11 installed (`java -version`).
2. **Apache Hadoop**: Installed and configured (`HADOOP_HOME=/usr/local/hadoop`).
3. **Python 3**: Installed across all DataNodes (`python3 --version`).
4. **HDFS & YARN**: Services running (`start-dfs.sh` and `start-yarn.sh`).

Verify with:
```bash
hadoop version
hdfs dfsadmin -report
yarn node -list
```

---

## 2. Directory & HDFS Staging

Stage the dataset onto the Hadoop Distributed File System (HDFS):

```bash
# Create HDFS input and application directories
hdfs dfs -mkdir -p /betweenus/input
hdfs dfs -mkdir -p /betweenus/output

# Upload the 150 MB relationship dataset into HDFS
hdfs dfs -put -f data/relationship_patterns_150MB.csv /betweenus/input/

# Verify file presence and block distribution in HDFS
hdfs dfs -ls -h /betweenus/input/
hdfs fsck /betweenus/input/relationship_patterns_150MB.csv -files -blocks -locations
```

---

## 3. Submitting the Hadoop Streaming Job

Execute the Hadoop Streaming MapReduce job via YARN:

```bash
# Locate the Hadoop streaming jar (e.g. in $HADOOP_HOME/share/hadoop/tools/lib/)
STREAMING_JAR=$(find $HADOOP_HOME -name "hadoop-streaming*.jar" | head -n 1)

# Remove prior output directory if it exists
hdfs dfs -rm -r -f /betweenus/output/run1

# Submit Hadoop Streaming job
hadoop jar "$STREAMING_JAR" \
    -D mapreduce.job.name="BetweenUs_Relationship_PGS_MapReduce" \
    -D mapreduce.job.reduces=4 \
    -D stream.num.map.output.key.fields=2 \
    -input /betweenus/input/relationship_patterns_150MB.csv \
    -output /betweenus/output/run1 \
    -mapper "python3 mapper.py" \
    -reducer "python3 reducer.py" \
    -file hadoop/mapper.py \
    -file hadoop/reducer.py
```

---

## 4. Retrieving and Inspecting HDFS Results

```bash
# Check generated partition files
hdfs dfs -ls /betweenus/output/run1/

# Download the final partition files to local disk
mkdir -p output/hadoop_cluster_results
hdfs dfs -get /betweenus/output/run1/part-* output/hadoop_cluster_results/

# View the aggregate summary
cat output/hadoop_cluster_results/part-00000 | grep "__AGGREGATE_SUMMARY__" | cut -f2 | jq .
```

---

## 5. Local Testing vs. Hadoop Cluster Execution

| Feature | Local Unix Pipe Simulation | Real Apache Hadoop Cluster |
| :--- | :--- | :--- |
| **Command** | `python3 mapper.py < input.csv \| sort -k1,1 -k2,2 \| python3 reducer.py` | `hadoop jar hadoop-streaming.jar ...` |
| **Execution Engine** | Single-host Linux pipes (`bash`, `sort`) | Distributed YARN ResourceManager & NodeManagers |
| **Storage** | Local filesystem (`data/`, `output/`) | HDFS with 128 MB blocks and 3x replication |
| **Scale Target** | Fast verification and test suites (< 100K rows) | Full 150 MB dataset (1.1M+ rows) across cluster nodes |
| **Disclosure** | Explicitly reported as local simulation (Rule 10) | Reported as verified Hadoop YARN execution |
