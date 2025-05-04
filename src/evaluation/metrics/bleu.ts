/**
 * BLEU score implementation
 * This is a simple implementation of BLEU-1 (unigram precision)
 */

/**
 * Calculate BLEU-1 score between generated text and ground truth
 * @param generated The generated text
 * @param reference The reference text (ground truth)
 * @returns BLEU-1 score (unigram precision with brevity penalty)
 */
export function calculateBleu1(generated: string, reference: string): number {
  // Tokenize the texts
  const genTokens = String(generated)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const refTokens = String(reference)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (genTokens.length === 0) return 0;

  // Count matched tokens (clipped count)
  let matchCount = 0;
  const refTokenCounts = new Map<string, number>();

  // Count occurrences in reference
  for (const token of refTokens) {
    refTokenCounts.set(token, (refTokenCounts.get(token) || 0) + 1);
  }

  // Count matching tokens (with clipping)
  const genTokenCounts = new Map<string, number>();
  for (const token of genTokens) {
    genTokenCounts.set(token, (genTokenCounts.get(token) || 0) + 1);
  }

  // Calculate clipped counts
  for (const [token, count] of genTokenCounts.entries()) {
    const refCount = refTokenCounts.get(token) || 0;
    matchCount += Math.min(count, refCount);
  }

  // Calculate precision
  const precision = matchCount / genTokens.length;

  // Calculate brevity penalty
  const brevityPenalty =
    genTokens.length >= refTokens.length
      ? 1
      : Math.exp(1 - refTokens.length / genTokens.length);

  // Calculate BLEU-1 score
  return precision * brevityPenalty;
}
