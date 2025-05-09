#!/usr/bin/env python3
import sys
from src.py_metrics.beir_downloader import download_beir_dataset

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python download_beir.py <dataset_name>")
        print("Example dataset names: scifact, nfcorpus, quora, dbpedia-entity, etc.")
        sys.exit(1)

    dataset_name = sys.argv[1]
    print(f"Downloading BEIR dataset: {dataset_name}")
    result = download_beir_dataset(dataset_name)
    print(f"Download complete. Files saved to:")
    for key, path in result.items():
        print(f"  {key}: {path}")
