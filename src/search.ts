import { locomoData } from "./utils/config";
import { searchMemories } from "./api/supermemory";
import type { ConversationData } from "./types/locomo";

// Metrics for evaluating search results
interface Metrics {
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  wrongAnswers: number;
  precision: number;
  recall: number;
  f1Score: number;
}

// Function to evaluate search results against ground truth
function evaluateSearchResults(
  results: string[],
  evidence: string[] | undefined
): { precision: number; recall: number; f1Score: number } {
  if (!evidence || evidence.length === 0) {
    return { precision: 0, recall: 0, f1Score: 0 };
  }

  // Count how many of the returned results are in the ground truth evidence
  let correctResultsCount = 0;
  for (const result of results) {
    if (evidence.some((e) => result.includes(e))) {
      correctResultsCount++;
    }
  }

  // Calculate metrics
  const precision =
    results.length > 0 ? correctResultsCount / results.length : 0;
  const recall =
    evidence.length > 0 ? correctResultsCount / evidence.length : 0;
  const f1Score =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return { precision, recall, f1Score };
}

async function runSearchEvaluation() {
  console.log("Running Supermemory search evaluation on Locomo QA...");
  console.log(`Found ${locomoData.length} conversations`);

  const metrics: Metrics = {
    totalQuestions: 0,
    correctAnswers: 0,
    partialAnswers: 0,
    wrongAnswers: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
  };

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i] as ConversationData;
    console.log(
      `\nEvaluating conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    // Skip if no QA data
    if (!conversation.qa || conversation.qa.length === 0) {
      console.log("No QA data found, skipping...");
      continue;
    }

    console.log(`Found ${conversation.qa.length} questions`);

    for (let j = 0; j < conversation.qa.length; j++) {
      const qa = conversation.qa[j];
      metrics.totalQuestions++;

      console.log(`\nQuestion ${j + 1}: ${qa.question}`);
      console.log(`Category: ${qa.category}`);

      // Search memories for the question
      const searchParams = {
        q: qa.question,
        limit: 10,
        filter: { sample_id: conversation.sample_id },
      };

      const searchResponse = await searchMemories(searchParams);

      console.log(`Found ${searchResponse.results.length} results`);

      // Extract result content
      const resultContents = searchResponse.results.map(
        (r) => r.chunks[0].content
      );

      // Evaluate search results
      const { precision, recall, f1Score } = evaluateSearchResults(
        resultContents,
        qa.evidence
      );

      console.log(`Precision: ${precision.toFixed(2)}`);
      console.log(`Recall: ${recall.toFixed(2)}`);
      console.log(`F1 Score: ${f1Score.toFixed(2)}`);

      // Update overall metrics
      metrics.precision += precision;
      metrics.recall += recall;
      metrics.f1Score += f1Score;

      // Classify result quality
      if (f1Score > 0.8) {
        metrics.correctAnswers++;
      } else if (f1Score > 0.3) {
        metrics.partialAnswers++;
      } else {
        metrics.wrongAnswers++;
      }
    }
  }

  // Calculate average metrics
  if (metrics.totalQuestions > 0) {
    metrics.precision /= metrics.totalQuestions;
    metrics.recall /= metrics.totalQuestions;
    metrics.f1Score /= metrics.totalQuestions;
  }

  // Report overall results
  console.log("\n===== EVALUATION RESULTS =====");
  console.log(`Total Questions: ${metrics.totalQuestions}`);
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
    `Wrong Answers: ${metrics.wrongAnswers} (${(
      (metrics.wrongAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  console.log(`Average Precision: ${metrics.precision.toFixed(4)}`);
  console.log(`Average Recall: ${metrics.recall.toFixed(4)}`);
  console.log(`Average F1 Score: ${metrics.f1Score.toFixed(4)}`);
}

runSearchEvaluation().catch((error) => {
  console.error("Error in search evaluation:", error);
  process.exit(1);
});
