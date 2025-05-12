import fs from "fs";
import path from "path";
import { env } from "./utils/config";
let datasetName = process.env.DATASET_NAME;

let defaultKValues = [1, 3, 5, 10];
if (env.lgDatasets.includes(datasetName)) {
  console.log("Using default k_values for lg dataset", env.lgKValues);
  defaultKValues = env.lgKValues;
} else if (env.smDatasets.includes(datasetName)) {
  console.log("Using default k_values for sm dataset", env.smKValues);
  defaultKValues = env.smKValues;
}

async function evaluateResultsFromFile(file_path: string, k_values?: number[]) {
  const kValuesToUse = k_values || defaultKValues;

  const response = await fetch(
    `${
      process.env.PYMETRICS_API_URL || "http://0.0.0.0:8000"
    }/beir/evaluate-from-file/${datasetName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_path, k_values: kValuesToUse }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.json();
}

async function main() {
  // Get input parameters from command line
  const args = process.argv.slice(2);

  const resultsFilePath = args[0];

  if (!datasetName) {
    console.error(
      "Error: Dataset name must be provided as an argument or in the DATASET_NAME environment variable"
    );
    process.exit(1);
  }

  // Validate that the file exists
  if (!fs.existsSync(resultsFilePath)) {
    console.error(`Error: Results file not found at ${resultsFilePath}`);
    process.exit(1);
  }

  try {
    console.log(
      `Evaluating results from ${resultsFilePath} with dataset ${datasetName}...`
    );

    // Convert to absolute path
    const absoluteResultsFilePath = path.resolve(resultsFilePath);

    // Call the evaluation API
    const evaluationResults = await evaluateResultsFromFile(
      absoluteResultsFilePath
    );

    // Check if there was an error
    if (evaluationResults.error) {
      console.error(`\nWARNING: ${evaluationResults.error}`);
      console.log(
        "Displaying metrics with zero values due to the error above."
      );
    }
    // Display evaluation results in an ASCII table
    console.log("\nEvaluation Results:");

    const cellWidth = 12;
    const separator = "+";
    const horizontalLine = "-".repeat(cellWidth);

    // Build header row
    let headerSeparator = "";
    let headerRow = "";

    // Create the initial metric column separator
    headerSeparator = separator + horizontalLine;
    headerRow = "| Metric     ";

    // Add each k value to the header
    defaultKValues.forEach(() => {
      headerSeparator += separator + horizontalLine;
    });
    headerSeparator += separator;

    // Add each k value to the header row
    defaultKValues.forEach((k) => {
      headerRow += `| @${k}${" ".repeat(cellWidth - 3 - String(k).length)} `;
    });
    headerRow += "|";

    // Print table header
    console.log(headerSeparator);
    console.log(headerRow);
    console.log(headerSeparator);

    // Helper function to safely access metric values with fallback
    const getMetricValue = (
      metricCategory: string,
      metricKey: string
    ): number => {
      try {
        // Check if metrics structure and categories exist
        if (!evaluationResults?.metrics?.[metricCategory]) {
          return 0;
        }

        // Get the metrics dictionary for the category
        const metricsDict = evaluationResults.metrics[metricCategory];

        // First try the exact key
        if (
          metricsDict[metricKey] !== undefined &&
          metricsDict[metricKey] !== null
        ) {
          return metricsDict[metricKey];
        }

        // If not found, look for any keys that contain the metric key
        // This helps handle various formatting issues
        const possibleKeys = Object.keys(metricsDict).filter((k) =>
          k.includes(metricKey)
        );
        if (possibleKeys.length > 0) {
          return metricsDict[possibleKeys[0]];
        }

        return 0;
      } catch (e) {
        console.error(
          `Error getting metric value for ${metricCategory}.${metricKey}:`,
          e
        );
        return 0;
      }
    };

    // Define metrics to display
    const metrics = [
      { name: "NDCG", category: "ndcg", prefix: "NDCG@" },
      { name: "MAP", category: "map", prefix: "MAP@" },
      { name: "Recall", category: "recall", prefix: "Recall@" },
      { name: "Precision", category: "precision", prefix: "P@" },
    ];

    // Print each metric row
    metrics.forEach((metric) => {
      let row = `| ${metric.name.padEnd(cellWidth - 2)} `;

      // Add value for each k
      defaultKValues.forEach((k) => {
        const value = getMetricValue(metric.category, `${metric.prefix}${k}`);
        row += `| ${value.toFixed(4).padEnd(cellWidth - 2)} `;
      });

      // Close the row
      row += "|";
      console.log(row);
    });

    // Print bottom border
    console.log(headerSeparator);

    // Save evaluation results
    const resultsDir = path.dirname(resultsFilePath);
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const evalResultsPath = path.join(
      resultsDir,
      `eval_${datasetName}_${timestamp}.json`
    );

    fs.writeFileSync(
      evalResultsPath,
      JSON.stringify(evaluationResults, null, 2)
    );

    console.log(`Evaluation results saved to: ${evalResultsPath}`);
  } catch (error) {
    console.error(`Error during evaluation:`, error);
    process.exit(1);
  }
}

// Run the main function
main();
