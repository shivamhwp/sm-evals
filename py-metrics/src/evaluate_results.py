#!/usr/bin/env python3
"""
Evaluate search results against a BEIR dataset.
"""

import os
import sys
import json
import argparse
from pathlib import Path

from py_metrics.beir_evaluator import evaluate_beir_results, format_metrics


def evaluate_results(results_file, dataset_name, k_values=None):
    """
    Evaluate search results against a BEIR dataset.

    Args:
        results_file: Path to JSON file containing search results
        dataset_name: Name of the BEIR dataset to evaluate against
        k_values: List of k values to compute metrics for

    Returns:
        Dictionary of evaluation metrics
    """
    if k_values is None:
        k_values = [1, 3, 5, 10, 20, 100, 1000]

    # Find the BEIR data directory
    base_dir = Path(__file__).parent.parent
    beir_data_dir = base_dir / "beir_data"
    dataset_dir = beir_data_dir / dataset_name
    qrels_path = dataset_dir / "qrels.json"

    # Check if dataset exists
    if not dataset_dir.exists():
        print(f"Error: Dataset '{dataset_name}' not found.")
        print(
            f"Available datasets: {[d.name for d in beir_data_dir.iterdir() if d.is_dir()]}"
        )
        return None

    # Check if qrels file exists
    if not qrels_path.exists():
        print(f"Error: Qrels file not found for dataset '{dataset_name}'.")
        return None

    # Load search results
    try:
        with open(results_file, "r") as f:
            results_data = json.load(f)

        # Check if results are in the expected format
        if "results" in results_data:
            results = results_data["results"]
        else:
            results = results_data  # Assume the file directly contains the results

    except Exception as e:
        print(f"Error loading results file: {e}")
        return None

    # Evaluate results
    try:
        metrics = evaluate_beir_results(results, str(qrels_path), k_values)
        formatted_metrics = format_metrics(metrics)
        return formatted_metrics
    except Exception as e:
        print(f"Error evaluating results: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate search results against a BEIR dataset"
    )
    parser.add_argument(
        "results_file", help="Path to JSON file containing search results"
    )
    parser.add_argument(
        "dataset_name", help="Name of the BEIR dataset to evaluate against"
    )
    parser.add_argument(
        "--k-values", nargs="+", type=int, help="K values to compute metrics for"
    )
    args = parser.parse_args()

    if not os.path.exists(args.results_file):
        print(f"Error: Results file '{args.results_file}' not found.")
        return 1

    metrics = evaluate_results(args.results_file, args.dataset_name, args.k_values)
    if metrics is None:
        return 1

    # Pretty print the metrics
    print("\n===== Evaluation Results =====")
    print(f"Dataset: {args.dataset_name}")
    print(f"Results file: {args.results_file}")
    print("\nMetrics:")
    for metric_name, values in metrics.items():
        print(f"\n{metric_name}:")
        for k, value in values.items():
            print(f"  {k}: {value:.4f}")

    # Save metrics to file
    output_file = f"{os.path.splitext(args.results_file)[0]}_metrics.json"
    with open(output_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nMetrics saved to: {output_file}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
