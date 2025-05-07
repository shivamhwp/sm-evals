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
    console.log(`Add memory attempt status: ${response.status}`);

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

    console.log(`getting memories from sm : ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
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

  // Process memories in batches of 20 to avoid overwhelming the server
  const BATCH_SIZE = 20;

  for (let i = 0; i < memories.length; i += BATCH_SIZE) {
    const batch = memories.slice(i, i + BATCH_SIZE);

    // Process all memory additions in the current batch in parallel
    const batchPromises = batch.map(async (memory) => {
      try {
        return await addMemory(memory);
      } catch (error) {
        console.error(`Failed to add memory: ${JSON.stringify(memory)}`, error);
        // Return null for failed memories
        return null;
      }
    });

    // Wait for all promises in this batch to resolve
    const batchResults = await Promise.all(batchPromises);

    // Filter out null values (failed requests) and add to results
    results.push(
      ...batchResults.filter(
        (result): result is AddMemoryResponse => result !== null
      )
    );

    // Add a small delay between batches to prevent overwhelming the server
    if (i + BATCH_SIZE < memories.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
