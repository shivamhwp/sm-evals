from pydantic import BaseModel, field_validator
from typing import List, Union, Optional, Literal


# Mirroring ClassificationAverageStrategy
ClassificationAverageStrategy = Literal[
    "binary", "micro", "macro", "weighted", "samples"
]
ZeroDivisionStrategy = Literal[0, 1, "warn"]


class BleuData(BaseModel):
    """Data required for BLEU score calculation"""

    predictions: List[str]
    references: List[List[str]]

    @field_validator("references")
    def check_references_length(cls, v, values):
        if "predictions" in values.data and len(v) != len(values.data["predictions"]):
            raise ValueError("Length of references must match length of predictions")
        return v


class ClassificationData(BaseModel):
    """Data required for classification metrics (F1, Precision, Recall)"""

    predictions: List[Union[str, int, bool]]
    ground_truth: List[Union[str, int, bool]]
    average: ClassificationAverageStrategy
    positive_label: Optional[Union[str, int, bool]] = None
    labels: Optional[List[Union[str, int, bool]]] = None
    # Allow 0, 1, or 'warn' matching scikit-learn's zero_division
    zero_division: ZeroDivisionStrategy = 0

    @field_validator("ground_truth")
    def check_lengths_match(cls, v, values):
        if "predictions" in values.data and len(v) != len(values.data["predictions"]):
            raise ValueError("Length of ground_truth must match length of predictions")
        return v

    @field_validator("positive_label")
    def check_positive_label_needed(cls, v, values):
        if (
            "average" in values.data
            and values.data["average"] == "binary"
            and v is None
        ):
            raise ValueError("positive_label is required when average='binary'")
        return v


class MetricsPayload(BaseModel):
    """Main payload structure mirroring TypeScript"""

    metrics_to_calculate: List[str]
    bleu_data: Optional[BleuData] = None
    classification_data: Optional[ClassificationData] = None

    @field_validator("bleu_data")
    def check_bleu_data_present(cls, v, values):
        if (
            "metrics_to_calculate" in values.data
            and "bleu" in values.data["metrics_to_calculate"]
            and v is None
        ):
            raise ValueError(
                "bleu_data is required when 'bleu' is in metrics_to_calculate"
            )
        return v

    @field_validator("classification_data")
    def check_classification_data_present(cls, v, values):
        requested_classification = any(
            metric in values.data.get("metrics_to_calculate", [])
            for metric in ["f1", "recall", "precision"]
        )
        if requested_classification and v is None:
            raise ValueError(
                "classification_data is required when 'f1', 'recall', or 'precision' are in metrics_to_calculate"
            )
        return v
