import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from py_metrics.beir_downloader import download_beir_dataset
from py_metrics.beir_evaluator import (
    evaluate_beir_results,
    format_metrics,
    create_empty_metrics,
)

app = FastAPI(title="BEIR API", description="API for working with BEIR datasets")


class DownloadResponse(BaseModel):
    dataset_name: str
    corpus_path: str
    queries_path: str
    qrels_path: str
    success: bool
    message: str


class EvaluationResults(BaseModel):
    metrics: Dict
    dataset_name: str


class SearchResults(BaseModel):
    results: Dict[str, Dict[str, float]]


@app.get("/")
async def root():
    return {"message": "BEIR Dataset API is running"}


@app.post("/beir/download/{dataset_name}", response_model=DownloadResponse)
async def download_dataset(dataset_name: str):
    """Download and process a BEIR dataset"""
    try:
        result = download_beir_dataset(dataset_name)
        return {
            "dataset_name": dataset_name,
            "corpus_path": result["corpus_path"],
            "queries_path": result["queries_path"],
            "qrels_path": result["qrels_path"],
            "success": True,
            "message": f"Dataset {dataset_name} downloaded and processed successfully",
        }
    except Exception as e:
        # Log the error but don't expose detailed exception to client
        import logging

        logging.error(f"Error downloading dataset {dataset_name}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error downloading dataset: {str(e)[:200]}"
        )


@app.get("/beir/corpus/{dataset_name}")
async def get_corpus(dataset_name: str):
    """Get the corpus for a BEIR dataset"""
    data_dir = Path(__file__).parent.parent.parent / "beir_data" / dataset_name
    corpus_path = data_dir / "corpus.json"

    if not corpus_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Corpus for dataset {dataset_name} not found. Please download it first.",
        )

    try:
        with open(corpus_path, "r") as f:
            corpus = json.load(f)
        return corpus
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading corpus file: {str(e)[:200]}",
        )


@app.get("/beir/queries/{dataset_name}")
async def get_queries(dataset_name: str):
    """Get the queries for a BEIR dataset"""
    data_dir = Path(__file__).parent.parent.parent / "beir_data" / dataset_name
    queries_path = data_dir / "queries.json"

    if not queries_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Queries for dataset {dataset_name} not found. Please download it first.",
        )

    try:
        with open(queries_path, "r") as f:
            queries = json.load(f)
        return queries
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading queries file: {str(e)[:200]}",
        )


@app.get("/beir/qrels/{dataset_name}")
async def get_qrels(dataset_name: str):
    """Get the qrels for a BEIR dataset"""
    data_dir = Path(__file__).parent.parent.parent / "beir_data" / dataset_name
    qrels_path = data_dir / "qrels.json"

    if not qrels_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Qrels for dataset {dataset_name} not found. Please download it first.",
        )

    try:
        with open(qrels_path, "r") as f:
            qrels = json.load(f)
        return qrels
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading qrels file: {str(e)[:200]}",
        )


@app.post("/beir/evaluate/{dataset_name}", response_model=EvaluationResults)
async def evaluate_results(
    dataset_name: str,
    search_results: SearchResults,
    k_values: Optional[List[int]] = None,
):
    """Evaluate search results for a BEIR dataset"""
    data_dir = Path(__file__).parent.parent.parent / "beir_data" / dataset_name
    qrels_path = data_dir / "qrels.json"

    if not qrels_path.exists():
        # Instead of throwing an error, we'll return empty metrics
        # This allows the frontend to show 0 scores rather than crashing
        import logging

        logging.warning(
            f"Qrels file not found for {dataset_name}, returning empty metrics"
        )
        empty_metrics = format_metrics(
            create_empty_metrics(k_values or [1, 3, 5, 10, 100])
        )
        return {"metrics": empty_metrics, "dataset_name": dataset_name}

    try:
        # Evaluate the results
        metrics = evaluate_beir_results(
            search_results.results, qrels_path=str(qrels_path), k_values=k_values
        )

        # Format metrics for better readability
        formatted_metrics = format_metrics(metrics)

        return {"metrics": formatted_metrics, "dataset_name": dataset_name}
    except Exception as e:
        import logging

        logging.error(f"Error evaluating results for {dataset_name}: {str(e)}")
        # Return empty metrics instead of error
        empty_metrics = format_metrics(
            create_empty_metrics(k_values or [1, 3, 5, 10, 100])
        )
        return {"metrics": empty_metrics, "dataset_name": dataset_name}


@app.get("/beir/available-datasets")
async def get_available_datasets():
    """Get a list of available datasets that have been downloaded"""
    beir_data_dir = Path(__file__).parent.parent.parent / "beir_data"

    if not beir_data_dir.exists():
        return {"available_datasets": []}

    datasets = [d.name for d in beir_data_dir.iterdir() if d.is_dir()]
    return {"available_datasets": datasets}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("py_metrics.main:app", host="0.0.0.0", port=8000, reload=True)
