import { config } from "dotenv";
import type { BeirCorpus, BeirQueries, BeirQrels } from "../types/beir";

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

  if (!datasetName || datasetName === "" || datasetName === undefined) {
    throw new Error("DATASET_NAME is not set in the environment variables");
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

  return {
    apiKey,
    googleApiKey: googleApiKey || "",
    openaiApiKey: openaiApiKey || "",
    supermemoryApiUrl: supermemoryApiUrl || "https://v2.api.supermemory.ai/",
    pymetricsApiUrl: pymetricsApiUrl || "http://0.0.0.0:8000",
    datasetName: datasetName,
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
