import { downloadBeirDataset, fetchBeirCorpus } from "./utils/config";
import { batchAddMemories } from "./api/supermemory";
import type { AddMemoryRequest } from "./types/supermemory";
import type { BeirCorpusDoc } from "./types/beir";
import { env } from "./utils/config";

const BATCH_SIZE = env.batchSize; // Number of documents to process in each batch

const datasetName = env.datasetName;
/**
 * Transform a BEIR corpus document into a Supermemory memory request
 */
function beirDocToMemory(doc: BeirCorpusDoc): AddMemoryRequest {
  // Basic required fields for a memory
  const memory: AddMemoryRequest = {
    // Use the document text as the main content
    content: doc.title ? `${doc.title}\n\n${doc.text}` : doc.text,
  };

  // Add metadata to the memory
  memory.metadata = {
    source: "beir",
    doc_id: doc._id,
  };

  // If there's a title, add it to metadata
  if (doc.title) {
    memory.metadata.title = doc.title;
  }

  return memory;
}

/**
 * Load a BEIR dataset into Supermemory
 */
async function loadBeirDatasetToSupermemory() {
  console.log(`Starting to load BEIR dataset: ${datasetName}`);

  // Step 1: Ensure the dataset is downloaded
  console.log(`Ensuring dataset ${datasetName} is downloaded...`);
  await downloadBeirDataset();

  // Step 2: Fetch the corpus
  console.log(`Fetching corpus for ${datasetName}...`);
  const corpus = await fetchBeirCorpus();

  // Log corpus size
  const corpusSize = Object.keys(corpus).length;
  console.log(`Corpus contains ${corpusSize} documents`);

  // Step 3: Process corpus documents in batches
  console.log(
    `Starting to process corpus documents in batches of ${BATCH_SIZE}...`
  );
  const documents = Object.values(corpus);
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    // Transform BEIR documents to memories
    const memories = batch.map(beirDocToMemory);

    try {
      // Add the batch to Supermemory
      const result = await batchAddMemories(memories);

      // Count successful additions
      successCount += result.length;
      errorCount += batch.length - result.length;

      // Log batch progress
      totalProcessed += batch.length;
      const percentComplete = ((totalProcessed / corpusSize) * 100).toFixed(2);
      console.log(
        `Processed ${totalProcessed}/${corpusSize} documents (${percentComplete}%)`
      );
      console.log(`Batch success: ${result.length}/${batch.length}`);
    } catch (error) {
      console.error(
        `Error processing batch (documents ${i} to ${i + batch.length - 1}):`,
        error
      );
      errorCount += batch.length;
    }

    // Small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Final summary
  console.log("\n=== BEIR Dataset Load Summary ===");
  console.log(`Dataset: ${datasetName}`);
  console.log(`Total documents processed: ${totalProcessed}/${corpusSize}`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log("================================\n");
}

async function main() {
  try {
    await loadBeirDatasetToSupermemory();
  } catch (error) {
    console.error("Error loading BEIR dataset:", error);
    process.exit(1);
  }
}

// Run the main function
main();
