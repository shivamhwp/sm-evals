# Supermemory Evaluation Framework

A framework for evaluating Supermemory's performance using BEIR benchmark datasets for Information Retrieval tasks.

## Overview

This project provides tools to:

1. Download and process BEIR benchmark datasets
2. Load BEIR datasets into Supermemory
3. Evaluate Supermemory's retrieval performance using standard IR metrics

## Setup

### Requirements

- Node.js and Bun
- Python 3.10+
- uv (Python package manager)
- Environment variables for API access

### Installation

1. Clone this repository
2. Install dependencies:

```bash
# Install JavaScript dependencies
bun install

# Install Python dependencies
cd py-metrics
uv pip install -e .
```

3. Create a `.env` file in the root directory with your API keys:

```
SUPERMEMORY_API_KEY=your_api_key
SUPERMEMORY_API_URL=https://v2.api.supermemory.ai/
PYMETRICS_API_URL=http://localhost:8000
```

## Usage

### Step 1: Start the PyMetrics Service

The Python FastAPI service handles BEIR dataset downloading and evaluation:

```bash
bun run start-pymetrics
```

This starts a FastAPI server on `http://localhost:8000`.

### Step 2: Download a BEIR Dataset

```bash
bun run download-beir scifact
```

Replace `scifact` with the name of any BEIR dataset:

- `scifact`: Scientific fact-checking
- `nfcorpus`: News and MEDLINE articles
- `fiqa`: Financial opinion mining
- `dbpedia-entity`: Entity retrieval
- And many more...

### Step 3: Load Data into Supermemory

```bash
bun run load-beir scifact
```

This will:

1. Download the dataset if not already downloaded
2. Fetch the corpus from the PyMetrics service
3. Process and upload documents to Supermemory in batches

### Step 4: Run Search Evaluation

```bash
bun run search-beir scifact
```

This will:

1. Fetch queries and relevance judgments (qrels) from the PyMetrics service
2. Execute each query against Supermemory
3. Evaluate the results using standard IR metrics (NDCG, MAP, Recall, Precision)
4. Save detailed results to the `results/` directory

## Metrics

Evaluation produces the following metrics:

- NDCG@k (Normalized Discounted Cumulative Gain)
- Precision@k
- Recall@k
- MAP@k (Mean Average Precision)

Where k is typically 1, 3, 5, 10, and 100.

## Troubleshooting

### Dataset Download Issues

If you encounter issues with dataset downloads:

1. Check the PyMetrics logs for detailed error messages
2. Ensure you have sufficient disk space
3. Try running the download command again, as the download process has improved error handling

The downloader will:

- Download the zip file if it doesn't exist
- Extract the contents properly
- Convert JSONL/TSV files to JSON format
- Handle various dataset structures

### Empty Evaluation Results

If evaluation returns zeros for all metrics:

1. Check if the dataset was downloaded correctly
2. Verify that the queries and qrels files exist
3. Ensure that the search results contain document IDs that match those in the qrels file

## Development

### Project Structure

- `py-metrics/`: Python FastAPI service for BEIR dataset handling
- `src/`: TypeScript codebase
  - `api/`: API client for Supermemory
  - `evaluation/`: Evaluation logic
  - `scripts/`: Utility scripts
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
