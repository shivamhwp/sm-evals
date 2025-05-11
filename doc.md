# supermemory - universal memory API for the AI era

## eval metrics

we evaluated supermemory using standard IR metrics: NDCG, MAP, Recall, and Precision at different cutoffs(or k-values) (@1, @3, @5). the test was done using [beir-benchmark](https://github.com/beir-cellar/beir) on scifact dataset. the results are summarized below:

![Supermemory Evaluation Metrics](https://ypazyw0thq.ufs.sh/f/38t7p527clgqel0NF1iGzX5t6K9HPo7rZCflV3QEyx01m8uc)

_See the chart above for a visual representation of these results._

| Metric    | @10    | @5     | @3     | @1     |
| --------- | ------ | ------ | ------ | ------ |
| NDCG      | 0.7120 | 0.6930 | 0.6642 | 0.5989 |
| MAP       | 0.6669 | 0.6579 | 0.6381 | 0.5675 |
| Recall    | 0.8363 | 0.7816 | 0.7123 | 0.5675 |
| Precision | 0.0945 | 0.1748 | 0.2607 | 0.5989 |

> we are continuously running tests and benchmarks trying to make supermemory fast and super easy to use.

- made with ❤️ by the supermemory team
