import { locomoData } from "../../utils/config";
import { searchMemories } from "../../api/supermemory";
import { generateAnswer } from "./searchUtils";
import type { ConversationData } from "../../types/locomo";
import { createMetricsObject, displayAndExportResults } from "../results";
import type { CategoryMetrics } from "../results";
import { getCategoryName, CATEGORY_ID_MAPPING } from "../../utils/getCategory";
import { calculateSemanticMetrics } from "./semanticMetrics";
import type { QAItem, CategoryResult, SearchParams } from "../../types/metrics";

//==================================================
//========== Search Evaluation Configuration =======
//==================================================

const SUPERMEMORY_SEARCH_RESULT_LIMIT = 4;
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
      console.log(
        "Available categories: single-hop, multi-hop, open-domain, temporal, adversarial"
      );
      process.exit(1);
    }
    categoryNumber = categoryId;

    console.log(
      `Running Supermemory search evaluation on Locomo QA for ${getCategoryName(
        categoryId.toString()
      )} questions...`
    );
  } else {
    console.log(
      "Running Supermemory search evaluation on all Locomo QA questions..."
    );
  }

  console.log(`Found ${locomoData.length} conversations`);

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

  /**
   * Process a batch of questions and generate answers, then evaluate against ground truth
   */
  async function processQuestionBatch(
    batch: QAItem[],
    searchParams: SearchParams,
    categoryResults: Record<string, CategoryResult>
  ) {
    // Pre-process all questions in the batch at once
    const questions = batch.map((qa) => qa.question);
    const groundTruths = batch.map((qa) => qa.answer);

    // Process searches and answer generation in parallel (these API calls can't be batched)
    const batchPromises = batch.map(async (qa, batchIndex) => {
      const categoryName = getCategoryName(qa.category.toString());

      // Initialize category results if needed
      if (!categoryResults[categoryName]) {
        categoryResults[categoryName] = {
          questionCount: 0,
          correctAnswers: 0,
          partialAnswers: 0,
          incorrectAnswers: 0,
          semanticCorrect: 0,
          semanticPartial: 0,
          semanticIncorrect: 0,
          totalSimilarity: 0,
        };
      }

      categoryResults[categoryName].questionCount++;

      try {
        const currentParams = { ...searchParams, q: qa.question };
        const searchResponse = await searchMemories(currentParams);
        const resultContents = searchResponse.results.map((r) =>
          r.chunks.map((c) => c.content).join("\n")
        );

        const generatedAnswer = await generateAnswer(
          qa.question,
          resultContents
        );

        const isExactMatch =
          String(generatedAnswer).trim() === String(qa.answer).trim();

        return {
          success: true,
          categoryName,
          generatedAnswer,
          groundTruthAnswer: qa.answer,
          isExactMatch,
        };
      } catch (error) {
        console.error(`Error processing question:`, error);
        return {
          success: false,
          categoryName,
          generatedAnswer: "",
          groundTruthAnswer: qa.answer,
          isExactMatch: false,
        };
      }
    });

    const results = await Promise.all(batchPromises);

    // Extract answers from results
    const generatedAnswers = results.map((r) => r.generatedAnswer);
    const groundTruthAnswers = results.map((r) => r.groundTruthAnswer);

    // Generate all embeddings in a single batch using calculateSemanticMetrics
    // This is more efficient than calculating one by one
    const batchMetrics = await calculateSemanticMetrics(
      generatedAnswers,
      groundTruthAnswers,
      SIMILARITY_CORRECT_THRESHOLD
    );

    // Process results
    results.forEach((result, i) => {
      if (!result.success) return;

      const { categoryName, isExactMatch } = result;
      const similarity = batchMetrics.similarityScores[i];

      console.log(`Question: ${batch[i].question}`);
      console.log(`Category: ${categoryName} (${batch[i].category})`);
      console.log(`Ground Truth Answer: ${groundTruthAnswers[i]}`);
      console.log(`Generated Answer: ${generatedAnswers[i]}`);
      console.log(`Exact Match: ${isExactMatch}`);
      console.log(`Semantic Similarity: ${(similarity * 100).toFixed(2)}%`);

      // Track total similarity for averaging later
      categoryResults[categoryName].totalSimilarity += similarity;

      // Classify answers based on semantic similarity threshold
      if (isExactMatch || similarity >= SIMILARITY_CORRECT_THRESHOLD) {
        categoryResults[categoryName].correctAnswers++;
        categoryResults[categoryName].semanticCorrect++;
        console.log("Result: CORRECT");
      } else if (similarity >= SIMILARITY_PARTIAL_THRESHOLD) {
        categoryResults[categoryName].partialAnswers++;
        categoryResults[categoryName].semanticPartial++;
        console.warn("Result: PARTIAL");
      } else {
        categoryResults[categoryName].incorrectAnswers++;
        categoryResults[categoryName].semanticIncorrect++;
        console.error("Result: INCORRECT");
      }
    });

    return {
      generatedAnswers,
      groundTruthAnswers,
      questionCount: results.filter((r) => r.success).length,
    };
  }

  async function processConversation(i: number) {
    const conversation = locomoData[i] as ConversationData;
    console.log(
      `\nProcessing Conversation ${i + 1}: ${conversation.sample_id}`
    );

    const qaItems = conversation.qa || [];
    if (qaItems.length === 0) {
      console.log("No QA items found for this conversation");
      return {
        generatedAnswers: [] as string[],
        groundTruthAnswers: [] as string[],
        questionCount: 0,
        totalSimilarity: 0,
        categoryResults: {} as Record<string, CategoryResult>,
      };
    }

    console.log(`Found ${qaItems.length} QA items`);

    let questionCount = 0;
    const conversationGeneratedAnswers: string[] = [];
    const conversationGroundTruthAnswers: string[] = [];
    const categoryResults: Record<string, CategoryResult> = {};

    const searchParams: SearchParams = {
      limit: SUPERMEMORY_SEARCH_RESULT_LIMIT,
      filter: { sample_id: conversation.sample_id },
    };

    // Process questions in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let j = 0; j < qaItems.length; j += BATCH_SIZE) {
      const batch = qaItems.slice(j, j + BATCH_SIZE);

      console.log(
        `\n--- Processing Batch ${Math.floor(j / BATCH_SIZE) + 1} ---`
      );

      const batchResults = await processQuestionBatch(
        batch,
        searchParams,
        categoryResults
      );

      conversationGeneratedAnswers.push(...batchResults.generatedAnswers);
      conversationGroundTruthAnswers.push(...batchResults.groundTruthAnswers);
      questionCount += batchResults.questionCount;
    }

    const totalSimilarity = Object.values(categoryResults).reduce(
      (sum, cat) => sum + cat.totalSimilarity,
      0
    );

    return {
      generatedAnswers: conversationGeneratedAnswers,
      groundTruthAnswers: conversationGroundTruthAnswers,
      questionCount,
      totalSimilarity,
      categoryResults,
    };
  }

  // Process conversations in batches of 10 to avoid overwhelming the backend
  const CONVERSATION_BATCH_SIZE = 10;
  for (let i = 0; i < locomoData.length; i += CONVERSATION_BATCH_SIZE) {
    const batchIndices = Array.from(
      { length: Math.min(CONVERSATION_BATCH_SIZE, locomoData.length - i) },
      (_, j) => i + j
    );

    console.log(
      `\nProcessing conversation batch ${
        i / CONVERSATION_BATCH_SIZE + 1
      }/${Math.ceil(locomoData.length / CONVERSATION_BATCH_SIZE)}`
    );

    // Process the current batch of conversations in parallel
    const batchPromises = batchIndices.map(processConversation);
    const batchResults = await Promise.all(batchPromises);

    // Aggregate results from this batch
    for (const result of batchResults) {
      allGeneratedAnswers.push(...result.generatedAnswers);
      allGroundTruthAnswers.push(...result.groundTruthAnswers);
      metrics.totalQuestions += result.questionCount;
      metrics.averageSimilarity += result.totalSimilarity;

      // Merge category results
      for (const [categoryName, categoryResult] of Object.entries(
        result.categoryResults
      )) {
        if (!metricsByCategory[categoryName]) {
          metricsByCategory[categoryName] = createMetricsObject();
          metricsByCategory[categoryName].semanticCorrect = 0;
          metricsByCategory[categoryName].semanticPartial = 0;
          metricsByCategory[categoryName].semanticIncorrect = 0;
          metricsByCategory[categoryName].averageSimilarity = 0;
        }

        metricsByCategory[categoryName].totalQuestions +=
          categoryResult.questionCount;
        metricsByCategory[categoryName].correctAnswers +=
          categoryResult.correctAnswers;
        metricsByCategory[categoryName].partialAnswers +=
          categoryResult.partialAnswers;
        metricsByCategory[categoryName].incorrectAnswers +=
          categoryResult.incorrectAnswers;
        metricsByCategory[categoryName].semanticCorrect! +=
          categoryResult.semanticCorrect;
        metricsByCategory[categoryName].semanticPartial! +=
          categoryResult.semanticPartial;
        metricsByCategory[categoryName].semanticIncorrect! +=
          categoryResult.semanticIncorrect;
        metricsByCategory[categoryName].averageSimilarity! +=
          categoryResult.totalSimilarity;

        // Update global metrics
        metrics.correctAnswers += categoryResult.correctAnswers;
        metrics.partialAnswers += categoryResult.partialAnswers;
        metrics.incorrectAnswers += categoryResult.incorrectAnswers;
        metrics.semanticCorrect += categoryResult.semanticCorrect;
        metrics.semanticPartial += categoryResult.semanticPartial;
        metrics.semanticIncorrect += categoryResult.semanticIncorrect;
      }
    }
  }

  if (allGeneratedAnswers.length > 0) {
    console.log("\n=== Aggregate Semantic Metrics ===");
    // Using the cached embeddings is very efficient now, no redundant API calls
    const semanticMetrics = await calculateSemanticMetrics(
      allGeneratedAnswers,
      allGroundTruthAnswers,
      SIMILARITY_CORRECT_THRESHOLD
    );

    // Use the precision, recall, and F1 scores from semantic metrics
    metrics.precision = semanticMetrics.precision;
    metrics.recall = semanticMetrics.recall;
    metrics.f1Score = semanticMetrics.f1Score;

    console.log(
      `Semantic Precision: ${(semanticMetrics.precision * 100).toFixed(2)}%`
    );
    console.log(
      `Semantic Recall: ${(semanticMetrics.recall * 100).toFixed(2)}%`
    );
    console.log(
      `Semantic F1 Score: ${(semanticMetrics.f1Score * 100).toFixed(2)}%`
    );
    console.log(
      `Average Similarity: ${(semanticMetrics.averageSimilarity * 100).toFixed(
        2
      )}%`
    );
    console.log(`True Positives: ${semanticMetrics.truePositives}`);
    console.log(`False Positives: ${semanticMetrics.falsePositives}`);
    console.log(`True Negatives: ${semanticMetrics.trueNegatives}`);
    console.log(`False Negatives: ${semanticMetrics.falseNegatives}`);
    console.log("=====================================");
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
