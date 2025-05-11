# supermemory - universal memory API for the AI era

## eval metrics

we evaluated supermemory using standard IR metrics: NDCG, MAP, Recall, and Precision at different cutoffs(or k-values) (@1, @3, @5). the test was done using [beir-benchmark](https://github.com/beir-cellar/beir) on scifact dataset. the results are summarized below:

![Supermemory Evaluation Metrics](https://ypazyw0thq.ufs.sh/f/38t7p527clgq1ge13YZqMy6JQjUcm5nrGbA3h7taFpvB4Nzf)

_See the chart above for a visual representation of these results._

| Metric    | @1    | @3    | @5    |
| --------- | ----- | ----- | ----- |
| NDCG      | 59.9% | 66.3% | 66.2% |
| MAP       | 56.8% | 63.7% | 63.7% |
| Recall    | 56.8% | 71.1% | 71.1% |
| Precision | 59.9% | 26.0% | 15.6% |

> we are continuously running tests and benchmarks trying to make supermemory fast and super easy to use.

- made with ❤️ by the supermemory team
