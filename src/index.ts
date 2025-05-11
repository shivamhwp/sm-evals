import { env } from "./utils/config";

async function main() {
  // Check API key
  if (env.apiKey === "development_key" || env.datasetName === "") {
    console.log(" supermemory api key or the dataset name is not set.");
  }

  // Check PyMetrics API URL
  console.log(` py-metrics api url: ${env.pymetricsApiUrl}`);

  try {
    const response = await fetch(`${env.pymetricsApiUrl}/`);
    if (response.ok) {
      console.log(" py-metrics api status: connected");
    } else {
      console.log(" py-metrics api status: failed");
      console.log(" start the backend server with: bun run start:server");
    }
  } catch (error) {
    console.log(" py-metrics api status: failed");
    console.log(" start the backend server with: bun run start:server");
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
