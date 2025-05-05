from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Union, Optional, Any
import uvicorn
from bleu import calculate_bleu

app = FastAPI()


class TextData(BaseModel):
    predictions: List[str]
    references: List[List[str]]


class ClassificationData(BaseModel):
    predictions: List[Union[str, int, bool]]
    ground_truth: List[Union[str, int, bool]]
    average: str
    positive_label: Optional[Union[str, int, bool]] = None
    labels: Optional[List[Union[str, int, bool]]] = None
    zero_division: Optional[Union[int, str]] = None


class MetricsPayload(BaseModel):
    metrics_to_calculate: List[str]
    text_data: Optional[TextData] = None
    classification_data: Optional[ClassificationData] = None


@app.post("/calculate_metrics")
async def calculate_metrics(payload: MetricsPayload):
    results = {}

    # Calculate text metrics
    if "bleu" in payload.metrics_to_calculate and payload.text_data:
        bleu_scores = []
        for i, pred in enumerate(payload.text_data.predictions):
            # For each prediction, we might have multiple references
            refs = payload.text_data.references[i]
            # For simplicity, we'll use the first reference
            if refs:
                bleu_score = calculate_bleu(refs[0], pred)
                bleu_scores.append(bleu_score)

        if bleu_scores:
            results["bleu"] = sum(bleu_scores) / len(bleu_scores)
        else:
            results["bleu"] = 0.0

    # Classification metrics will be implemented later
    # TODO: Implement f1, recall, precision metrics

    print("Results:", results)
    return results


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6969)
