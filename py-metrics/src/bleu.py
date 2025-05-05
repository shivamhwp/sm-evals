import numpy as np
from sklearn.metrics import accuracy_score
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction


def calculate_bleu(reference, candidate, weights=(0.25, 0.25, 0.25, 0.25)):
    """
    Calculate BLEU score between reference and candidate texts.

    Args:
        reference (str): The reference text (ground truth)
        candidate (str): The generated text to evaluate
        weights (tuple): Weights for unigrams, bigrams, trigrams, and 4-grams
                         Default is (0.25, 0.25, 0.25, 0.25) for BLEU-4

    Returns:
        float: BLEU score
    """
    if not candidate:
        return 0.0

    # Tokenize the texts
    reference_tokens = reference.lower().split()
    candidate_tokens = candidate.lower().split()

    if not candidate_tokens:
        return 0.0

    # NLTK's BLEU implementation expects a list of references
    references = [reference_tokens]

    # Use smoothing to avoid 0 scores when there are no n-gram matches
    smoothing = SmoothingFunction().method1

    # Calculate BLEU score
    score = sentence_bleu(
        references, candidate_tokens, weights=weights, smoothing_function=smoothing
    )

    return score


def calculate_bleu1(reference, candidate):
    """
    Calculate BLEU-1 score (unigram precision with brevity penalty)

    Args:
        reference (str): The reference text (ground truth)
        candidate (str): The generated text to evaluate

    Returns:
        float: BLEU-1 score
    """
    return calculate_bleu(reference, candidate, weights=(1.0, 0, 0, 0))


def calculate_bleu4(reference, candidate):
    """
    Calculate BLEU-4 score (default weights for 1-4 grams)

    Args:
        reference (str): The reference text (ground truth)
        candidate (str): The generated text to evaluate

    Returns:
        float: BLEU-4 score
    """
    return calculate_bleu(reference, candidate)
