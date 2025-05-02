import { locomoData, env } from "./utils/config";
import { addMemory, searchMemories } from "./api/supermemory";

async function main() {
  console.log("\n===== Supermemory Locomo Benchmark Test =====\n");

  // Check API key
  if (env.apiKey === "development_key") {
    console.log(
      "⚠️  Running in development mode. API calls will not work without a valid API key."
    );
    console.log(
      "➡️  Create a .env file with your SUPERMEMORY_API_KEY to enable API functionality.\n"
    );
  } else {
    console.log("✅ API key configured successfully\n");
  }

  // Check Locomo data
  if (locomoData.length === 0) {
    console.log(
      "⚠️  No Locomo data found. Make sure you have cloned the repository:"
    );
    console.log("   git clone https://github.com/snap-research/locomo.git\n");
  } else {
    console.log(
      `✅ Loaded ${locomoData.length} conversations from Locomo dataset\n`
    );
  }

  // Show available commands
  console.log("Available Commands:");
  console.log("------------------");
  console.log("bun run load    - Load Locomo data into Supermemory");
  console.log("bun run search  - Test search functionality on loaded data\n");

  console.log("Documentation:");
  console.log("-------------");
  console.log("- Supermemory API: https://docs.supermemory.ai/introduction");
  console.log("- Locomo Benchmark: https://github.com/snap-research/locomo");
}

main().catch((error) => {
  console.error("Error in main program:", error);
  process.exit(1);
});
