import { config } from "dotenv";
import fs from "fs";
import path from "path";
import signale from "./logger";

// Create a basic signale instance for this file
// We can't import from logger.ts as that would create a circular dependency

// Load environment variables from .env file
config();

// Function to validate environment variables
function validateEnv() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const supermemoryApiUrl = process.env.SUPERMEMORY_API_URL;

  if (!apiKey) {
    signale.warn("Warning: SUPERMEMORY_API_KEY is not set in .env file");
    signale.warn(
      "Please set up your API key in a .env file to use the API features"
    );
    // Return a placeholder value for development
    return {
      apiKey: "development_key",
      googleApiKey: "development_key",
      openaiApiKey: "development_key",
      supermemoryApiUrl: "https://v2.api.supermemory.ai/",
    };
  }

  if (!googleApiKey) {
    signale.warn(
      "Warning: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env file"
    );
    signale.warn(
      "Please set up your Google API key in a .env file to use the answer generation features"
    );
  }

  return {
    apiKey,
    googleApiKey: googleApiKey || "",
    openaiApiKey: openaiApiKey || "",
    supermemoryApiUrl: supermemoryApiUrl || "https://v2.api.supermemory.ai/",
  };
}

// Read Locomo dataset
function readLocomoDataset() {
  try {
    const dataPath = path.join(
      process.cwd(),
      "locomo_data",
      "data",
      "locomo10.json"
    );
    const jsonData = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(jsonData);
  } catch (error) {
    signale.error("Error reading Locomo dataset:", error);
    // Return empty array for development if data not available
    return [];
  }
}

export const env = validateEnv();
export const locomoData = readLocomoDataset();
