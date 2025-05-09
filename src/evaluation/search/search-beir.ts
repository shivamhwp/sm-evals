import {
  fetchBeirQueries,
  fetchBeirQrels,
  evaluateBeirResults,
} from "../../utils/config";
import { searchMemories } from "../../api/supermemory";
import type { SearchRequest } from "../../types/supermemory";
import fs from "fs";
import path from "path";

/**
 * Run search evaluation using a BEIR dataset
 * @param datasetName Name of the BEIR dataset
 */
export async function runBeirSearchEvaluation(datasetName: string) {
  console.log(`Starting BEIR search evaluation for dataset: ${datasetName}`);

  try {
    // Step 1: Fetch queries and qrels
    console.log("Fetching queries and relevance judgments...");
    const queries = await fetchBeirQueries(datasetName);
    const qrels = await fetchBeirQrels(datasetName);

    // Log basic stats
    const queryCount = Object.keys(queries).length;
    console.log(`Total queries: ${queryCount}`);

    // Step 2: Prepare results container
    const results: Record<string, Record<string, number>> = {};

    // Step 3: Process each query
    console.log("Starting search for each query...");
    let processedQueries = 0;

    for (const queryId in queries) {
      const query = queries[queryId];
      const queryText = query.text;

      // Search parameters - adjust as needed based on your API
      const searchParams: SearchRequest = {
        q: queryText,
        limit: 100, // Fetch enough results for evaluation
      };

      try {
        // Perform search
        const searchResponse = await searchMemories(searchParams);

        // Format results for BEIR evaluation
        // In BEIR format: { query_id: { doc_id_1: score_1, doc_id_2: score_2, ... } }
        const queryResults: Record<string, number> = {};

        for (const result of searchResponse.results) {
          // Extract document ID from metadata
          const docId = result.metadata?.doc_id;

          // Skip if no document ID (not a BEIR document)
          if (!docId) continue;

          // Use the document score or default to a position-based score
          const score = result.score ?? 1.0;
          queryResults[docId] = score;
        }

        // Add to results
        results[queryId] = queryResults;

        // Log progress
        processedQueries++;
        if (processedQueries % 10 === 0 || processedQueries === queryCount) {
          console.log(`Processed ${processedQueries}/${queryCount} queries`);
        }
      } catch (error) {
        console.error(
          `Error searching for query ${queryId}: ${queryText}`,
          error
        );
      }

      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Step 4: Evaluate results
    console.log("Evaluating search results...");
    const evaluationResults = await evaluateBeirResults(datasetName, results);

    // Step 5: Save results to file
    const resultsDir = path.join(process.cwd(), "results");

    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const resultsFilePath = path.join(
      resultsDir,
      `beir_${datasetName}_${timestamp}.json`
    );

    fs.writeFileSync(
      resultsFilePath,
      JSON.stringify(
        {
          dataset: datasetName,
          timestamp: new Date().toISOString(),
          metrics: evaluationResults.metrics,
          query_count: queryCount,
        },
        null,
        2
      )
    );

    console.log(`\nEvaluation complete for ${datasetName}`);
    console.log("==========================");
    console.log("NDCG@10:", evaluationResults.metrics.ndcg["NDCG@10"]);
    console.log("Recall@100:", evaluationResults.metrics.recall["Recall@100"]);
    console.log("MAP@100:", evaluationResults.metrics.map["MAP@100"]);
    console.log("==========================");
    console.log(`Full results saved to: ${resultsFilePath}`);

    return evaluationResults;
  } catch (error) {
    console.error(`Error running BEIR evaluation for ${datasetName}:`, error);
    throw error;
  }
}

async function main() {
  // Get dataset name from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Please provide a dataset name");
    console.log(
      "Usage: bun run src/evaluation/search/search-beir.ts <dataset_name>"
    );
    console.log(
      "Example: bun run src/evaluation/search/search-beir.ts scifact"
    );
    process.exit(1);
  }

  const datasetName = args[0];

  try {
    await runBeirSearchEvaluation(datasetName);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();
