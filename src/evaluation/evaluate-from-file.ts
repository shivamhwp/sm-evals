import fs from "fs";
import path from "path";

async function evaluateResultsFromFile(
  dataset_name: string,
  file_path: string,
  k_values?: number[]
) {
  const response = await fetch(
    `${
      process.env.PYMETRICS_API_URL || "http://0.0.0.0:8000"
    }/beir/evaluate-from-file/${dataset_name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_path, k_values }),
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

  if (args.length < 2) {
    console.error(
      "Error: Please provide both a results file path and a dataset name"
    );
    console.log(
      "Usage: bun run src/evaluation/evaluate-from-file.ts <results_file_path> <dataset_name>"
    );
    console.log(
      "Example: bun run src/evaluation/evaluate-from-file.ts ./results/search_results_scifact_123.json scifact"
    );
    process.exit(1);
  }

  const resultsFilePath = args[0];
  const datasetName = args[1];

  // Optional: parse k_values if provided
  let k_values: number[] | undefined;
  if (args.length > 2) {
    try {
      k_values = JSON.parse(args[2]);
      if (!Array.isArray(k_values) || !k_values.every(Number.isInteger)) {
        console.error("Error: k_values must be an array of integers");
        process.exit(1);
      }
    } catch (e) {
      console.error("Error parsing k_values:", e);
      process.exit(1);
    }
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
      datasetName,
      absoluteResultsFilePath,
      k_values
    );

    // Check if there was an error
    if (evaluationResults.error) {
      console.error(`\nWARNING: ${evaluationResults.error}`);
      console.log(
        "Displaying metrics with zero values due to the error above."
      );
    }

    // Display evaluation results in ASCII table
    console.log("\nEvaluation Results:");
    console.log("┌──────────┬──────────┬──────────┬──────────┐");
    console.log("│ Metric   │    @1    │    @3    │    @5    │");
    console.log("├──────────┼──────────┼──────────┼──────────┤");

    // Create helper function to safely access metric values with fallback
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

    // Use the helper function to safely access metrics
    console.log(
      `│ NDCG     │  ${getMetricValue("ndcg", "NDCG@1")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("ndcg", "NDCG@3")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("ndcg", "NDCG@5")
        .toFixed(4)
        .padStart(6)}  │`
    );
    console.log(
      `│ MAP      │  ${getMetricValue("map", "MAP@1")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("map", "MAP@3")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("map", "MAP@5")
        .toFixed(4)
        .padStart(6)}  │`
    );
    console.log(
      `│ Recall   │  ${getMetricValue("recall", "Recall@1")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("recall", "Recall@3")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("recall", "Recall@5")
        .toFixed(4)
        .padStart(6)}  │`
    );
    console.log(
      `│ Precision│  ${getMetricValue("precision", "P@1")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("precision", "P@3")
        .toFixed(4)
        .padStart(6)}  │  ${getMetricValue("precision", "P@5")
        .toFixed(4)
        .padStart(6)}  │`
    );
    console.log("└──────────┴──────────┴──────────┴──────────┘");

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
