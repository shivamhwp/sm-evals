import axios from "axios";
import { env } from "../utils/config";
import type {
  AddMemoryRequest,
  AddMemoryResponse,
  SearchRequest,
  SearchResponse,
} from "../types/supermemory";

const API_BASE_URL = "https://api.supermemory.ai/";

// Create axios instance with authorization header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "x-api-key": `${env.apiKey}`,
    "Content-Type": "application/json",
  },
});

// Add a memory to Supermemory
export async function addMemory(
  data: AddMemoryRequest
): Promise<AddMemoryResponse> {
  try {
    const response = await api.post("/add", data);
    return response.data;
  } catch (error) {
    console.error("Error adding memory:", error);
    throw error;
  }
}

// Search for memories in Supermemory
export async function searchMemories(
  params: SearchRequest
): Promise<SearchResponse> {
  try {
    const response = await api.post("/search", params);
    return response.data;
  } catch (error) {
    console.error("Error searching memories:", error);
    throw error;
  }
}

// Batch add multiple memories at once
export async function batchAddMemories(
  memories: AddMemoryRequest[]
): Promise<AddMemoryResponse[]> {
  const results: AddMemoryResponse[] = [];

  for (const memory of memories) {
    try {
      const response = await addMemory(memory);
      results.push(response);
    } catch (error) {
      console.error(`Failed to add memory: ${JSON.stringify(memory)}`, error);
    }
  }

  return results;
}
