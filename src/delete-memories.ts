import fs from "fs";
import path from "path";
import { env } from "./utils/config";

const API_URL = "https://v2.api.supermemory.ai/";
const MEM_ID_FILE = path.join(process.cwd(), "src/data/mem-id.json");

// Step 1: Fetch all memory IDs and save to file
async function fetchAndSaveMemoryIds() {
  console.log("Fetching all memory IDs...");

  try {
    const response = await fetch(`${API_URL}/memories`, {
      headers: {
        "x-api-key": env.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    // Extract just the IDs from the response
    const memoryIds = data.memories.map((memory: any) => memory.id);

    // Save to file
    fs.writeFileSync(MEM_ID_FILE, JSON.stringify(memoryIds, null, 2));
    console.log(`Saved ${memoryIds.length} memory IDs to ${MEM_ID_FILE}`);

    return memoryIds;
  } catch (error) {
    console.error("Error fetching memory IDs:", error);
    throw error;
  }
}

// Step 2: Delete memories using IDs from file
async function deleteMemories() {
  console.log("Starting memory deletion process...");

  // Read memory IDs from file - directly as an array of strings
  let memoryIds: string[];
  try {
    const fileData = fs.readFileSync(MEM_ID_FILE, "utf-8");
    memoryIds = JSON.parse(fileData);
    // No need for additional processing as the file contains a simple array of IDs
  } catch (error) {
    console.error("Error reading memory IDs file:", error);
    // If file doesn't exist, fetch IDs first
    memoryIds = await fetchAndSaveMemoryIds();
  }

  console.log(`Found ${memoryIds.length} memories to delete`);

  // Delete memories one by one
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < memoryIds.length; i++) {
    const id = memoryIds[i];
    try {
      const response = await fetch(`${API_URL}/delete/${id}`, {
        method: "DELETE",
        headers: {
          "x-api-key": env.apiKey,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.log(data);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      successCount++;
      console.log(`Deleted memory ${i + 1}/${memoryIds.length} (ID: ${id})`);
    } catch (error) {
      failCount++;
      console.error(`Failed to delete memory ID ${id}:`, error);
    }
  }

  console.log("\nDeletion Summary:");
  console.log(`- Successfully deleted: ${successCount}`);
  console.log(`- Failed to delete: ${failCount}`);
}

// Main function
async function main() {
  try {
    await deleteMemories();
  } catch (error) {
    console.error("Error in deletion process:", error);
    process.exit(1);
  }
}

main();
