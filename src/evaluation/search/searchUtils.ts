import { env } from "../../utils/config";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineSimilarity, embed, generateText } from "ai";
import signale from "../../utils/logger";

const openai = createOpenAI({
  apiKey: env.openaiApiKey,
});

export async function getCosineSimilarity(
  generated: string | number,
  groundTruth: string | number
) {
  // Convert inputs to strings and handle empty strings
  const generatedStr = String(generated).trim();
  const groundTruthStr = String(groundTruth).trim();

  // Return 0 similarity if either string is empty
  if (!generatedStr || !groundTruthStr) {
    signale.debug("Empty strings provided", generatedStr, groundTruthStr);
    return 0;
  }

  const model = openai.textEmbeddingModel("text-embedding-3-small");

  const embedding1 = await embed({
    model,
    value: generatedStr,
  });

  const embedding2 = await embed({
    model,
    value: groundTruthStr,
  });

  return cosineSimilarity(embedding1.embedding, embedding2.embedding);
}

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
