import {
  getBatchEmbeddings,
  calculateCosineSimilarityFromEmbeddings,
} from "./searchUtils";

// Default threshold for considering semantic similarity as a "match"
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

export interface SimilarityMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  accuracyScore: number;
  similarityScores: number[];
  averageSimilarity: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  threshold: number;
}

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
  const [embedding1, embedding2] = await getBatchEmbeddings([text1, text2]);
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

  // Get embeddings for all answers in two batches (one for generated, one for ground truth)
  console.info("Generating embeddings for semantic similarity calculation...");
  const generatedEmbeddings = await getBatchEmbeddings(generatedAnswers);
  const groundTruthEmbeddings = await getBatchEmbeddings(groundTruthAnswers);

  // Calculate similarity and classification metrics
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  const similarities: number[] = [];

  for (let i = 0; i < generatedAnswers.length; i++) {
    const generated = generatedAnswers[i];
    const groundTruth = groundTruthAnswers[i];
    const genEmbedding = generatedEmbeddings[i];
    const gtEmbedding = groundTruthEmbeddings[i];

    // Check if either answer is the "empty" token representing "no answer found"
    const isGeneratedEmpty = generated.trim() === emptyAnswerToken;
    const isGroundTruthEmpty = groundTruth.trim() === emptyAnswerToken;

    // Handle the case when one or both answers are "empty"
    if (isGroundTruthEmpty) {
      // Ground truth is "no answer"
      if (isGeneratedEmpty) {
        // Correctly identified that there is no answer
        trueNegatives++;
        similarities.push(1.0); // Perfect match for "no answer"
      } else {
        // Incorrectly provided an answer when there should be none
        falsePositives++;
        similarities.push(0.0); // Complete mismatch
      }
    } else {
      // Ground truth is an answer
      if (isGeneratedEmpty) {
        // Failed to provide an answer when one exists
        falseNegatives++;
        similarities.push(0.0); // Complete mismatch
      } else {
        // Both are answers, calculate similarity
        const similarity = calculateCosineSimilarityFromEmbeddings(
          genEmbedding,
          gtEmbedding
        );
        similarities.push(similarity);

        // Determine if it's similar enough to be considered correct
        if (similarity >= threshold) {
          truePositives++;
        } else {
          falseNegatives++;
        }
      }
    }
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
  console.info("\n===== Semantic Similarity Analysis =====");

  for (const threshold of thresholds) {
    console.info(`\n--- Threshold: ${threshold} ---`);
    const metrics = await calculateSemanticMetrics(
      generatedAnswers,
      groundTruthAnswers,
      threshold
    );

    console.info(`Precision: ${(metrics.precision * 100).toFixed(4)}%`);
    console.info(`Recall: ${(metrics.recall * 100).toFixed(4)}%`);
    console.info(`F1 Score: ${(metrics.f1Score * 100).toFixed(4)}%`);
    console.info(`Accuracy: ${(metrics.accuracyScore * 100).toFixed(4)}%`);
    console.info(
      `Average Similarity: ${(metrics.averageSimilarity * 100).toFixed(4)}%`
    );
    console.info(
      `TP: ${metrics.truePositives}, FP: ${metrics.falsePositives}, TN: ${metrics.trueNegatives}, FN: ${metrics.falseNegatives}`
    );
  }

  console.info("\n========================================");
}
