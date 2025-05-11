# BEIR Metrics Evaluation

This directory contains scripts for downloading BEIR datasets, running evaluations, and calculating metrics for information retrieval systems.

## Setup

1. Install Python dependencies:

```bash
cd py-metrics
uv pip install -r requirements.txt
```

Or use the bun script:

```bash
bun run install:py-deps
```

## Available Scripts

The following scripts are available through bun:

- `start:server`: Start the FastAPI server for working with BEIR datasets
- `download:dataset`: Download a BEIR dataset (requires a dataset name as argument)
- `list:datasets`: List available datasets that can be downloaded and those already downloaded
- `load:dataset`: Load BEIR datasets for use with your search system
- `search`: Run search queries and save results to a file
- `evaluate`: Evaluate saved search results
- `delete:memories`: Delete memories from your search system

## Typical Workflow

1. **Start the Python metrics API server**:

   ```bash
   bun run start:server
   ```

2. **List available datasets**:

   ```bash
   bun run list:datasets
   ```

3. **Download a dataset**:

   ```bash
   bun run download:dataset
   ```

4. **Load the dataset for search**:

   ```bash
   bun run load:dataset
   ```

5. **Run search queries and save to file**:

   ```bash
   bun run search
   ```

   This will:

   - Run search operations in TypeScript
   - Save results to a file in the `results` directory
   - Display the file path where results are saved

6. **Evaluate the saved search results**:

   ```bash
   bun run evaluate -- ./results/search_results_scifact_123.json scifact
   ```

   This will:

   - Send the file path to the Python backend for evaluation
   - Display and save evaluation metrics

## Performance Benefits

The file-based evaluation approach provides these benefits:

1. **Faster Search Response**: Search results are immediately saved to a file without waiting for metric calculations.
2. **Separation of Concerns**: Search logic is handled by TypeScript, while the Python backend focuses on metric calculation.
3. **Reproducibility**: Saved search results can be re-evaluated with different parameters without re-running searches.

## Output

- Search results are saved as JSON files in the `results` directory with filenames like `search_results_[dataset]_[timestamp].json`
- Evaluation results are saved as JSON files with names like `eval_[dataset]_[timestamp].json`

## API Endpoints

The Python backend provides the following endpoints for calculating metrics:

- `/beir/evaluate-from-file/{dataset_name}`: Evaluate BEIR search results from a file
- `/calculate_metrics_from_file`: Calculate metrics like F1, precision, recall, and BLEU from a file

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
