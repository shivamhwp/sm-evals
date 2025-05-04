import { locomoData } from "../../utils/config";
import { searchMemories } from "../../api/supermemory";
import { generateAnswer } from "./searchUtils";
import type { ConversationData } from "../../types/locomo";
import { calculatePrecisionRecall } from "../metrics/precisionRecall";
import { calculateAnswerF1 } from "../metrics/f1";
import signale from "../../utils/logger";

async function runSearchEvaluation() {
  signale.info("Running Supermemory search evaluation on Locomo QA...");
  signale.info(`Found ${locomoData.length} conversations`);

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
    signale.info(
      `\nEvaluating conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    if (!conversation.qa || conversation.qa.length === 0) {
      signale.warn("No QA data found, skipping...");
      continue;
    }

    signale.info(`Found ${conversation.qa.length} questions`);

    for (let j = 0; j < conversation.qa.length; j++) {
      const qa = conversation.qa[j];
      const questionIndex = metrics.totalQuestions + 1;
      metrics.totalQuestions++;

      signale.info(`\n--- Q${questionIndex} ---`);
      signale.info(`Question: ${qa.question}`);
      signale.info(`Category: ${qa.category}`);
      signale.info(`Ground Truth Answer: ${qa.answer}`);

      const searchParams = {
        q: qa.question,
        limit: 3,
        filter: { sample_id: conversation.sample_id },
      };

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

      // Update metrics
      metrics.f1Score += f1Score;
      metrics.precision += precision;
      metrics.recall += recall;

      // Classify answer quality
      if (f1Score > 0.8) {
        metrics.correctAnswers++;
        signale.success("Result: CORRECT");
      } else if (f1Score > 0.3) {
        metrics.partialAnswers++;
        signale.warn("Result: PARTIAL");
      } else {
        metrics.incorrectAnswers++;
        signale.error("Result: INCORRECT");
      }

      signale.info(`F1 Score: ${(f1Score * 100).toFixed(2)}%`);
      signale.info(`Precision: ${(precision * 100).toFixed(2)}%`);
      signale.info(`Recall: ${(recall * 100).toFixed(2)}%`);
      signale.info(`--- End Q${questionIndex} ---`);
    }
  }

  signale.info("\n===== FINAL EVALUATION RESULTS =====");
  signale.info(`Total Questions Evaluated: ${metrics.totalQuestions}`);
  signale.info(
    `Correct Answers: ${metrics.correctAnswers} (${(
      (metrics.correctAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  signale.info(
    `Partial Answers: ${metrics.partialAnswers} (${(
      (metrics.partialAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  signale.info(
    `Incorrect Answers: ${metrics.incorrectAnswers} (${(
      (metrics.incorrectAnswers / metrics.totalQuestions) *
      100
    ).toFixed(2)}%)`
  );
  signale.info(
    `Average F1 Score: ${(
      (metrics.f1Score / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  signale.info(
    `Average Precision: ${(
      (metrics.precision / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  signale.info(
    `Average Recall: ${(
      (metrics.recall / metrics.totalQuestions) *
      100
    ).toFixed(2)}%`
  );
  signale.info("====================================");
}

runSearchEvaluation().catch((error) => {
  signale.error("Error during search evaluation:", error);
  process.exit(1);
});
