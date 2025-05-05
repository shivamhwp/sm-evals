from sklearn.metrics import recall_score
from typing import List, Union


def calculate_recall(
    y_true: List[Union[int, bool]], y_pred: List[Union[int, bool]]
) -> float:
    """
    Calculate recall score between true and predicted labels.

    Args:
        y_true: List of true labels (1/0 or True/False)
        y_pred: List of predicted labels (1/0 or True/False)

    Returns:
        float: Recall score
    """
    if len(y_true) != len(y_pred):
        raise ValueError("Length of true and predicted labels must be the same")

    if len(y_true) == 0:
        return 0.0

    # Convert boolean values to integers if needed
    y_true_int = [int(label) for label in y_true]
    y_pred_int = [int(label) for label in y_pred]

    # Handle case where all true labels are negative
    if sum(y_true_int) == 0:
        return 1.0 if sum(y_pred_int) == 0 else 0.0

    return recall_score(y_true_int, y_pred_int, zero_division=0)
