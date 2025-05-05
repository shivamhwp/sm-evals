import type {
  AddMemoryRequest,
  AddMemoryResponse,
  SearchRequest,
  SearchResponse,
} from "../types/supermemory";
import { env } from "../utils/config";

const API_BASE_URL = env.supermemoryApiUrl;

const headers = {
  "x-api-key": `${env.apiKey}`,
  "Content-Type": "application/json",
};

// Add a memory to Supermemory
export async function addMemory(
  data: AddMemoryRequest
): Promise<AddMemoryResponse> {
  let response: Response | null = null; // Define response variable outside try block
  try {
    response = await fetch(`${API_BASE_URL}/add`, {
      // Assign to outer variable
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    // Log status regardless of success/failure
    console.info(`Add memory attempt status: ${response.status}`);

    if (!response.ok) {
      // Attempt to get more details from the response body
      let errorBody = "[Could not read error body]";
      try {
        errorBody = await response.text(); // Read body as text
      } catch (bodyError) {
        console.error("Error reading response body:", bodyError);
      }
      // Throw a more informative error
      throw new Error(
        `HTTP error! Status: ${response.status}. Body: ${errorBody}`
      );
    }

    // If response is OK, parse and return JSON
    return await response.json();
  } catch (error) {
    // Log the error - it now includes the body if it was an HTTP error from above
    console.error("Error in addMemory function:", error);
    // Optional: Log the data that caused the error, if response isn't available (e.g., network error)
    if (!response) {
      console.error("Failed request data:", JSON.stringify(data));
    }
    // Re-throw the error to be caught by the caller (e.g., batchAddMemories)
    throw error;
  }
}

// Search for memories in Supermemory
export async function searchMemories(
  params: SearchRequest
): Promise<SearchResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    console.info(`getting memories from sm : ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching memories:", error);
    throw error;
  }
}

// Helper function for delay
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Batch add multiple memories at once
export async function batchAddMemories(
  memories: AddMemoryRequest[]
): Promise<AddMemoryResponse[]> {
  const results: AddMemoryResponse[] = [];

  for (const memory of memories) {
    try {
      const response = await addMemory(memory);
      // Status is already logged in addMemory
      results.push(response);
    } catch (error) {
      console.error(`Failed to add memory: ${JSON.stringify(memory)}`, error);
      // Optionally break or stop processing if one error is critical
      // break;
    }
    // Add a delay (e.g., 500ms) between requests
    await sleep(500);
  }

  return results;
}
