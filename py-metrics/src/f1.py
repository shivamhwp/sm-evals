from sklearn.metrics import f1_score
from typing import List, Union


def calculate_f1(
    y_true: List[Union[int, bool]],
    y_pred: List[Union[int, bool]],
    average: str = "binary",
) -> float:
    """
    Calculate F1 score between true and predicted labels.

    Args:
        y_true: List of true labels (1/0 or True/False)
        y_pred: List of predicted labels (1/0 or True/False)
        average: The averaging method ('binary', 'micro', 'macro', 'weighted')

    Returns:
        float: F1 score
    """
    if len(y_true) != len(y_pred):
        raise ValueError("Length of true and predicted labels must be the same")

    if len(y_true) == 0:
        return 0.0

    # Convert boolean values to integers if needed
    y_true_int = [int(label) for label in y_true]
    y_pred_int = [int(label) for label in y_pred]

    return f1_score(y_true_int, y_pred_int, average=average, zero_division=0)
