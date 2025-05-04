import { locomoData, env } from "./utils/config";
import signale from "./utils/logger";

async function main() {
  signale.info("\n===== Supermemory Locomo Benchmark Test =====\n");

  // Check API key
  if (env.apiKey === "development_key") {
    signale.warn(
      "⚠️  Running in development mode. API calls will not work without a valid API key."
    );
    signale.warn(
      "➡️  Create a .env file with your SUPERMEMORY_API_KEY to enable API functionality.\n"
    );
  } else {
    signale.success("✅ API key configured successfully\n");
  }

  // Check Locomo data
  if (locomoData.length === 0) {
    signale.warn(
      "⚠️  No Locomo data found. Make sure you have cloned the repository:"
    );
    signale.warn("   git clone https://github.com/snap-research/locomo.git\n");
  } else {
    signale.success(
      `✅ Loaded ${locomoData.length} conversations from Locomo dataset\n`
    );
  }

  // Show available commands
  signale.info("Available Commands:");
  signale.info("------------------");
  signale.info("bun run load    - Load Locomo data into Supermemory");
  signale.info("bun run search  - Test search functionality on loaded data\n");

  signale.info("Documentation:");
  signale.info("-------------");
  signale.info("- Supermemory API: https://docs.supermemory.ai/introduction");
  signale.info("- Locomo Benchmark: https://github.com/snap-research/locomo");
  signale.info("- sm-evals repo: https://github.com/shivamhwp/sm-evals");
}

main().catch((error) => {
  signale.error("Error in main program:", error);
  process.exit(1);
});
