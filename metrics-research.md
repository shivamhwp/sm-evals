possible metrics to be tested.

| **Metric Category**    | **Examples**                  | **Description**                                                                                              |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Retrieval Quality**  | Recall\@K, Precision\@K, MRR  | Fraction of relevant items retrieved (Recall), accuracy of top-K results (Precision), ranking quality (MRR). |
| **End-to-End Quality** | BLEU, ROUGE, Accuracy (QA)    | For RAG, how well the final LLM output matches references or user needs (e.g., QA accuracy, fluency).        |
| **Latency**            | P50/P95/P99, Mean             | Query response times. Lower is better. High percentiles (P95/P99) indicate tail performance.                 |
| **Throughput (QPS)**   | QPS                           | Queries handled per second (possibly multi-threaded). High QPS is critical for high-load systems.            |
| **Scalability**        | Data Size, Concurrency        | Performance variation with dataset size and concurrent clients. Measured by scaling tests.                   |
| **Resource Use**       | Indexing time, Memory/CPU use | Time and compute to build or query index; memory footprint. E.g. time to index 10K vs 100K docs.             |
| **Cost Efficiency**    | Queries/\$                    | For cloud services, queries served per unit cost.                                                            |
| **Hybrid Queries**     | Filtered Search Capability    | Support for vector+metadata filtering (like “WHERE price<\$50”) adds overhead; measured in mixed queries.    |

<br>

## methods.

1.GENERAL RETRIEVAL BENCHMARKS: between [beir](https://github.com/beir-cellar/beir), [mteb](https://github.com/embeddings-benchmark/mteb) and [locomo](https://github.com/snap-research/locomo).
-> beir - tests retrieval capability in zero-shot setting. specifically designed for retrieval ai systems. contains 17 diverse text retrieval tasks.
-> mteb(2nd best choice if we wanna do it) - overall broader focus. evaluating embedding across many tasks. contains 58+ datasets.

> above benchmarks test the foundational ability to embed text and perform similarity search accurately.

-> locomo(current) -> generally used for long term conversation memory. not relevant at all. ( irrelevant )(will be removing.)

2. [ann-benchmakrs](https://github.com/erikbern/ann-benchmarks/) :

   - this measure different aspects of an ANN algo like QPS, recall, memory-usage.
   - typically presents results as a trade-off curve between Recall and QPS.
   - primarily evaluates the in-memory search algorithm, not the sys. perf.

3. llm as a judge.

   <br>

## tools

---

### todo

- [ ] replacing locomo with beir.
