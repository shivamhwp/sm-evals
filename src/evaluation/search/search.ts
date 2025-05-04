import { locomoData } from "../../utils/config";
import { searchMemories } from "../../api/supermemory";
import { generateAnswer } from "./searchUtils";
import type { ConversationData } from "../../types/locomo";
import { calculatePrecisionRecall } from "../metrics/precisionRecall";
import { calculateAnswerF1 } from "../metrics/f1";
import { calculateBleu1 } from "../metrics/bleu";
import signale from "../../utils/logger";
import { createMetricsObject, displayAndExportResults } from "../results";
import type { CategoryMetrics } from "../results";
import { getCategoryName, CATEGORY_ID_MAPPING } from "../../utils/getCategory";

async function runSearchEvaluation(targetCategory?: string) {
  // If targetCategory is provided, validate and convert to category ID
  let categoryId: number | undefined;
  let categoryNumber: number | undefined;

  if (targetCategory) {
    categoryId = CATEGORY_ID_MAPPING[targetCategory.toLowerCase()];
    if (!categoryId) {
      signale.error(`Invalid category: ${targetCategory}`);
      signale.info(
        "Available categories: single-hop, multi-hop, open-domain, temporal, adversarial"
      );
      process.exit(1);
    }
    categoryNumber = categoryId;

    signale.info(
      `Running Supermemory search evaluation on Locomo QA for ${getCategoryName(
        categoryId.toString()
      )} questions...`
    );
  } else {
    signale.info(
      "Running Supermemory search evaluation on all Locomo QA questions..."
    );
  }

  signale.info(`Found ${locomoData.length} conversations`);

  const metrics = createMetricsObject();

  const metricsByCategory: Record<string, CategoryMetrics> = {};

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i] as ConversationData;
    signale.info(
      `\nEvaluating conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    if (!conversation.qa || conversation.qa.length === 0) {
      signale.warn("No QA data found, skipping...");
      continue;
    }

    // Log categories for debugging
    if (i === 0) {
      const categories = [...new Set(conversation.qa.map((qa) => qa.category))];
      signale.info(`Found categories in data: ${categories.join(", ")}`);
    }

    // Filter QA items by category if specified
    const qaItems = categoryNumber
      ? conversation.qa.filter((qa) => Number(qa.category) === categoryNumber)
      : conversation.qa;

    if (qaItems.length === 0) {
      signale.info(
        "No questions matching the specified category, skipping conversation..."
      );
      continue;
    }

    signale.info(
      `Found ${qaItems.length} questions${
        categoryNumber
          ? ` in ${getCategoryName(categoryNumber.toString())}`
          : ""
      }`
    );

    for (let j = 0; j < qaItems.length; j++) {
      const qa = qaItems[j];
      const questionIndex = metrics.totalQuestions + 1;
      metrics.totalQuestions++;

      // Get category name
      const categoryName = getCategoryName(qa.category.toString());

      // Initialize category metrics if needed
      if (!metricsByCategory[categoryName]) {
        metricsByCategory[categoryName] = createMetricsObject();
      }

      // Update question count for this category
      metricsByCategory[categoryName].totalQuestions++;

      signale.info(`\n--- Q${questionIndex} ---`);
      signale.info(`Question: ${qa.question}`);
      signale.info(`Category: ${categoryName} (${qa.category})`);
      signale.info(`Ground Truth Answer: ${qa.answer}`);

      //  --------------------------------

      const searchParams = {
        q: qa.question,
        limit: 3,
        filter: { sample_id: conversation.sample_id },
      };

      //  --------------------------------

      const searchResponse = await searchMemories(searchParams);
      const resultContents = searchResponse.results.map(
        (r) => r.chunks[0].content
      );

      // Generate answer using the retrieved content
      const generatedAnswer = await generateAnswer(qa.question, resultContents);
      signale.info(`Generated Answer: ${generatedAnswer}`);

      // Calculate F1 score
      const f1Score = await calculateAnswerF1(generatedAnswer, qa.answer);
      const { precision, recall } = await calculatePrecisionRecall(
        generatedAnswer,
        qa.answer
      );

      // Calculate BLEU-1 score
      const bleu1Score = calculateBleu1(generatedAnswer, qa.answer);

      // Update overall metrics
      metrics.f1Score += f1Score;
      metrics.precision += precision;
      metrics.recall += recall;
      metrics.bleu1Score += bleu1Score;

      // Update category-specific metrics
      metricsByCategory[categoryName].f1Score += f1Score;
      metricsByCategory[categoryName].precision += precision;
      metricsByCategory[categoryName].recall += recall;
      metricsByCategory[categoryName].bleu1Score += bleu1Score;

      // Classify answer quality
      if (f1Score > 0.8) {
        metrics.correctAnswers++;
        metricsByCategory[categoryName].correctAnswers++;
        signale.success("Result: CORRECT");
      } else if (f1Score > 0.3) {
        metrics.partialAnswers++;
        metricsByCategory[categoryName].partialAnswers++;
        signale.warn("Result: PARTIAL");
      } else {
        metrics.incorrectAnswers++;
        metricsByCategory[categoryName].incorrectAnswers++;
        signale.error("Result: INCORRECT");
      }

      signale.info(`F1 Score: ${(f1Score * 100).toFixed(2)}%`);
      signale.info(`BLEU-1 Score: ${(bleu1Score * 100).toFixed(2)}%`);
      signale.info(`Precision: ${(precision * 100).toFixed(2)}%`);
      signale.info(`Recall: ${(recall * 100).toFixed(2)}%`);
      signale.info(`--- End Q${questionIndex} ---`);
    }
  }

  // Display results and export to CSV using the results.ts module
  displayAndExportResults(metricsByCategory);
}

// Get the target category from command line arguments if provided
const targetCategory = process.argv[2];

runSearchEvaluation(targetCategory).catch((error) => {
  signale.error("Error during search evaluation:", error);
  process.exit(1);
});
