## sm-evals.

testing supermemory on beir benchmark.

### Requirements

have [nodejs](https://nodejs.org/en), [bun](https://bun.sh) and [uv](https://docs.astral.sh/uv/) installed.

### setup

```bash
bun install
cd py-metrics
bun install:py-deps
```

create a `.env` in the root of the project.

```
SUPERMEMORY_API_KEY=your_api_key
SUPERMEMORY_API_URL=https://v2.api.supermemory.ai/
PYMETRICS_API_URL=http://localhost:8000
DATASET_NAME=""   (scifact,hotpotqa etc.)
```

## Usage

1.  start a server on loclhost:8000.

```bash
bun run start:server
```

2.  download a dataset, learn more [about datasets here](https://github.com/beir-cellar/beir/wiki/Datasets-available)

```bash
bun run download:dataset
```

3. load the dataset into supermemory.

```bash
bun run load:dataset
```

> what does above commands do -> they download the dataset from the beir-benchmark and uploads it into the supermemory's (vector db). the backend do the ingestion,embedding,chunking etc. etc. and makes the content searchable.

4. <b>evaluation time !!</b>

```bash
bun run search [search_results_file]
```

### metrics

we evaluate supermemory on 4 different metrics provided by beir-benchmark.
NDCG@k, Precision@k, Recall@k, MAP@k  
(k = 1, 3 & 5).

### project structure

- `py-metrics/`: the backend, a server running on localhost:8000, which does evaluation on the results we get from sm using libraries like
  - evals : evaluation logic
  - scripts : utility scripts like downloading & listing datasets.
- `src/`: ts codebase.
  - `api/`: api client
  - `types/`: types
  - `utils/`: utility functions.
