import { env } from "../../utils/config";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineSimilarity, embed, generateText, type Embedding } from "ai";

const QA_MODEL_NAME = "o4-mini-2025-04-16";
const EMBEDDING_MODEL_NAME = "text-embedding-3-small";

const openai = createOpenAI({
  apiKey: env.openaiApiKey,
});

// Cache for embeddings to avoid redundant API calls
const embeddingCache = new Map<string, Embedding | null>();

// ----------------------------------------------
// 👇 get embeddings from multiple texts in a single batch
// ----------------------------------------------

export async function getBatchEmbeddings(
  texts: string[]
): Promise<(Embedding | null)[]> {
  const uniqueTexts = [...new Set(texts)].filter((text) => text);
  const uncachedTexts: string[] = [];

  // Check which texts need embeddings
  uniqueTexts.forEach((text) => {
    if (!embeddingCache.has(text)) {
      uncachedTexts.push(text);
    }
  });

  // Make a single API call for all uncached texts
  if (uncachedTexts.length > 0) {
    try {
      const model = openai.textEmbeddingModel(EMBEDDING_MODEL_NAME);

      // Process each text individually but in parallel
      const embedPromises = uncachedTexts.map((text) =>
        embed({ model, value: text })
      );

      const results = await Promise.all(embedPromises);

      // Store results in cache
      uncachedTexts.forEach((text, i) => {
        embeddingCache.set(text, results[i].embedding);
      });
    } catch (error) {
      console.error("Error getting batch embeddings:", error);
      // Set failed embeddings to null in cache
      uncachedTexts.forEach((text) => {
        embeddingCache.set(text, null);
      });
    }
  }

  // Return embeddings for all requested texts
  return texts.map((text) => embeddingCache.get(text) || null);
}

// For backward compatibility - fetch from cache or generate single embedding
export async function getEmbedding(
  text: string | number
): Promise<Embedding | null> {
  const textStr = String(text).trim();
  if (!textStr) {
    console.debug("Empty string provided for embedding");
    return null;
  }

  if (embeddingCache.has(textStr)) {
    return embeddingCache.get(textStr)!;
  }

  const [embedding] = await getBatchEmbeddings([textStr]);
  return embedding;
}

export function calculateCosineSimilarityFromEmbeddings(
  embedding1: Embedding | null,
  embedding2: Embedding | null
): number {
  // Handle cases where embeddings could not be generated
  if (!embedding1 || !embedding2) {
    if (!embedding1 && !embedding2) {
      console.warn("Both embeddings are null - returning 0 similarity score");
    } else if (!embedding1) {
      console.warn("First embedding is null - returning 0 similarity score");
    } else {
      console.warn("Second embedding is null - returning 0 similarity score");
    }
    return 0;
  }
  // The cosineSimilarity function expects number[]
  return cosineSimilarity(embedding1, embedding2);
}

// ----------------------------------------------
// 👇 generate answer from the retrieved results from the supermemory
// ----------------------------------------------

export async function generateAnswer(question: string, context: string[]) {
  const systemInstruction = `
  You are a precise question-answering system. Extract the exact answer from the provided conversation contexts.
  
  1. Identify the question type (who, what, when, where, how many) and format your answer accordingly:
     - Dates: Return the exact date (e.g., "May 10th")
     - Numbers: Return just the number (e.g., "42")
     - Facts: Return only the relevant fact (e.g., "transgender")
  
  2. Keep answers extremely concise - typically one word or phrase without punctuation or grammar.
  
  3. Preserve exact terminology from the context - don't paraphrase or substitute terms.
  
  4. You have to answer with some answer, but it must not be from outside the context.
  
  Your goal is maximum accuracy with minimum words. Extract only what directly answers the question.
  `;

  const userPrompt = `Question: ${question}

Context:
${context.join("\n\n")}

Answer:
`;

  try {
    const result = await generateText({
      model: openai(QA_MODEL_NAME),
      messages: [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    return result.text.toString();
  } catch (error) {
    console.error("Error generating answer:", error);
    return "Error generating answer";
  }
}
