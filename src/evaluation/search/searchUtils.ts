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
  const systemInstruction = `Analyze the question type (e.g., when, who, what, how many) and provide a direct answer in the appropriate format. For date questions, respond with a date. For numerical questions, respond with a number. For factual questions, provide just the fact. Extract only the most relevant information from the context to answer the question precisely. Keep your answer as simple and concise as possible. The context you are getting will be conversations - it can be 3 or any number of conversations. Understand the context by reading through all conversations and come up with the best possible answer to the question. The responses are generally one line. Don't add any punctuation as in "she is a, it was on". Just give the direct result like "transgender" and "on 10th may". No need for punctuation and stuff. Just the direct answer. The most important thing is giving the right answer. No need for correct grammar, sentence and punctuation. Only the proper concise answer. If you cannot find the answer in the context, simply respond with " "
  also don't change the answers like transgender woman to trans woman. like if you know that date let's say 10th may then don't change it to like "recently". giving the right answer is the most most most important thing. you have to change nothing you just read the context and give the right answer. you have to do nothing from your side.
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
