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
        k_values: List of k values for evaluation (default: [1, 3, 5])

    Returns:
        Dict of evaluation metrics
    """
    if k_values is None:
        k_values = [1, 3, 5]

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
            loaded_qrels = json.load(f)  # Load into a temporary variable

    else:
        loaded_qrels = qrels  # Use the provided qrels if not loading from file

    # Validate loaded qrels format
    if not loaded_qrels or not isinstance(loaded_qrels, dict):
        logger.error(f"Invalid qrels format or empty qrels provided or in {qrels_path}")
        return create_empty_metrics(k_values)

    # --- Start: Convert qrels keys to strings and relevance values to integers ---
    processed_qrels = {}
    for query_id, docs in loaded_qrels.items():
        current_query_id_str = (
            str(query_id) if not isinstance(query_id, str) else query_id
        )

        processed_qrels[current_query_id_str] = {}
        if not isinstance(docs, dict):
            logger.warning(
                f"Unexpected format for docs in qrels for query {current_query_id_str}, skipping."
            )
            continue  # Skip this query if doc data isn't a dictionary

        for doc_id, relevance in docs.items():
            current_doc_id_str = str(doc_id) if not isinstance(doc_id, str) else doc_id
            try:
                processed_qrels[current_query_id_str][current_doc_id_str] = int(
                    relevance
                )
            except (ValueError, TypeError):
                logger.warning(
                    f"Skipping invalid non-integer relevance score '{relevance}' for query {current_query_id_str}, doc {current_doc_id_str} in qrels."
                )
    # --- End: Convert qrels ---

    # Initialize evaluator
    evaluator = EvaluateRetrieval()
    evaluator.k_values = k_values

    # Validate results format from input
    if not results or not isinstance(results, dict):
        logger.error("Invalid results format or empty results from input")
        return create_empty_metrics(k_values)

    # --- Start: Convert results keys to strings and scores to floats ---
    processed_results = {}
    for query_id, docs_orig in results.items():
        current_query_id_str = (
            str(query_id) if not isinstance(query_id, str) else query_id
        )

        if not isinstance(docs_orig, dict):
            logger.warning(
                f"Inner documents for query '{current_query_id_str}' in results is not a dict, skipping."
            )
            processed_results[current_query_id_str] = {}  # Assign empty dict or skip
            continue

        current_docs_processed = {}
        for doc_id, score in docs_orig.items():
            current_doc_id_str = str(doc_id) if not isinstance(doc_id, str) else doc_id
            try:
                # Ensure scores are floats, as typically expected by BEIR for results
                current_docs_processed[current_doc_id_str] = float(score)
            except (ValueError, TypeError):
                logger.warning(
                    f"Skipping invalid score '{score}' (cannot convert to float) for query {current_query_id_str}, doc {current_doc_id_str} in results."
                )
        processed_results[current_query_id_str] = current_docs_processed
    # --- End: Convert results ---

    # Validate that there are queries in common (use processed keys)
    common_queries = set(processed_results.keys()).intersection(
        set(processed_qrels.keys())
    )
    if not common_queries:
        logger.error("No common queries between results and qrels")
        return create_empty_metrics(k_values)

    logger.info(
        f"Evaluating {len(processed_results)} queries against {len(processed_qrels)} qrels"
    )
    logger.info(f"Common queries: {len(common_queries)}")

    try:
        # Calculate metrics (ndcg, map, recall, precision)
        # Pass the processed dictionaries
        metrics = evaluator.evaluate(
            processed_qrels, processed_results, evaluator.k_values
        )

        # Log the type of metrics for debugging
        logger.info(f"Metrics type: {type(metrics)}")

        # Check if metrics is a tuple (some BEIR versions return tuples)
        if isinstance(metrics, tuple):
            logger.warning(
                "evaluator.evaluate() returned a tuple instead of a dictionary"
            )
            # Convert the tuple to a dictionary manually
            if len(metrics) >= 4:
                metrics_dict = {
                    "ndcg": metrics[0],
                    "map": metrics[1],
                    "recall": metrics[2],
                    "precision": metrics[3],
                }
                metrics = metrics_dict
            else:
                logger.error(f"Metrics tuple has unexpected length: {len(metrics)}")
                return create_empty_metrics(k_values)

        return metrics
    except Exception as e:
        logger.error(f"Error in evaluation: {e}")
        # Return empty metrics instead of error
        return create_empty_metrics(k_values)


def create_empty_metrics(k_values):
    """Create empty metrics dictionary for when evaluation fails"""
    metrics = {}
    # Use properly formatted metric names expected by the frontend
    metrics["ndcg"] = {k: 0.0 for k in k_values}
    metrics["map"] = {k: 0.0 for k in k_values}
    metrics["recall"] = {k: 0.0 for k in k_values}
    metrics["precision"] = {k: 0.0 for k in k_values}
    return metrics


def format_metrics(metrics):
    """Format metrics for display/API return"""
    formatted = {}

    # Check if metrics is a tuple (from BEIR evaluator) instead of dict
    if isinstance(metrics, tuple):
        # Log a warning about unexpected tuple format
        logger.warning(
            "Received metrics as a tuple instead of a dictionary. Attempting to convert..."
        )
        try:
            # Try to convert tuple to dictionary - common structure for BEIR
            # BEIR's EvaluateRetrieval sometimes returns (ndcg, _map, recall, precision)
            if len(metrics) >= 4:
                # Create a properly structured metrics dictionary
                metrics_dict = {"ndcg": {}, "map": {}, "recall": {}, "precision": {}}

                # BEIR tuple elements are often dictionaries keyed by k-values
                # Extract and format them properly
                ndcg_dict, map_dict, recall_dict, precision_dict = (
                    metrics[0],
                    metrics[1],
                    metrics[2],
                    metrics[3],
                )

                # Handle each metric dictionary if it exists and has the expected structure
                if isinstance(ndcg_dict, dict):
                    metrics_dict["ndcg"] = ndcg_dict
                if isinstance(map_dict, dict):
                    metrics_dict["map"] = map_dict
                if isinstance(recall_dict, dict):
                    metrics_dict["recall"] = recall_dict
                if isinstance(precision_dict, dict):
                    metrics_dict["precision"] = precision_dict

                metrics = metrics_dict
            else:
                logger.error(
                    f"Received tuple with unexpected length: {len(metrics)}. Creating empty metrics."
                )
                # Not enough elements in tuple, return empty metrics
                return {
                    "ndcg": {"NDCG@1": 0.0, "NDCG@3": 0.0, "NDCG@5": 0.0},
                    "map": {"MAP@1": 0.0, "MAP@3": 0.0, "MAP@5": 0.0},
                    "recall": {"Recall@1": 0.0, "Recall@3": 0.0, "Recall@5": 0.0},
                    "precision": {"P@1": 0.0, "P@3": 0.0, "P@5": 0.0},
                }
        except Exception as e:
            logger.error(f"Error converting metrics tuple to dictionary: {e}")
            # Return empty metrics with consistent format on error
            return {
                "ndcg": {"NDCG@1": 0.0, "NDCG@3": 0.0, "NDCG@5": 0.0},
                "map": {"MAP@1": 0.0, "MAP@3": 0.0, "MAP@5": 0.0},
                "recall": {"Recall@1": 0.0, "Recall@3": 0.0, "Recall@5": 0.0},
                "precision": {"P@1": 0.0, "P@3": 0.0, "P@5": 0.0},
            }

    try:
        # Initialize empty dictionaries with default values
        ndcg = {"NDCG@1": 0.0, "NDCG@3": 0.0, "NDCG@5": 0.0}
        map_metrics = {"MAP@1": 0.0, "MAP@3": 0.0, "MAP@5": 0.0}
        recall = {"Recall@1": 0.0, "Recall@3": 0.0, "Recall@5": 0.0}
        precision = {"P@1": 0.0, "P@3": 0.0, "P@5": 0.0}

        # NDCG at different k values
        if "ndcg" in metrics and metrics["ndcg"] and isinstance(metrics["ndcg"], dict):
            for k in metrics["ndcg"].keys():
                # Check if key already has the prefix 'NDCG@'
                if str(k).startswith("NDCG@"):
                    ndcg[str(k)] = metrics["ndcg"][k]
                else:
                    ndcg[f"NDCG@{k}"] = metrics["ndcg"][k]
        formatted["ndcg"] = ndcg

        # MAP
        if "map" in metrics and metrics["map"] and isinstance(metrics["map"], dict):
            for k in metrics["map"].keys():
                # Check if key already has the prefix 'MAP@'
                if str(k).startswith("MAP@"):
                    map_metrics[str(k)] = metrics["map"][k]
                else:
                    map_metrics[f"MAP@{k}"] = metrics["map"][k]
        formatted["map"] = map_metrics

        # Recall
        if (
            "recall" in metrics
            and metrics["recall"]
            and isinstance(metrics["recall"], dict)
        ):
            for k in metrics["recall"].keys():
                # Check if key already has the prefix 'Recall@'
                if str(k).startswith("Recall@"):
                    recall[str(k)] = metrics["recall"][k]
                else:
                    recall[f"Recall@{k}"] = metrics["recall"][k]
        formatted["recall"] = recall

        # Precision
        if (
            "precision" in metrics
            and metrics["precision"]
            and isinstance(metrics["precision"], dict)
        ):
            for k in metrics["precision"].keys():
                # Check if key already has the prefix 'P@'
                if str(k).startswith("P@"):
                    precision[str(k)] = metrics["precision"][k]
                else:
                    precision[f"P@{k}"] = metrics["precision"][k]
        formatted["precision"] = precision

        return formatted
    except Exception as e:
        logger.error(f"Error formatting metrics: {e}")
        # Return consistently formatted empty metrics if anything goes wrong
        return {
            "ndcg": {"NDCG@1": 0.0, "NDCG@3": 0.0, "NDCG@5": 0.0},
            "map": {"MAP@1": 0.0, "MAP@3": 0.0, "MAP@5": 0.0},
            "recall": {"Recall@1": 0.0, "Recall@3": 0.0, "Recall@5": 0.0},
            "precision": {"P@1": 0.0, "P@3": 0.0, "P@5": 0.0},
        }


def evaluate_from_file(results_path, qrels_path, k_values=None):
    """Evaluate results loaded from files"""
    # Check if paths exist
    if not os.path.exists(results_path):
        logger.error(f"Results file not found: {results_path}")
        return format_metrics(create_empty_metrics(k_values or [1, 3, 5]))

    # Load results
    try:
        with open(results_path, "r") as f:
            results = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Error loading results file: {e}")
        return format_metrics(create_empty_metrics(k_values or [1, 3, 5]))

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
