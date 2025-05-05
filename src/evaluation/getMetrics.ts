import { type MetricsServicePayload, type MetricName } from "../types/send";

/**
 * Sends metrics data to the Python metrics server
 * @param payload The metrics payload to send
 * @returns The metrics results from the server
 */

const metricsServerUrl = "http://localhost:6969/calculate_metrics";

const payload: MetricsServicePayload = {
  metrics_to_calculate: ["bleu"],
  text_data: {
    predictions: ["hello", "world"],
    references: [
      ["hello", "world"],
      ["hello", "world"],
    ],
  },
};

export async function getMetrics(
  payload: MetricsServicePayload
): Promise<Record<MetricName, number>> {
  try {
    const response = await fetch(metricsServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calculating metrics:", error);
    throw error;
  }
}
