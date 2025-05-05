import { env } from "../../utils/config";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineSimilarity, embed, generateText, type Embedding } from "ai";
import signale from "../../utils/logger";

const openai = createOpenAI({
  apiKey: env.openaiApiKey,
});

// ----------------------------------------------
// 👇 get embedding from the text
// ----------------------------------------------

export async function getEmbedding(
  text: string | number
): Promise<Embedding | null> {
  const textStr = String(text).trim();
  if (!textStr) {
    signale.debug("Empty string provided for embedding");
    return null; // Return null for empty input
  }

  try {
    const model = openai.textEmbeddingModel("text-embedding-3-small");
    const result = await embed({ model, value: textStr });
    return result.embedding;
  } catch (error) {
    signale.error("Error getting embedding:", error);
    return null; // Return null on error
  }
}

export function calculateCosineSimilarityFromEmbeddings(
  embedding1: Embedding | null,
  embedding2: Embedding | null
): number {
  // Handle cases where embeddings could not be generated
  if (!embedding1 || !embedding2) {
    signale.debug("Cannot calculate similarity with null embeddings");
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
  
  4. If the answer cannot be found in the context, respond with a single space " ".
  
  Your goal is maximum accuracy with minimum words. Extract only what directly answers the question.
  `;

  const userPrompt = `Question: ${question}

Context:
${context.join("\n\n")}

Answer:
`;

  try {
    const result = await generateText({
      model: openai("o4-mini-2025-04-16"),
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
    signale.error("Error generating answer:", error);
    return "Error generating answer";
  }
}
