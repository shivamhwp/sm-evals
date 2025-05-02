import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env file
config();

// Function to validate environment variables
function validateEnv() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (!apiKey) {
    console.warn("Warning: SUPERMEMORY_API_KEY is not set in .env file");
    console.warn(
      "Please set up your API key in a .env file to use the API features"
    );
    // Return a placeholder value for development
    return {
      apiKey: "development_key",
    };
  }

  return {
    apiKey,
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
    console.error("Error reading Locomo dataset:", error);
    // Return empty array for development if data not available
    return [];
  }
}

export const env = validateEnv();
export const locomoData = readLocomoDataset();
