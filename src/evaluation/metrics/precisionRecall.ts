export async function calculatePrecisionRecall(
  generated: string | number,
  groundTruth: string | number,
  similarityScore: number
): Promise<{ precision: number; recall: number }> {
  const overallSimilarity = similarityScore;

  const genTokensArray = String(generated)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const truthTokensArray = String(groundTruth)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (genTokensArray.length === 0 && truthTokensArray.length === 0) {
    return { precision: 1, recall: 1 };
  }
  if (genTokensArray.length === 0) {
    return { precision: 1, recall: 0 };
  }
  if (truthTokensArray.length === 0) {
    return { precision: 0, recall: 1 };
  }

  // if words are exactly same then let's fking go
  const exactMatches = new Set<string>();
  truthTokensArray.forEach((truthToken) => {
    if (genTokensArray.includes(truthToken)) {
      exactMatches.add(truthToken);
    }
  });

  function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  function normalizedLevenshtein(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    // Return similarity score (1 - normalized distance)
    return maxLength > 0 ? 1 - distance / maxLength : a === b ? 1 : 0; // Handle 0 length case
  }

  // Count token-level precision
  let genMatches = 0;
  for (const genToken of genTokensArray) {
    // Skip if already exact match
    if (exactMatches.has(genToken)) {
      genMatches++;
      continue;
    }

    // Look for fuzzy matches
    let bestScore = 0;
    for (const truthToken of truthTokensArray) {
      if (exactMatches.has(truthToken)) continue; // Skip tokens that already matched exactly

      const score = normalizedLevenshtein(genToken, truthToken);
      bestScore = Math.max(bestScore, score);
    }

    const adaptiveThreshold = Math.max(
      0.7,
      Math.min(0.8, 0.7 + overallSimilarity * 0.1)
    );
    if (bestScore >= adaptiveThreshold) {
      genMatches++;
    }
  }

  // Count token-level recall
  let truthMatches = 0;
  for (const truthToken of truthTokensArray) {
    // Skip if already exact match
    if (exactMatches.has(truthToken)) {
      truthMatches++;
      continue;
    }

    // Look for fuzzy matches
    let bestScore = 0;
    for (const genToken of genTokensArray) {
      if (exactMatches.has(genToken)) continue; // Skip tokens that already matched exactly

      const score = normalizedLevenshtein(truthToken, genToken);
      bestScore = Math.max(bestScore, score);
    }

    // Use same adaptive threshold
    const adaptiveThreshold = Math.max(
      0.7,
      Math.min(0.8, 0.7 + overallSimilarity * 0.1)
    );

    if (bestScore >= adaptiveThreshold) {
      truthMatches++;
    }
  }

  // Calculate final precision and recall
  const precision =
    genTokensArray.length > 0 ? genMatches / genTokensArray.length : 0;
  const recall =
    truthTokensArray.length > 0 ? truthMatches / truthTokensArray.length : 0;

  return { precision, recall };
}
