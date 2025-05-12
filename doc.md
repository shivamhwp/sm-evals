# supermemory eval report #1

### 1. Introduction

### 2. how we tested supermemory

- **Datasets Used:**
  - we used scifact dataset containing 5.1k documents, from the [beir-benchmark](https://github.com/beir-cellar/beir).
- **Evaluation Process:**
  - we tested the metrics (explained below) provided by benchmark with different k values(1,3,5,10).

### 3. metrics Explained (in Simple Terms)

- **NDCG (Normalized Discounted Cumulative Gain):**
  - Measures how well the best answers are ranked at the top. Higher is better.
- **MAP (Mean Average Precision):**
  - Checks if the correct answers are found and ranked high. Higher is better.
- **Precision@k:**
  - Out of the top k results, how many are actually correct? Higher is better.
- **Recall@k:**
  - Out of all possible correct answers, how many did we find in the top k? Higher is better.

### 4. our findings

![Supermemory Evaluation Metrics](https://ypazyw0thq.ufs.sh/f/38t7p527clgqel0NF1iGzX5t6K9HPo7rZCflV3QEyx01m8uc)
| Metric | @10 | @5 | @3 | @1 |
| --------- | ------ | ------ | ------ | ------ |
| NDCG | 0.7120 | 0.6930 | 0.6642 | 0.5989 |
| MAP | 0.6669 | 0.6579 | 0.6381 | 0.5675 |
| Recall | 0.8363 | 0.7816 | 0.7123 | 0.5675 |
| Precision | 0.0945 | 0.1748 | 0.2607 | 0.5989 |

### conclusion

based on our findings, supermemory shows exceptional performance in information retrieval, as evident from the metrics. the supermemory team is working hard and constantly running benchmarks to make it best in terms of both performance and speed.

with this being just the first version, we have significant advancements coming in the future.

<br>
