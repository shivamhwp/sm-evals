import fs from "fs";
import path from "path";
import { batchSearchMemories } from "../../api/supermemory";
import type { SearchRequest } from "../../types/supermemory";
import { env } from "../../utils/config";

const datasetName = env.datasetName;

/**
 * Run search with BEIR dataset and save results to a file
 */
export async function searchAndSaveResults(limit = 3) {
  console.log(`Starting BEIR search for dataset: ${datasetName}`);

  try {
    // Step 1: Fetch queries and qrels
    console.log("Reading queries and relevance judgments from local files...");
    const queriesFilePath = path.join(
      __dirname, // Or process.cwd() depending on execution context relative to beir_data
      "../../../py-metrics/beir_data", // Adjust this path if __dirname is not suitable
      datasetName,
      "queries.json"
    );

    if (!fs.existsSync(queriesFilePath)) {
      throw new Error(`Queries file not found: ${queriesFilePath}`);
    }
    // Qrels are not strictly needed for this script's search and save logic,
    // but if they were, you'd read and parse them similarly.

    const queriesString = fs.readFileSync(queriesFilePath, "utf8");
    const queries = JSON.parse(queriesString); // Crucial: Parse the JSON string

    // Log basic stats
    const queryCount = Object.keys(queries).length;
    console.log(`Total queries: ${queryCount}`);

    // Step 2: Prepare results container
    const results: Record<string, Record<string, number>> = {};

    // Step 3: Prepare batch processing
    console.log("Preparing search queries...");
    const searchQueries: Array<SearchRequest & { queryId: string }> = [];

    for (const queryId in queries) {
      const query = queries[queryId];
      const queryText = query.text;

      // Prepare search parameters
      searchQueries.push({
        q: queryText,
        limit,
        queryId, // Add queryId to track which query this is
      });
    }

    // Step 4: Run batch search
    console.log(`Running batch search for ${searchQueries.length} queries...`);
    const batchResults = await batchSearchMemories(searchQueries);

    // Step 5: Process search results
    console.log("Processing search results...");
    let processedQueries = 0;
    let successfulQueries = 0;

    for (const { query, response } of batchResults) {
      const queryId = (query as any).queryId; // Access the queryId we added
      processedQueries++;

      if (!response) {
        console.error(`No response for query ${queryId}: ${query.q}`);
        continue;
      }

      successfulQueries++;

      // Format results for BEIR evaluation
      const queryResults: Record<string, number> = {};

      for (const result of response.results) {
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

      // Log progress periodically
      if (processedQueries % 20 === 0 || processedQueries === queryCount) {
        console.log(
          `Processed ${processedQueries}/${queryCount} queries (${successfulQueries} successful)`
        );
      }
    }

    // Save the search results to a file
    const resultsDir = path.join(process.cwd(), "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const resultsFilePath = path.join(
      resultsDir,
      `search_results_${datasetName}_${timestamp}.json`
    );

    fs.writeFileSync(
      resultsFilePath,
      JSON.stringify(
        {
          dataset: datasetName,
          timestamp: new Date().toISOString(),
          results: results,
          query_count: queryCount,
          successful_query_count: successfulQueries,
        },
        null,
        2
      )
    );

    console.log(`\nSearch completed for ${datasetName}`);
    console.log(`Results saved to: ${resultsFilePath}`);
    console.log(`Successful queries: ${successfulQueries}/${queryCount}`);

    return { resultsFilePath, results };
  } catch (error) {
    console.error(`Error in search:`, error);
    throw error;
  }
}

async function main() {
  try {
    await searchAndSaveResults();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
