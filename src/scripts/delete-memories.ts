import fs from "fs";
import path from "path";
import { env } from "../utils/config";

const API_BASE_URL = env.supermemoryApiUrl;
const MEM_ID_FILE = path.join(process.cwd(), "src/data/mem-id.json");

// Step 1: Fetch all memory IDs and save to file
async function fetchAndSaveMemoryIds() {
  console.log("Fetching all memory IDs...");

  try {
    const response = await fetch(`${API_BASE_URL}/memories`, {
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
  let memoryIds: string[] = [];
  let fileExists = fs.existsSync(MEM_ID_FILE);
  let fileData = "";

  if (fileExists) {
    fileData = fs.readFileSync(MEM_ID_FILE, "utf-8").trim();
    // If file is not empty, use its contents
    if (fileData && fileData !== "[]") {
      try {
        memoryIds = JSON.parse(fileData);
      } catch (error) {
        console.error("Error parsing memory IDs file:", error);
        memoryIds = await fetchAndSaveMemoryIds();
      }
    } else {
      // File is empty or just an empty array, fetch new IDs
      memoryIds = await fetchAndSaveMemoryIds();
    }
  } else {
    // If file doesn't exist, fetch IDs first
    memoryIds = await fetchAndSaveMemoryIds();
  }

  if (!Array.isArray(memoryIds) || memoryIds.length === 0) {
    console.warn("No memory IDs found to delete.");
    return;
  }

  console.log(`Found ${memoryIds.length} memories to delete`);

  // Delete memories one by one
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < memoryIds.length; i++) {
    const id = memoryIds[i];
    try {
      const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
        method: "DELETE",
        headers: {
          "x-api-key": env.apiKey,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.debug(data);
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

  // If all deletions succeeded, clear the mem-id.json file
  if (successCount === memoryIds.length) {
    fs.writeFileSync(MEM_ID_FILE, "[]");
    console.log(`Cleared all content in ${MEM_ID_FILE}`);
  }
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
