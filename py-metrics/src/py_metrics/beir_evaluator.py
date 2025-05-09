import json
import logging
import argparse
from pathlib import Path
import os

from beir.retrieval.evaluation import EvaluateRetrieval

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def evaluate_beir_results(results, qrels_path=None, qrels=None, k_values=None):
    """
    Evaluate retrieval results using BEIR metrics

    Args:
        results: Dict of {query_id: {doc_id: score, ...}, ...}
        qrels_path: Path to qrels.json file
        qrels: Dict of qrels if already loaded
        k_values: List of k values for evaluation (default: [1, 3, 5, 10, 100])

    Returns:
        Dict of evaluation metrics
    """
    if k_values is None:
        k_values = [1, 3, 5, 10, 100]

    # Load qrels if not provided
    if qrels is None:
        if qrels_path is None:
            raise ValueError("Either qrels or qrels_path must be provided")

        qrels_path = Path(qrels_path)
        if not qrels_path.exists():
            logger.error(f"Qrels file not found at {qrels_path}")
            # Return empty metrics if qrels file doesn't exist
            return create_empty_metrics(k_values)

        with open(qrels_path, "r") as f:
            qrels = json.load(f)

        # Validate qrels format
        if not qrels or not isinstance(qrels, dict):
            logger.error(f"Invalid qrels format or empty qrels in {qrels_path}")
            return create_empty_metrics(k_values)

    # Initialize evaluator
    evaluator = EvaluateRetrieval()
    evaluator.k_values = k_values

    # Validate results format
    if not results or not isinstance(results, dict):
        logger.error("Invalid results format or empty results")
        return create_empty_metrics(k_values)

    # Validate that there are queries in common
    common_queries = set(results.keys()).intersection(set(qrels.keys()))
    if not common_queries:
        logger.error("No common queries between results and qrels")
        return create_empty_metrics(k_values)

    logger.info(f"Evaluating {len(results)} queries against {len(qrels)} qrels")
    logger.info(f"Common queries: {len(common_queries)}")

    try:
        # Calculate metrics (ndcg, map, recall, precision)
        metrics = evaluator.evaluate(qrels, results, evaluator.k_values)
        return metrics
    except Exception as e:
        logger.error(f"Error in evaluation: {e}")
        return create_empty_metrics(k_values)


def create_empty_metrics(k_values):
    """Create empty metrics dictionary for when evaluation fails"""
    metrics = {}
    for metric_type in ["ndcg", "map", "recall", "precision"]:
        metrics[metric_type] = {k: 0.0 for k in k_values}
    return metrics


def format_metrics(metrics):
    """Format metrics for display/API return"""
    formatted = {}

    # NDCG at different k values
    ndcg = {}
    for k in metrics["ndcg"].keys():
        ndcg[f"NDCG@{k}"] = metrics["ndcg"][k]
    formatted["ndcg"] = ndcg

    # MAP
    map_metrics = {}
    for k in metrics["map"].keys():
        map_metrics[f"MAP@{k}"] = metrics["map"][k]
    formatted["map"] = map_metrics

    # Recall
    recall = {}
    for k in metrics["recall"].keys():
        recall[f"Recall@{k}"] = metrics["recall"][k]
    formatted["recall"] = recall

    # Precision
    precision = {}
    for k in metrics["precision"].keys():
        precision[f"P@{k}"] = metrics["precision"][k]
    formatted["precision"] = precision

    return formatted


def evaluate_from_file(results_path, qrels_path, k_values=None):
    """Evaluate results loaded from files"""
    # Check if paths exist
    if not os.path.exists(results_path):
        logger.error(f"Results file not found: {results_path}")
        return format_metrics(create_empty_metrics(k_values or [1, 3, 5, 10, 100]))

    # Load results
    try:
        with open(results_path, "r") as f:
            results = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Error loading results file: {e}")
        return format_metrics(create_empty_metrics(k_values or [1, 3, 5, 10, 100]))

    # Evaluate
    metrics = evaluate_beir_results(results, qrels_path=qrels_path, k_values=k_values)

    # Format metrics
    return format_metrics(metrics)


def main():
    parser = argparse.ArgumentParser(description="Evaluate BEIR search results")
    parser.add_argument("results_path", help="Path to search results JSON file")
    parser.add_argument("qrels_path", help="Path to qrels JSON file")
    parser.add_argument(
        "--k-values", nargs="+", type=int, help="K values for evaluation metrics"
    )
    args = parser.parse_args()

    k_values = args.k_values if args.k_values else None
    metrics = evaluate_from_file(args.results_path, args.qrels_path, k_values)

    print(json.dumps(metrics, indent=4))


if __name__ == "__main__":
    main()
