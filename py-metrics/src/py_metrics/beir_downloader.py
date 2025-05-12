import json
import logging
import argparse
import zipfile
import shutil
import requests
import os
from pathlib import Path


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def http_get(url, output_path):
    """
    Downloads a URL to a specified file path.

    Args:
        url: The URL to download
        output_path: The local path to save the downloaded file
    """
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def download_beir_dataset(dataset_name, output_dir=None):
    """
    Download a specified BEIR dataset and save its components as JSON files.

    Args:
        dataset_name: Name of the BEIR dataset to download
        output_dir: Directory to save the dataset. If None, uses default directory

    Returns:
        Dict containing paths to the saved JSON files
    """
    # Set up output directory
    if output_dir is None:
        output_dir = Path(
            os.getenv(
                "BEIR_DATA_ROOT_PATH",
                str(Path(__file__).parent.parent.parent / "beir_data"),
            )
        )
    else:
        output_dir = Path(output_dir)

    dataset_dir = output_dir / dataset_name
    dataset_dir.mkdir(parents=True, exist_ok=True)

    # Define output JSON paths
    corpus_json_path = dataset_dir / "corpus.json"
    queries_json_path = dataset_dir / "queries.json"
    qrels_json_path = dataset_dir / "qrels.json"

    # Check if output files already exist
    if (
        corpus_json_path.exists()
        and queries_json_path.exists()
        and qrels_json_path.exists()
    ):
        logger.info(f"Files already exist in {dataset_dir}, skipping processing")
        return {
            "corpus_path": str(corpus_json_path),
            "queries_path": str(queries_json_path),
            "qrels_path": str(qrels_json_path),
        }

    logger.info(f"Downloading BEIR dataset: {dataset_name}")
    logger.info(f"Output directory: {dataset_dir}")

    # Download the dataset
    zip_path = output_dir / f"{dataset_name}.zip"
    if not zip_path.exists():
        url = f"https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/{dataset_name}.zip"
        try:
            logger.info(f"Downloading from {url} to {zip_path}")
            http_get(url, zip_path)
        except Exception as e:
            logger.error(f"Failed to download dataset: {e}")
            raise
    else:
        logger.info(f"Zip file already exists at {zip_path}")

    # Extract the zip file
    try:
        logger.info(f"Extracting zip file to {output_dir}")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(output_dir)
    except Exception as e:
        logger.error(f"Failed to extract dataset: {e}")
        raise

    # Check if corpus is in a subdirectory
    expected_corpus_path = dataset_dir / "corpus.jsonl"
    if not expected_corpus_path.exists():
        # Find the correct directory
        for subdir in dataset_dir.glob("*"):
            if subdir.is_dir() and (subdir / "corpus.jsonl").exists():
                logger.info(f"Found corpus in subdirectory: {subdir}")
                # Move files up to main directory
                for item in subdir.glob("*"):
                    if item.is_file():
                        shutil.copy(item, dataset_dir)
                    elif item.is_dir():
                        shutil.copytree(
                            item, dataset_dir / item.name, dirs_exist_ok=True
                        )
                break

    # Verify corpus exists
    if not (dataset_dir / "corpus.jsonl").exists():
        logger.error(f"Could not find corpus.jsonl in {dataset_dir}")
        all_files = list(dataset_dir.glob("**/*"))
        logger.error(f"Found files: {[str(f) for f in all_files]}")
        raise FileNotFoundError(f"corpus.jsonl not found in {dataset_dir}")

    # Convert corpus from JSONL to JSON
    corpus = {}
    with open(dataset_dir / "corpus.jsonl", "r") as f:
        for line in f:
            try:
                item = json.loads(line)
                corpus[item.get("_id")] = item
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding line: {e}")
                continue

    with open(corpus_json_path, "w") as f:
        json.dump(corpus, f)
    logger.info(f"Corpus saved to: {corpus_json_path}")

    # Process queries
    queries = {}
    queries_jsonl = dataset_dir / "queries.jsonl"
    if queries_jsonl.exists():
        with open(queries_jsonl, "r") as f:
            for line in f:
                try:
                    item = json.loads(line)
                    queries[item.get("_id")] = item
                except json.JSONDecodeError:
                    continue

        with open(queries_json_path, "w") as f:
            json.dump(queries, f)
        logger.info(f"Queries saved to: {queries_json_path}")
    else:
        # Try to find queries in TSV format
        for query_file in dataset_dir.glob("queries/*.tsv"):
            with open(query_file, "r") as f:
                for line in f:
                    parts = line.strip().split("\t")
                    if len(parts) >= 2:
                        query_id, query_text = parts[0], parts[1]
                        queries[query_id] = {"_id": query_id, "text": query_text}

            with open(queries_json_path, "w") as f:
                json.dump(queries, f)
            logger.info(f"Queries converted from TSV and saved")
            break

    # Process qrels (relevance judgments)
    qrels = {}
    qrels_dir = dataset_dir / "qrels"
    if qrels_dir.exists() and qrels_dir.is_dir():
        for qrel_file in qrels_dir.glob("*.tsv"):
            with open(qrel_file, "r") as f:
                for line in f:
                    parts = line.strip().split("\t")
                    if len(parts) >= 3:
                        # Skip header row
                        if (
                            parts[0] == "query-id"
                            and parts[1] == "corpus-id"
                            and parts[2] == "score"
                        ):
                            continue
                        query_id, doc_id, score = parts[0], parts[1], float(parts[2])
                        if query_id not in qrels:
                            qrels[query_id] = {}
                        qrels[query_id][doc_id] = score

        if qrels:
            with open(qrels_json_path, "w") as f:
                json.dump(qrels, f)
            logger.info(f"Qrels saved to: {qrels_json_path}")
        else:
            logger.warning("No qrels found")
    else:
        logger.warning(f"No qrels directory found")

    return {
        "corpus_path": str(corpus_json_path),
        "queries_path": str(queries_json_path),
        "qrels_path": str(qrels_json_path),
    }


def main():
    parser = argparse.ArgumentParser(description="Download BEIR dataset")
    parser.add_argument("dataset_name", help="Name of the BEIR dataset to download")
    parser.add_argument("--output-dir", help="Directory to save the dataset")
    args = parser.parse_args()

    download_beir_dataset(args.dataset_name, args.output_dir)


if __name__ == "__main__":
    main()
