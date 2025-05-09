#!/usr/bin/env python3
"""
List BEIR datasets that have been downloaded to the local system.
"""

import os
import json
import sys
from pathlib import Path


def list_downloaded_datasets():
    """List all downloaded BEIR datasets in the beir_data directory."""
    # Find the beir_data directory
    base_dir = Path(__file__).parent.parent
    beir_data_dir = base_dir / "beir_data"

    if not beir_data_dir.exists():
        print("No datasets have been downloaded yet.")
        print("Use 'bun run download-beir -- <dataset_name>' to download a dataset.")
        return []

    # Get all directories in beir_data
    datasets = [d.name for d in beir_data_dir.iterdir() if d.is_dir()]

    if not datasets:
        print("No datasets have been downloaded yet.")
        print("Use 'bun run download-beir -- <dataset_name>' to download a dataset.")
        return []

    print(f"Found {len(datasets)} downloaded datasets:")
    for dataset in sorted(datasets):
        corpus_path = beir_data_dir / dataset / "corpus.json"
        queries_path = beir_data_dir / dataset / "queries.json"
        qrels_path = beir_data_dir / dataset / "qrels.json"

        status = []
        if corpus_path.exists():
            with open(corpus_path, "r") as f:
                corpus = json.load(f)
                status.append(f"corpus: {len(corpus)} documents")
        else:
            status.append("corpus: missing")

        if queries_path.exists():
            with open(queries_path, "r") as f:
                queries = json.load(f)
                status.append(f"queries: {len(queries)}")
        else:
            status.append("queries: missing")

        if qrels_path.exists():
            with open(qrels_path, "r") as f:
                qrels = json.load(f)
                status.append(f"qrels: {len(qrels)}")
        else:
            status.append("qrels: missing")

        print(f"  - {dataset} ({', '.join(status)})")

    return datasets


def print_available_datasets():
    """Print a list of known BEIR datasets that can be downloaded."""
    # This is a non-exhaustive list of commonly used BEIR datasets
    available = [
        "scifact",
        "fiqa",
        "arguana",
        "scidocs",
        "nfcorpus",
        "quora",
        "dbpedia-entity",
        "nq",
        "hotpotqa",
        "fever",
        "climate-fever",
        "trec-covid",
    ]

    print("\nAvailable BEIR datasets for download:")
    for dataset in available:
        print(f"  - {dataset}")

    print("\nDownload a dataset with: bun run download-beir -- <dataset_name>")


if __name__ == "__main__":
    print("===== BEIR Datasets =====")
    downloaded = list_downloaded_datasets()
    print_available_datasets()
