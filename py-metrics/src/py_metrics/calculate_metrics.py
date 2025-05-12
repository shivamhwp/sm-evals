from typing import List, Dict

from nltk.translate.bleu_score import sentence_bleu

from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
)

from py_metrics.types.metrics import (
    ClassificationData,
    BleuData,
)


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
        raise ValueError(f"Scikit-learn error: {e}")

    return results


def compute_bleu_score(bleu_data: BleuData) -> float:
    try:
        bleu_scores = [
            sentence_bleu(refs[0] if refs else "", pred)
            for pred, refs in zip(bleu_data.predictions, bleu_data.references)
        ]
        return sum(bleu_scores) / len(bleu_scores) if bleu_scores else 0.0
    except IndexError:
        raise ValueError(
            "Mismatch between predictions and references list structure for BLEU."
        )
    except Exception as e:
        raise ValueError(f"Error calculating BLEU: {e}")
