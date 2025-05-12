import { config } from "dotenv";
import type { BeirCorpus, BeirQueries, BeirQrels } from "../types/beir";
import fs from "fs";

// Load environment variables from .env file
config();

// Function to validate environment variables
function validateEnv() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const supermemoryApiUrl = process.env.SUPERMEMORY_API_URL;
  const pymetricsApiUrl = process.env.PYMETRICS_API_URL;
  const datasetName = process.env.DATASET_NAME;
  const beirDatasetPath = process.env.BEIR_DATA_ROOT_PATH;
  const batchSize = process.env.LOAD_BIER_BATCH_SIZE;

  const projectConfig = JSON.parse(
    fs.readFileSync("project-config.json", "utf-8")
  );
  const lgKValues = projectConfig.k_values.lg;
  const lgMaxRetrievalLimits = projectConfig.max_retrieval_limits.lg;
  const lgDatasets = projectConfig.datasets.lg;
  const smKValues = projectConfig.k_values.sm;
  const smMaxRetrievalLimits = projectConfig.max_retrieval_limits.sm;
  const smDatasets = projectConfig.datasets.sm;

  if (!datasetName || datasetName === "" || datasetName === undefined) {
    throw new Error("DATASET_NAME is not set in the environment variables");
  }

  if (
    !beirDatasetPath ||
    beirDatasetPath === "" ||
    beirDatasetPath === undefined
  ) {
    throw new Error(
      "BEIR_DATA_ROOT_PATH is not set in the environment variables"
    );
  }

  if (!batchSize || batchSize === "" || batchSize === undefined) {
    throw new Error(
      "BATCH_SIZE is not set in the environment variables. it must be a number"
    );
  }

  if (!apiKey) {
    console.warn("Warning: SUPERMEMORY_API_KEY is not set in .env file");
    console.warn(
      "Please set up your API key in a .env file to use the API features"
    );

    // Return a placeholder value for development
    return {
      apiKey: "development_key",
      googleApiKey: "development_key",
      openaiApiKey: "development_key",
      supermemoryApiUrl: "https://v2.api.supermemory.ai/",
      pymetricsApiUrl: "http://0.0.0.0:8000",
      datasetName: "scifact",
      lgKValues: [1, 3, 5, 10, 20, 50, 100],
      lgMaxRetrievalLimits: 100,
      lgDatasets: ["quora"],
      smKValues: [1, 3, 5, 10],
      smMaxRetrievalLimits: 10,
      smDatasets: ["scifact"],
      beirDatasetPath: "./beir_data",
      batchSize: 20,
    };
  }

  if (!googleApiKey) {
    console.warn(
      "Warning: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env file"
    );
    console.warn(
      "Please set up your Google API key in a .env file to use the answer generation features"
    );
  }

  if (
    !pymetricsApiUrl ||
    pymetricsApiUrl === "" ||
    pymetricsApiUrl === undefined
  ) {
    throw new Error(
      "PYMETRICS_API_URL is not set in the environment variables"
    );
  }

  return {
    apiKey,
    googleApiKey: googleApiKey || "",
    openaiApiKey: openaiApiKey || "",
    supermemoryApiUrl: supermemoryApiUrl || "https://v2.api.supermemory.ai/",
    pymetricsApiUrl: pymetricsApiUrl || "http://0.0.0.0:8000",
    datasetName: datasetName,
    lgKValues: lgKValues,
    lgMaxRetrievalLimits: lgMaxRetrievalLimits,
    lgDatasets: lgDatasets,
    smKValues: smKValues,
    smMaxRetrievalLimits: smMaxRetrievalLimits,
    smDatasets: smDatasets,
    beirDatasetPath: beirDatasetPath,
    batchSize: parseInt(batchSize),
  };
}

// BEIR Dataset handling functions
export async function downloadBeirDataset(): Promise<any> {
  try {
    const response = await fetch(
      `${env.pymetricsApiUrl}/beir/download/${env.datasetName}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download dataset: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error downloading BEIR dataset ${env.datasetName}:`, error);
    throw error;
  }
}

export async function fetchBeirCorpus(): Promise<BeirCorpus> {
  try {
    const response = await fetch(
      `${env.pymetricsApiUrl}/beir/corpus/${env.datasetName}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch corpus: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching BEIR corpus for ${env.datasetName}:`, error);
    throw error;
  }
}

export async function fetchBeirQueries(): Promise<BeirQueries> {
  try {
    const response = await fetch(
      `${env.pymetricsApiUrl}/beir/queries/${env.datasetName}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch queries: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching BEIR queries for ${env.datasetName}:`, error);
    throw error;
  }
}

export async function fetchBeirQrels(): Promise<BeirQrels> {
  try {
    const response = await fetch(
      `${env.pymetricsApiUrl}/beir/qrels/${env.datasetName}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch qrels: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching BEIR qrels for ${env.datasetName}:`, error);
    throw error;
  }
}

export async function evaluateBeirResults(
  results: Record<string, Record<string, number>>
) {
  try {
    const response = await fetch(
      `${env.pymetricsApiUrl}/beir/evaluate/${env.datasetName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          results: results,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to evaluate results: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error evaluating results for ${env.datasetName}:`, error);
    throw error;
  }
}

export const env = validateEnv();
