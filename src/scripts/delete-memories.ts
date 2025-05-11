import fs from "fs";
import path from "path";
import { env } from "../utils/config";

const API_BASE_URL = env.supermemoryApiUrl;
const MEM_ID_FILE = path.join(process.cwd(), "temp-files/mem-id.json");

// Ensure mem-id.json file exists
function ensureMemIdFileExists() {
  const dir = path.dirname(MEM_ID_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(MEM_ID_FILE)) {
    fs.writeFileSync(MEM_ID_FILE, "[]");
  }
}

// Fetch all memory IDs from the API
async function fetchAllMemoryIds() {
  console.log("Fetching all memory IDs...");
  let allMemoryIds: string[] = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `${API_BASE_URL}/memories?page=${page}&limit=100`,
        {
          headers: {
            "x-api-key": env.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // Extract just the IDs from the response
      const memoryIds = data.memories.map((memory: any) => memory.id);

      allMemoryIds = [...allMemoryIds, ...memoryIds];

      // Check if we need to fetch more pages
      if (memoryIds.length < 100) {
        hasMore = false;
      } else {
        page++;
      }

      console.log(`Fetched page ${page - 1}, got ${memoryIds.length} memories`);
    }

    // Ensure file exists before writing
    ensureMemIdFileExists();
    fs.writeFileSync(MEM_ID_FILE, JSON.stringify(allMemoryIds));

    console.log(`Found ${allMemoryIds.length} memories to delete`);
    return allMemoryIds;
  } catch (error) {
    console.error("Error fetching memory IDs:", error);
    throw error;
  }
}

// Delete all memories
async function deleteAllMemories() {
  console.log("Starting memory deletion process...");

  // Ensure file exists before reading
  ensureMemIdFileExists();

  // Fetch all memory IDs directly from the API
  const memoryIds = await fetchAllMemoryIds();

  if (!Array.isArray(memoryIds) || memoryIds.length === 0) {
    console.warn("No memory IDs found to delete.");
    return;
  }

  console.log(`Deleting ${memoryIds.length} memories in parallel...`);

  // Delete memories in parallel
  const deletePromises = memoryIds.map(async (id, index) => {
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

      console.log(
        `Deleted memory ${index + 1}/${memoryIds.length} (ID: ${id})`
      );
      return { success: true, id };
    } catch (error) {
      console.error(`Failed to delete memory ID ${id}:`, error);
      return { success: false, id };
    }
  });

  // Wait for all delete operations to complete
  const results = await Promise.all(deletePromises);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log("\nDeletion Summary:");
  console.log(`- Successfully deleted: ${successCount}`);
  console.log(`- Failed to delete: ${failCount}`);

  // Delete the mem-id.json file
  if (fs.existsSync(MEM_ID_FILE)) {
    fs.unlinkSync(MEM_ID_FILE);
    console.log(`Deleted ${MEM_ID_FILE}`);
  }
}

// Main function
async function main() {
  try {
    await deleteAllMemories();
  } catch (error) {
    console.error("Error in deletion process:", error);
    process.exit(1);
  }
}

main();
