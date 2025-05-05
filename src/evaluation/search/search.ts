import { locomoData } from "../../utils/config";
import { searchMemories } from "../../api/supermemory";
import { generateAnswer } from "./searchUtils";
import type { ConversationData } from "../../types/locomo";
import { createMetricsObject, displayAndExportResults } from "../results";
import type { CategoryMetrics } from "../results";
import { getCategoryName, CATEGORY_ID_MAPPING } from "../../utils/getCategory";
import {
  calculateSemanticSimilarity,
  calculateSemanticMetrics,
} from "./semanticMetrics";

//==================================================
//========== Search Evaluation Configuration =======
//==================================================

const SUPERMEMORY_SEARCH_RESULT_LIMIT = 3;
const SIMILARITY_CORRECT_THRESHOLD = 0.85;
const SIMILARITY_PARTIAL_THRESHOLD = 0.7;

//==================================================

//==================================================
//========== Search Evaluation Function ===========
//==================================================

async function runSearchEvaluation(targetCategory?: string) {
  let categoryId: number | undefined;
  let categoryNumber: number | undefined;

  if (targetCategory) {
    categoryId = CATEGORY_ID_MAPPING[targetCategory.toLowerCase()];
    if (!categoryId) {
      console.error(`Invalid category: ${targetCategory}`);
      console.info(
        "Available categories: single-hop, multi-hop, open-domain, temporal, adversarial"
      );
      process.exit(1);
    }
    categoryNumber = categoryId;

    console.info(
      `Running Supermemory search evaluation on Locomo QA for ${getCategoryName(
        categoryId.toString()
      )} questions...`
    );
  } else {
    console.info(
      "Running Supermemory search evaluation on all Locomo QA questions..."
    );
  }

  console.info(`Found ${locomoData.length} conversations`);

  const metrics = createMetricsObject();
  metrics.semanticCorrect = 0;
  metrics.semanticPartial = 0;
  metrics.semanticIncorrect = 0;
  metrics.averageSimilarity = 0;

  // Set unused metrics to 0 to prevent NaN in reports
  metrics.f1Score = 0;
  metrics.precision = 0;
  metrics.recall = 0;
  metrics.bleu1Score = 0;

  const metricsByCategory: Record<string, CategoryMetrics> = {};

  const allGeneratedAnswers: string[] = [];
  const allGroundTruthAnswers: string[] = [];

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i] as ConversationData;
    console.info(
      `\nEvaluating conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    if (!conversation.qa || conversation.qa.length === 0) {
      console.warn("No QA data found, skipping...");
      continue;
    }

    if (i === 0) {
      const categories = [...new Set(conversation.qa.map((qa) => qa.category))];
      console.info(`Found categories in data: ${categories.join(", ")}`);
    }

    const qaItems = categoryNumber
      ? conversation.qa.filter((qa) => Number(qa.category) === categoryNumber)
      : conversation.qa;

    if (qaItems.length === 0) {
      console.info(
        "No questions matching the specified category, skipping conversation..."
      );
      continue;
    }

    console.info(
      `Found ${qaItems.length} questions${
        categoryNumber
          ? ` in ${getCategoryName(categoryNumber.toString())}`
          : ""
      }`
    );

    // Process each conversation's search queries in a single batch if possible
    for (let j = 0; j < qaItems.length; j++) {
      const qa = qaItems[j];
      const questionIndex = metrics.totalQuestions + 1;
      metrics.totalQuestions++;

      const categoryName = getCategoryName(qa.category.toString());

      // Ensure category metrics object exists
      if (!metricsByCategory[categoryName]) {
        metricsByCategory[categoryName] = createMetricsObject();
        // Since createMetricsObject() initializes all semantic metrics to 0,
        // TypeScript should know they're not undefined, but we'll explicitly assert this
        metricsByCategory[categoryName].semanticCorrect = 0;
        metricsByCategory[categoryName].semanticPartial = 0;
        metricsByCategory[categoryName].semanticIncorrect = 0;
        metricsByCategory[categoryName].averageSimilarity = 0;
      }

      // Safe reference to the category metrics
      const categoryMetrics = metricsByCategory[categoryName];
      categoryMetrics.totalQuestions++;

      console.info(`\n--- Q${questionIndex} ---`);
      console.info(`Question: ${qa.question}`);
      console.info(`Category: ${categoryName} (${qa.category})`);
      console.info(`Ground Truth Answer: ${qa.answer}`);

      const searchParams = {
        q: qa.question,
        limit: SUPERMEMORY_SEARCH_RESULT_LIMIT,
        filter: { sample_id: conversation.sample_id },
      };

      // Only two API calls per question: search and answer generation
      const searchResponse = await searchMemories(searchParams);
      const resultContents = searchResponse.results.map((r) =>
        r.chunks.map((c) => c.content).join("\n")
      );

      const generatedAnswer = await generateAnswer(qa.question, resultContents);
      console.info(`Generated Answer: ${generatedAnswer}`);

      allGeneratedAnswers.push(generatedAnswer);
      allGroundTruthAnswers.push(qa.answer);

      const isExactMatch =
        String(generatedAnswer).trim() === String(qa.answer).trim();
      console.info(`Exact Match: ${isExactMatch}`);

      // Calculate semantic similarity - this is now our primary metric
      // This uses cached embeddings, so no additional API calls are made
      const similarity = await calculateSemanticSimilarity(
        generatedAnswer,
        qa.answer
      );
      console.info(`Semantic Similarity: ${(similarity * 100).toFixed(2)}%`);

      // Update metrics
      metrics.averageSimilarity += similarity;
      categoryMetrics.averageSimilarity! += similarity;

      // Classify answers based on semantic similarity threshold
      if (isExactMatch || similarity >= SIMILARITY_CORRECT_THRESHOLD) {
        metrics.semanticCorrect++;
        metrics.correctAnswers++;
        categoryMetrics.semanticCorrect!++;
        categoryMetrics.correctAnswers++;
        console.log("Result: CORRECT");
      } else if (similarity >= SIMILARITY_PARTIAL_THRESHOLD) {
        metrics.semanticPartial++;
        metrics.partialAnswers++;
        categoryMetrics.semanticPartial!++;
        categoryMetrics.partialAnswers++;
        console.warn("Result: PARTIAL");
      } else {
        metrics.semanticIncorrect++;
        metrics.incorrectAnswers++;
        categoryMetrics.semanticIncorrect!++;
        categoryMetrics.incorrectAnswers++;
        console.error("Result: INCORRECT");
      }

      console.info(`--- End Q${questionIndex} ---`);
    }
  }

  if (allGeneratedAnswers.length > 0) {
    console.info("\n=== Aggregate Semantic Metrics ===");
    // This uses cached embeddings, so no additional API calls
    const semanticMetrics = await calculateSemanticMetrics(
      allGeneratedAnswers,
      allGroundTruthAnswers,
      SIMILARITY_CORRECT_THRESHOLD
    );

    // Use the precision, recall, and F1 scores from semantic metrics
    metrics.precision = semanticMetrics.precision;
    metrics.recall = semanticMetrics.recall;
    metrics.f1Score = semanticMetrics.f1Score;

    console.info(
      `Semantic Precision: ${(semanticMetrics.precision * 100).toFixed(2)}%`
    );
    console.info(
      `Semantic Recall: ${(semanticMetrics.recall * 100).toFixed(2)}%`
    );
    console.info(
      `Semantic F1 Score: ${(semanticMetrics.f1Score * 100).toFixed(2)}%`
    );
    console.info(
      `Average Similarity: ${(semanticMetrics.averageSimilarity * 100).toFixed(
        2
      )}%`
    );
    console.info(`True Positives: ${semanticMetrics.truePositives}`);
    console.info(`False Positives: ${semanticMetrics.falsePositives}`);
    console.info(`True Negatives: ${semanticMetrics.trueNegatives}`);
    console.info(`False Negatives: ${semanticMetrics.falseNegatives}`);
    console.info("=====================================");
  }

  if (metrics.totalQuestions > 0) {
    metrics.averageSimilarity /= metrics.totalQuestions;

    // Use Object.entries to safely access category metrics
    for (const [, categoryMetrics] of Object.entries(metricsByCategory)) {
      if (
        categoryMetrics.totalQuestions > 0 &&
        categoryMetrics.averageSimilarity !== undefined
      ) {
        categoryMetrics.averageSimilarity /= categoryMetrics.totalQuestions;
      }
    }
  }

  displayAndExportResults(metricsByCategory);
}

const targetCategory = process.argv[2];

runSearchEvaluation(targetCategory).catch((error) => {
  console.error("Error during search evaluation:", error);
  process.exit(1);
});
