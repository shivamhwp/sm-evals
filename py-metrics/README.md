# BEIR Metrics Evaluation

This directory contains scripts for downloading BEIR datasets, running evaluations, and calculating metrics for information retrieval systems.

## Setup

1. Install Python dependencies:

```bash
cd py-metrics
uv pip install -r requirements.txt
```

Or use the npm script:

```bash
npm run install:py-deps
```

## Available Scripts

The following scripts are available through npm:

- `start-pymetrics`: Start the FastAPI server for working with BEIR datasets
- `download-beir`: Download a BEIR dataset (requires a dataset name as argument)
- `list-beir-datasets`: List available datasets that can be downloaded and those already downloaded
- `load-beir`: Load BEIR datasets for use with your search system
- `search-beir`: Run search queries against BEIR datasets
- `evaluate-beir`: Evaluate search results against BEIR datasets

### Workflow Scripts

The following combined scripts automate common workflows:

- `metrics:download-and-load`: Download and load a BEIR dataset
- `metrics:search-and-evaluate`: Run search queries and evaluate the results
- `metrics:all`: Run the entire workflow (start server, download dataset, load dataset, search)
- `metrics:help`: Display help information about the workflow

## Typical Workflow

1. **Start the Python metrics API server**:

   ```bash
   npm run start-pymetrics
   ```

2. **List available datasets**:

   ```bash
   npm run list-beir-datasets
   ```

3. **Download a dataset**:

   ```bash
   npm run download-beir -- scifact
   ```

4. **Load the dataset for search**:

   ```bash
   npm run load-beir -- scifact
   ```

5. **Run search queries**:

   ```bash
   npm run search-beir -- scifact
   ```

6. **Evaluate search results**:
   ```bash
   npm run evaluate-beir -- results/scifact_results.json scifact
   ```

## Output

Evaluation results will be saved as JSON files in the same directory as the results file, with a `_metrics.json` suffix.

## API Endpoints

When running the metrics API server, the following endpoints are available:

- `GET /`: Check if the API is running
- `POST /beir/download/{dataset_name}`: Download a BEIR dataset
- `GET /beir/corpus/{dataset_name}`: Get the corpus for a dataset
- `GET /beir/queries/{dataset_name}`: Get the queries for a dataset
- `GET /beir/qrels/{dataset_name}`: Get the qrels (relevance judgments) for a dataset
- `POST /beir/evaluate/{dataset_name}`: Evaluate search results for a dataset
- `GET /beir/available-datasets`: List available datasets

## BEIR Datasets

Common BEIR datasets include:

- `scifact`: Scientific fact-checking
- `fiqa`: Financial domain question answering
- `arguana`: Argumentative content retrieval
- `scidocs`: Scientific document retrieval
- `nfcorpus`: News and forum articles
- `quora`: Question duplicates
- `dbpedia-entity`: Entity-centric retrieval
- `nq`: Natural Questions
- `hotpotqa`: Multi-hop question answering
- `fever`: Fact verification
- `climate-fever`: Climate fact checking
- `trec-covid`: COVID-19 literature
