import signale from "../utils/logger";
import fs from "fs";
import path from "path";

// Category metrics interface - matches the interface in search.ts
export interface CategoryMetrics {
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  f1Score: number;
  precision: number;
  recall: number;
  bleu1Score: number;
}

/**
 * Display overall metrics in the terminal
 */
export function displayOverallMetrics(metrics: CategoryMetrics): void {
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
    `Average BLEU-1 Score: ${(
      (metrics.bleu1Score / metrics.totalQuestions) *
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
}

/**
 * Display metrics by category in the terminal
 */
export function displayCategoryMetrics(
  metricsByCategory: Record<string, CategoryMetrics>
): void {
  signale.info("\n===== RESULTS BY QUESTION TYPE =====");
  Object.entries(metricsByCategory).forEach(([category, categoryMetrics]) => {
    const count = categoryMetrics.totalQuestions;
    if (count === 0) return; // Skip categories with no questions

    signale.info(`\n--- ${category} (${count} questions) ---`);
    signale.info(
      `Correct Answers: ${categoryMetrics.correctAnswers} (${(
        (categoryMetrics.correctAnswers / count) *
        100
      ).toFixed(2)}%)`
    );
    signale.info(
      `Partial Answers: ${categoryMetrics.partialAnswers} (${(
        (categoryMetrics.partialAnswers / count) *
        100
      ).toFixed(2)}%)`
    );
    signale.info(
      `Incorrect Answers: ${categoryMetrics.incorrectAnswers} (${(
        (categoryMetrics.incorrectAnswers / count) *
        100
      ).toFixed(2)}%)`
    );
    signale.info(
      `Average F1 Score: ${((categoryMetrics.f1Score / count) * 100).toFixed(
        2
      )}%`
    );
    signale.info(
      `Average BLEU-1 Score: ${(
        (categoryMetrics.bleu1Score / count) *
        100
      ).toFixed(2)}%`
    );
    signale.info(
      `Average Precision: ${((categoryMetrics.precision / count) * 100).toFixed(
        2
      )}%`
    );
    signale.info(
      `Average Recall: ${((categoryMetrics.recall / count) * 100).toFixed(2)}%`
    );
  });
}

/**
 * Export metrics to CSV file
 */
export function exportMetricsToCSV(
  metricsByCategory: Record<string, CategoryMetrics>,
  outputPath: string
): void {
  const headers = [
    "Question Type",
    "Total Questions",
    "F1 Score",
    "BLEU-1 Score",
    "Precision",
    "Recall",
    "Correct Answers (%)",
    "Partial Answers (%)",
    "Incorrect Answers (%)",
  ];

  const rows = Object.entries(metricsByCategory)
    .map(([category, metrics]) => {
      const count = metrics.totalQuestions;
      if (count === 0) return null;

      return [
        category,
        count,
        ((metrics.f1Score / count) * 100).toFixed(2),
        ((metrics.bleu1Score / count) * 100).toFixed(2),
        ((metrics.precision / count) * 100).toFixed(2),
        ((metrics.recall / count) * 100).toFixed(2),
        ((metrics.correctAnswers / count) * 100).toFixed(2),
        ((metrics.partialAnswers / count) * 100).toFixed(2),
        ((metrics.incorrectAnswers / count) * 100).toFixed(2),
      ];
    })
    .filter(Boolean); // Remove nulls for empty categories

  // Add an "Overall" row
  const overallMetrics = Object.values(metricsByCategory).reduce(
    (acc, metrics) => {
      acc.totalQuestions += metrics.totalQuestions;
      acc.f1Score += metrics.f1Score;
      acc.bleu1Score += metrics.bleu1Score;
      acc.precision += metrics.precision;
      acc.recall += metrics.recall;
      acc.correctAnswers += metrics.correctAnswers;
      acc.partialAnswers += metrics.partialAnswers;
      acc.incorrectAnswers += metrics.incorrectAnswers;
      return acc;
    },
    createMetricsObject()
  );

  if (overallMetrics.totalQuestions > 0) {
    rows.push([
      "Overall",
      overallMetrics.totalQuestions,
      ((overallMetrics.f1Score / overallMetrics.totalQuestions) * 100).toFixed(
        2
      ),
      (
        (overallMetrics.bleu1Score / overallMetrics.totalQuestions) *
        100
      ).toFixed(2),
      (
        (overallMetrics.precision / overallMetrics.totalQuestions) *
        100
      ).toFixed(2),
      ((overallMetrics.recall / overallMetrics.totalQuestions) * 100).toFixed(
        2
      ),
      (
        (overallMetrics.correctAnswers / overallMetrics.totalQuestions) *
        100
      ).toFixed(2),
      (
        (overallMetrics.partialAnswers / overallMetrics.totalQuestions) *
        100
      ).toFixed(2),
      (
        (overallMetrics.incorrectAnswers / overallMetrics.totalQuestions) *
        100
      ).toFixed(2),
    ]);
  }

  // Format as CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => (row as string[]).join(",")),
  ].join("\n");

  // Ensure directory exists
  const directory = path.dirname(outputPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputPath, csvContent);
  signale.info(`Metrics exported to ${outputPath}`);
}

/**
 * Create a new metrics object
 */
export function createMetricsObject(): CategoryMetrics {
  return {
    totalQuestions: 0,
    correctAnswers: 0,
    partialAnswers: 0,
    incorrectAnswers: 0,
    f1Score: 0,
    precision: 0,
    recall: 0,
    bleu1Score: 0,
  };
}

/**
 * Display all results and export to CSV
 */
export function displayAndExportResults(
  metricsByCategory: Record<string, CategoryMetrics>
): void {
  // Calculate overall metrics
  const overallMetrics = Object.values(metricsByCategory).reduce(
    (acc, metrics) => {
      acc.totalQuestions += metrics.totalQuestions;
      acc.f1Score += metrics.f1Score;
      acc.bleu1Score += metrics.bleu1Score;
      acc.precision += metrics.precision;
      acc.recall += metrics.recall;
      acc.correctAnswers += metrics.correctAnswers;
      acc.partialAnswers += metrics.partialAnswers;
      acc.incorrectAnswers += metrics.incorrectAnswers;
      return acc;
    },
    createMetricsObject()
  );

  // Display results
  displayOverallMetrics(overallMetrics);
  displayCategoryMetrics(metricsByCategory);

  // Export to CSV
  const outputPath = path.join(
    process.cwd(),
    "results",
    "metrics_by_category.csv"
  );
  exportMetricsToCSV(metricsByCategory, outputPath);

  signale.info("====================================");
}
