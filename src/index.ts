import { env } from "./utils/config";

async function main() {
  console.log("\n===== Supermemory BEIR Benchmark Test =====\n");

  // Check API key
  if (env.apiKey === "development_key") {
    console.warn(
      "⚠️  Running in development mode. API calls will not work without a valid API key."
    );
    console.warn(
      "➡️  Create a .env file with your SUPERMEMORY_API_KEY to enable API functionality.\n"
    );
  } else {
    console.log("✅ API key configured successfully\n");
  }

  // Check PyMetrics API URL
  console.log(`PyMetrics API URL: ${env.pymetricsApiUrl}`);

  try {
    // Test PyMetrics connection
    const response = await fetch(`${env.pymetricsApiUrl}/`);
    if (response.ok) {
      console.log("✅ PyMetrics API connection successful\n");
    } else {
      console.warn(
        "⚠️  PyMetrics API connection failed. Start the service with:\n"
      );
      console.warn("   bun run start-pymetrics\n");
    }
  } catch (error) {
    console.warn(
      "⚠️  PyMetrics API connection failed. Start the service with:\n"
    );
    console.warn("   bun run start-pymetrics\n");
  }

  // Show available commands
  console.log("Available Commands:");
  console.log("------------------");
  console.log("bun run start-pymetrics - Start the PyMetrics service");
  console.log("bun run download-beir <dataset> - Download a BEIR dataset");
  console.log(
    "bun run load-beir <dataset> - Load BEIR dataset into Supermemory"
  );
  console.log("bun run search-beir <dataset> - Test search on BEIR dataset\n");

  console.log("Documentation:");
  console.log("-------------");
  console.log("- Supermemory API: https://docs.supermemory.ai/introduction");
  console.log("- BEIR Benchmark: https://github.com/beir-cellar/beir");
  console.log("- sm-evals repo: https://github.com/shivamhwp/sm-evals");
}

main().catch((error) => {
  console.error("Error in main program:", error);
  process.exit(1);
});
