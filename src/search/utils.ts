import { env } from "../utils/config";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineSimilarity, embed, embedMany, generateText } from "ai";

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
    console.log("Empty strings provided", generatedStr, groundTruthStr);
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

  // const { embeddings } = await embedMany({
  //   model,
  //   values: [generated, groundTruth],
  // });

  // return cosineSimilarity(embeddings[0], embeddings[1]);
}

export async function generateAnswer(question: string, context: string[]) {
  const systemInstruction = `Analyze the question type (e.g., when, who, what, how many) and provide a direct answer in the appropriate format. For date questions, respond with a date. For numerical questions, respond with a number. For factual questions, provide just the fact. Extract only the most relevant information from the context to answer the question precisely. Keep your answer as simple and concise as possible. The context you are getting will be conversations - it can be 3 or any number of conversations. Understand the context by reading through all conversations and come up with the best possible answer to the question. If you cannot find the answer in the context, simply respond with " "`;

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
    console.error("Error generating answer:", error);
    return "Error generating answer";
  }
}
