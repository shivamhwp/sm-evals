import { locomoData } from "../utils/config";
import { searchMemories } from "../api/supermemory";
import { generateAnswer, getCosineSimilarity } from "./utils";
import type { ConversationData } from "../types/locomo";
import { cosineSimilarity, embedMany } from "ai";
import { google } from "@ai-sdk/google";

interface Metrics {
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  f1Score: number;
  precision: number;
  recall: number;
}

async function calculatePrecisionRecall(
  generated: string,
  groundTruth: string
) {
  // Get cosine similarity from utils
  const overallSimilarity = await getCosineSimilarity(generated, groundTruth);

  const genTokensArray = String(generated)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const truthTokensArray = String(groundTruth)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // For exact matching words (e.g., names, dates, numbers)
  const exactMatches = new Set<string>();
  truthTokensArray.forEach((truthToken) => {
    if (genTokensArray.includes(truthToken)) {
      exactMatches.add(truthToken);
    }
  });

  // For fuzzy matching, we'll use the Levenshtein distance for string similarity
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
    return maxLength > 0 ? 1 - distance / maxLength : 1;
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

    // Adjust match threshold based on overall sentence similarity
    // If sentences are very similar, we can be more lenient with token matching
    const adaptiveThreshold = 0.7 + overallSimilarity * 0.1; // 0.7-0.8 range

    if (bestScore > adaptiveThreshold) {
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
    const adaptiveThreshold = 0.7 + overallSimilarity * 0.1;

    if (bestScore > adaptiveThreshold) {
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

async function calculateAnswerF1(generated: string, groundTruth: string) {
  const { precision, recall } = await calculatePrecisionRecall(
    generated,
    groundTruth
  );
  if (precision + recall === 0) return 0;
  return (2 * (precision * recall)) / (precision + recall);
}

async function runSearchEvaluation() {
  console.log("Running Supermemory search evaluation on Locomo QA...");
  console.log(`Found ${locomoData.length} conversations`);

  const metrics = {
    totalQuestions: 0,
    correctAnswers: 0,
    partialAnswers: 0,
    incorrectAnswers: 0,
    f1Score: 0,
    precision: 0,
    recall: 0,
  };

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i] as ConversationData;
    console.log(
      `\nEvaluating conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    if (!conversation.qa || conversation.qa.length === 0) {
      console.log("No QA data found, skipping...");
      continue;
    }

    console.log(`Found ${conversation.qa.length} questions`);

    for (let j = 0; j < conversation.qa.length; j++) {
      const qa = conversation.qa[j];
      const questionIndex = metrics.totalQuestions + 1;
      metrics.totalQuestions++;

      console.log(`\n--- Q${questionIndex} ---`);
      console.log(`Question: ${qa.question}`);
      console.log(`Category: ${qa.category}`);
      console.log(`Ground Truth Answer: ${qa.answer}`);

      const searchParams = {
        q: qa.question,
        limit: 3,
        filter: { sample_id: conversation.sample_id },
      };

      const searchResponse = await searchMemories(searchParams);
      const resultContents = searchResponse.results.map(
        (r) => r.chunks[0].content
      );

      // console.log("Retrieved Content:");
      // resultContents.forEach((content, index) => {
      //   console.log(`  Result ${index + 1}: ${content}`);
      // });

      // Generate answer using the retrieved content
      const generatedAnswer = await generateAnswer(qa.question, resultContents);
      console.log(`Generated Answer: ${generatedAnswer}`);

      // Calculate F1 score
      const f1Score = await calculateAnswerF1(generatedAnswer, qa.answer);
      const { precision, recall } = await calculatePrecisionRecall(
        generatedAnswer,
        qa.answer
      );

      // Update metrics
      metrics.f1Score += f1Score;
      metrics.precision += precision;
      metrics.recall += recall;

      // Classify answer quality
      if (f1Score > 0.8) {
        metrics.correctAnswers++;
        console.log("Result: CORRECT");
      } else if (f1Score > 0.3) {
        metrics.partialAnswers++;
        console.log("Result: PARTIAL");
      } else {
        metrics.incorrectAnswers++;
        console.log("Result: INCORRECT");
      }

      console.log(`F1 Score: ${(f1Score * 100).toFixed(2)}%`);
      console.log(`Precision: ${(precision * 100).toFixed(2)}%`);
      console.log(`Recall: ${(recall * 100).toFixed(2)}%`);
      console.log(`--- End Q${questionIndex} ---`);
    }
  }

  console.log("\n===== FINAL EVALUATION RESULTS =====");
  console.log(`Total Questions Evaluated: ${metrics.totalQuestions}`);
  console.log(
    `Correct Answers: ${metrics.correctAnswers} (${(
      (metrics.correctAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Partial Answers: ${metrics.partialAnswers} (${(
      (metrics.partialAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Incorrect Answers: ${metrics.incorrectAnswers} (${(
      (metrics.incorrectAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Average F1 Score: ${(
      (metrics.f1Score / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  console.log(
    `Average Precision: ${(
      (metrics.precision / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  console.log(
    `Average Recall: ${(
      (metrics.recall / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  console.log("====================================");
}

runSearchEvaluation().catch((error) => {
  console.error("Error during search evaluation:", error);
  process.exit(1);
});
