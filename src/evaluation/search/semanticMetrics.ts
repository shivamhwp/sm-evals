import {
  getBatchEmbeddings,
  calculateCosineSimilarityFromEmbeddings,
} from "./searchUtils";
import { type Embedding } from "ai";
import type { SimilarityMetrics } from "../../types/metrics";
// Default threshold for considering semantic similarity as a "match"
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

// Global embedding cache for this module
const semanticEmbeddingCache = new Map<string, Embedding | null>();

/**
 * Determines if a generated answer can be considered semantically "correct"
 * based on its similarity to the ground truth answer
 */
export async function isSemanticallySimilar(
  generatedAnswer: string,
  groundTruthAnswer: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<{ isSimilar: boolean; similarity: number }> {
  const similarity = await calculateSemanticSimilarity(
    generatedAnswer,
    groundTruthAnswer
  );
  return {
    isSimilar: similarity >= threshold,
    similarity,
  };
}

/**
 * Calculates the semantic similarity between two strings using embeddings
 */
export async function calculateSemanticSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  // Ensure both texts are processed
  const textsToProcess = [];
  if (!semanticEmbeddingCache.has(text1)) {
    textsToProcess.push(text1);
  }
  if (!semanticEmbeddingCache.has(text2)) {
    textsToProcess.push(text2);
  }

  // Get embeddings for any texts not already cached
  if (textsToProcess.length > 0) {
    const embeddings = await getBatchEmbeddings(textsToProcess);
    textsToProcess.forEach((text, index) => {
      if (embeddings[index]) {
        semanticEmbeddingCache.set(text, embeddings[index]);
      }
    });
  }

  // Retrieve embeddings from cache
  const embedding1 = semanticEmbeddingCache.get(text1) || null;
  const embedding2 = semanticEmbeddingCache.get(text2) || null;

  return calculateCosineSimilarityFromEmbeddings(embedding1, embedding2);
}

/**
 * Calculates semantic similarity metrics (precision, recall, F1) for arrays of
 * generated answers and ground truth answers, using embeddings and cosine similarity
 */
export async function calculateSemanticMetrics(
  generatedAnswers: string[],
  groundTruthAnswers: string[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  emptyAnswerToken: string = " " // The token that represents "no answer found"
): Promise<SimilarityMetrics> {
  if (generatedAnswers.length !== groundTruthAnswers.length) {
    throw new Error(
      "Generated answers and ground truth answers must have the same length"
    );
  }

  // Prepare all unique texts for embedding
  const allTexts = new Set<string>();
  generatedAnswers.forEach((text) => allTexts.add(text.trim()));
  groundTruthAnswers.forEach((text) => allTexts.add(text));

  // Get embeddings for all unique texts that aren't already cached
  const textsToProcess = [...allTexts].filter(
    (text) => !semanticEmbeddingCache.has(text)
  );

  if (textsToProcess.length > 0) {
    console.log(
      `Generating embeddings for ${textsToProcess.length} unique texts...`
    );
    const embeddings = await getBatchEmbeddings(textsToProcess);

    textsToProcess.forEach((text, index) => {
      if (embeddings[index]) {
        semanticEmbeddingCache.set(text, embeddings[index]);
      }
    });
  }

  // Process all similarity calculations in parallel
  const similarityCalculations = generatedAnswers.map((_, i) => {
    const generated = generatedAnswers[i].trim();
    const groundTruth = groundTruthAnswers[i];

    const isGeneratedEmpty = generated === emptyAnswerToken;
    const isGroundTruthEmpty = groundTruth === emptyAnswerToken;

    if (isGroundTruthEmpty && isGeneratedEmpty) {
      return {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 1,
        falseNegatives: 0,
        similarity: 1.0,
      };
    }
    if (isGroundTruthEmpty && !isGeneratedEmpty) {
      return {
        truePositives: 0,
        falsePositives: 1,
        trueNegatives: 0,
        falseNegatives: 0,
        similarity: 0.0,
      };
    }
    if (!isGroundTruthEmpty && isGeneratedEmpty) {
      return {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 1,
        similarity: 0.0,
      };
    }

    // Both are answers, calculate similarity using cached embeddings
    const genEmbedding = semanticEmbeddingCache.get(generated) || null;
    const gtEmbedding = semanticEmbeddingCache.get(groundTruth) || null;

    const similarity = calculateCosineSimilarityFromEmbeddings(
      genEmbedding,
      gtEmbedding
    );

    if (similarity >= threshold) {
      return {
        truePositives: 1,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        similarity,
      };
    } else {
      return {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 1,
        similarity,
      };
    }
  });

  // Aggregate the results
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  const similarities: number[] = [];

  for (const result of similarityCalculations) {
    truePositives += result.truePositives;
    falsePositives += result.falsePositives;
    trueNegatives += result.trueNegatives;
    falseNegatives += result.falseNegatives;
    similarities.push(result.similarity);
  }

  // Calculate precision, recall, F1 score
  const precision =
    truePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  const recall =
    truePositives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
  const f1Score =
    precision === 0 || recall === 0
      ? 0
      : (2 * (precision * recall)) / (precision + recall);
  const accuracyScore =
    (truePositives + trueNegatives) /
    (truePositives + trueNegatives + falsePositives + falseNegatives);
  const averageSimilarity =
    similarities.reduce((sum, val) => sum + val, 0) / similarities.length;

  return {
    precision,
    recall,
    f1Score,
    accuracyScore,
    similarityScores: similarities,
    averageSimilarity,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    threshold,
  };
}

/**
 * Analyzes the semantic similarity between generated answers and ground truth answers,
 * printing detailed information to the console
 */
export async function analyzeSemanticSimilarity(
  generatedAnswers: string[],
  groundTruthAnswers: string[],
  thresholds: number[] = [0.7, 0.8, 0.85, 0.9, 0.95]
): Promise<void> {
  console.log("\n===== Semantic Similarity Analysis =====");

  for (const threshold of thresholds) {
    console.log(`\n--- Threshold: ${threshold} ---`);
    const metrics = await calculateSemanticMetrics(
      generatedAnswers,
      groundTruthAnswers,
      threshold
    );

    console.log(`Precision: ${(metrics.precision * 100).toFixed(4)}%`);
    console.log(`Recall: ${(metrics.recall * 100).toFixed(4)}%`);
    console.log(`F1 Score: ${(metrics.f1Score * 100).toFixed(4)}%`);
    console.log(`Accuracy: ${(metrics.accuracyScore * 100).toFixed(4)}%`);
    console.log(
      `Average Similarity: ${(metrics.averageSimilarity * 100).toFixed(4)}%`
    );
    console.log(
      `TP: ${metrics.truePositives}, FP: ${metrics.falsePositives}, TN: ${metrics.trueNegatives}, FN: ${metrics.falseNegatives}`
    );
  }

  console.log("\n========================================");
}
