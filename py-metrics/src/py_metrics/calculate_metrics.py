from fastapi import FastAPI, HTTPException

# from pydantic import BaseModel
from typing import List, Dict
import uvicorn

from nltk.translate.bleu_score import sentence_bleu


from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
)

from .types.metrics import (
    ClassificationData,
    MetricsPayload,
)

app = FastAPI()


def compute_classification_metrics(
    data: ClassificationData, metrics_to_calculate: List[str]
) -> Dict[str, float]:
    results = {}
    y_true = data.ground_truth
    y_pred = data.predictions
    average = data.average
    pos_label = data.positive_label if average == "binary" else None
    labels = data.labels
    zero_division = data.zero_division

    kwargs = {
        "y_true": y_true,
        "y_pred": y_pred,
        "average": average,
        "labels": labels,
        "zero_division": zero_division,
    }
    if average == "binary" and pos_label is not None:
        kwargs["pos_label"] = pos_label
    elif average != "binary" and "pos_label" in kwargs:
        del kwargs["pos_label"]

    try:
        if "f1" in metrics_to_calculate:
            results["f1"] = f1_score(**kwargs)

        if "recall" in metrics_to_calculate:
            results["recall"] = recall_score(**kwargs)

        if "precision" in metrics_to_calculate:
            results["precision"] = precision_score(**kwargs)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Scikit-learn error: {e}")

    return results


@app.post("/calculate_metrics", response_model=Dict[str, float])
async def calculate_metrics_endpoint(payload: MetricsPayload):
    # Just log the data
    print("Received payload:", payload)

    results = {}
    metrics_requested = set(payload.metrics_to_calculate)

    if "bleu" in metrics_requested and payload.bleu_data:
        try:
            bleu_scores = [
                sentence_bleu(refs[0] if refs else "", pred)
                for pred, refs in zip(
                    payload.bleu_data.predictions, payload.bleu_data.references
                )
            ]
            results["bleu"] = (
                sum(bleu_scores) / len(bleu_scores) if bleu_scores else 0.0
            )
        except IndexError:
            raise HTTPException(
                status_code=400,
                detail="Mismatch between predictions and references list structure for BLEU.",
            )
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
        except HTTPException as e:
            raise e
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


if __name__ == "__main__":
    uvicorn.run("calculate_metrics:app", host="0.0.0.0", port=6969, reload=True)
