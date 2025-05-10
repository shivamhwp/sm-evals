import os
import json
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from py_metrics.scripts.beir_downloader import download_beir_dataset
from py_metrics.evals.beir_evaluator import (
    evaluate_beir_results,
    format_metrics,
    create_empty_metrics,
)
from py_metrics.evals.calculate_metrics import (
    compute_classification_metrics,
    compute_bleu_score,
)
from py_metrics.types.metrics import MetricsPayload

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


class FilePathRequest(BaseModel):
    file_path: str
    k_values: Optional[List[int]] = None


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
        empty_metrics = format_metrics(create_empty_metrics(k_values or [1, 3, 5]))
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
        empty_metrics = format_metrics(create_empty_metrics(k_values or [1, 3, 5]))
        return {"metrics": empty_metrics, "dataset_name": dataset_name}


@app.get("/beir/available-datasets")
async def get_available_datasets():
    """Get a list of available datasets that have been downloaded"""
    beir_data_dir = Path(__file__).parent.parent.parent / "beir_data"

    if not beir_data_dir.exists():
        return {"available_datasets": []}

    datasets = [d.name for d in beir_data_dir.iterdir() if d.is_dir()]
    return {"available_datasets": datasets}


@app.post("/calculate_metrics", response_model=Dict[str, float])
async def calculate_metrics_endpoint(payload: MetricsPayload):
    # Just log the data
    print("Received payload:", payload)

    results = {}
    metrics_requested = set(payload.metrics_to_calculate)

    if "bleu" in metrics_requested and payload.bleu_data:
        try:
            results["bleu"] = compute_bleu_score(payload.bleu_data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calculating BLEU: {e}")

    classification_metrics_needed = metrics_requested.intersection(
        {"f1", "recall", "precision"}
    )
    if classification_metrics_needed and payload.classification_data:
        try:
            classification_results = compute_classification_metrics(
                payload.classification_data,
                list(classification_metrics_needed),
            )
            results.update(classification_results)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error calculating classification metrics: {e}"
            )

    if not results:
        raise HTTPException(
            status_code=400,
            detail="No metrics were calculated. Check requested metrics and provided data.",
        )

    print("Returning results:", results)
    return results


@app.post("/calculate_metrics_from_file")
async def calculate_metrics_from_file(
    metrics_payload: MetricsPayload,
    file_path: str = "search_results_scifact_2025-05-09T16-00-53.380Z.json",
):
    """Calculate metrics by comparing saved results with ground truth data"""
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, detail=f"Results file not found at path: {file_path}"
        )

    try:
        # Load search results from file
        with open(file_path, "r") as f:
            saved_results = json.load(f)

        # Process the metrics calculation
        results = {}
        metrics_requested = set(metrics_payload.metrics_to_calculate)

        if "bleu" in metrics_requested and metrics_payload.bleu_data:
            try:
                results["bleu"] = compute_bleu_score(metrics_payload.bleu_data)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Error calculating BLEU: {e}"
                )

        classification_metrics_needed = metrics_requested.intersection(
            {"f1", "recall", "precision"}
        )
        if classification_metrics_needed and metrics_payload.classification_data:
            try:
                classification_results = compute_classification_metrics(
                    metrics_payload.classification_data,
                    list(classification_metrics_needed),
                )
                results.update(classification_results)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error calculating classification metrics: {e}",
                )

        if not results:
            raise HTTPException(
                status_code=400,
                detail="No metrics were calculated. Check requested metrics and provided data.",
            )

        print("Returning results:", results)
        return results
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail=f"Invalid JSON format in results file: {file_path}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing results file: {str(e)}"
        )


@app.post("/beir/evaluate-from-file/{dataset_name}", response_model=EvaluationResults)
async def evaluate_results_from_file(dataset_name: str, request: FilePathRequest):
    """Evaluate search results from a saved file for a BEIR dataset"""
    file_path = request.file_path
    k_values = request.k_values or [1, 3, 5]

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"Results file not found at path: {file_path}",
        )

    data_dir = Path(__file__).parent.parent.parent / "beir_data" / dataset_name
    qrels_path = data_dir / "qrels.json"

    if not qrels_path.exists():
        # Instead of throwing an error, we'll return empty metrics
        import logging

        logging.warning(
            f"Qrels file not found for {dataset_name}, returning empty metrics"
        )
        empty_metrics = format_metrics(create_empty_metrics(k_values))
        return {"metrics": empty_metrics, "dataset_name": dataset_name}

    try:
        # Load the results from the file
        with open(file_path, "r") as f:
            file_content = json.load(f)

        # Extract the results - handle different possible formats
        search_results = {}
        if "results" in file_content and isinstance(file_content["results"], dict):
            search_results = file_content["results"]
        elif isinstance(file_content, dict) and all(
            isinstance(v, dict) for v in file_content.values()
        ):
            # Assume the file itself is the results dictionary
            search_results = file_content

        # Evaluate the results
        metrics = evaluate_beir_results(
            search_results, qrels_path=str(qrels_path), k_values=k_values
        )

        # Format metrics for better readability
        formatted_metrics = format_metrics(metrics)

        return {"metrics": formatted_metrics, "dataset_name": dataset_name}
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON format in results file: {file_path}",
        )
    except Exception as e:
        import logging

        logging.error(f"Error evaluating results for {dataset_name}: {str(e)}")
        # Return empty metrics instead of error
        empty_metrics = format_metrics(create_empty_metrics(k_values))
        return {"metrics": empty_metrics, "dataset_name": dataset_name}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("py_metrics.main:app", host="0.0.0.0", port=8000, reload=True)
