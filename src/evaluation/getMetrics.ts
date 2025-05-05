import { type MetricsServicePayload, type MetricName } from "../types/send";

/**
 * Sends metrics data to the Python metrics server
 * @param payload The metrics payload to send
 * @returns The metrics results from the server
 */

const metricsServerUrl = "http://0.0.0.0:6969/calculate_metrics";

/**
 * Creates a metrics payload for the Python metrics server
 * @param generatedAnswers Array of generated answers
 * @param groundTruthAnswers Array of ground truth answers
 * @returns The metrics payload to send to the server
 */
export function createMetricsPayload(
  generatedAnswers: string[],
  groundTruthAnswers: string[]
): MetricsServicePayload {
  return {
    // metrics_to_calculate: ["bleu", "f1", "recall", "precision"],
    metrics_to_calculate: ["bleu"],
    bleu_data: {
      predictions: generatedAnswers,
      references: groundTruthAnswers.map((answer) => [answer]), // Each reference needs to be in an array
    },

    classification_data: undefined,
    // not needed for bleu and in our case
    // classification_data: {
    //   predictions: generatedAnswers.map(String), // Ensure predictions are strings
    //   ground_truth: groundTruthAnswers.map(String), // Ensure ground truth are strings
    // average: "bleu",
    //   zero_division: 0, // Match the Python backend default
    // },
  };
}

/**
 * Fetches metrics from the Python metrics server
 * @param payload The metrics payload to send to the server
 * @returns A record of metric names and their calculated values
 */
export async function getMetrics(
  payload: MetricsServicePayload
): Promise<Record<MetricName, number>> {
  try {
    console.log("Sending metrics payload:", payload);
    const response = await fetch(metricsServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Received metrics data:", data);
    return data;
  } catch (error) {
    console.error("Error calculating metrics:", error);
    throw error;
  }
}

async function getMetricsExample() {
  const sampleGenerated = ["The cat sat on the mat."];
  const sampleGroundTruth = ["The cat was on the mat."];

  const payload = createMetricsPayload(sampleGenerated, sampleGroundTruth);

  try {
    console.log("Requesting metrics...");
    const metrics = await getMetrics(payload);
    console.log("Metrics received:", metrics);
  } catch (error) {
    console.error("Failed to get metrics:", error);
  }
}

// Only run the example if the script is executed directly
if (import.meta.main) {
  getMetricsExample();
}
