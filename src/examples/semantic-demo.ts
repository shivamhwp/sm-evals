/**
 * Semantic Metrics Demonstration Script
 *
 * This script demonstrates how to use the semantic similarity metrics
 * with different types of questions and answers.
 *
 * Run it with: bun run src/examples/semantic-demo.ts
 */

import {
  calculateSemanticSimilarity,
  calculateSemanticMetrics,
  analyzeSemanticSimilarity,
} from "../evaluation/search/semanticMetrics";

async function runSemanticDemo() {
  const examples = [
    {
      question: "When did the event happen?",
      generated: "last Tuesday",
      groundTruth: "May 7, 2023",
      comment: "Different date formats, semantically similar",
    },
    {
      question: "What is the capital of France?",
      generated: "Paris",
      groundTruth: "Paris",
      comment: "Exact match",
    },
    {
      question: "Where is the Eiffel Tower located?",
      generated: "The Eiffel Tower is in the city of Paris, France",
      groundTruth: "Paris",
      comment: "More detailed answer than ground truth",
    },
    {
      question: "Who was the first person to walk on the moon?",
      generated: "Neil Armstrong",
      groundTruth: "Edwin 'Buzz' Aldrin",
      comment: "Completely different answers",
    },
    {
      question: "What causes gravity?",
      generated: "Gravity is caused by the curvature of spacetime due to mass",
      groundTruth: "The bending of spacetime by massive objects",
      comment: "Different wording, same concept",
    },
  ];

  console.info("========= Semantic Metrics Demo =========");
  console.info(`Testing ${examples.length} question-answer pairs...\n`);

  // Calculate individual similarities
  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const similarity = await calculateSemanticSimilarity(
      example.generated,
      example.groundTruth
    );

    console.info(`Example ${i + 1}:`);
    console.info(`Question: ${example.question}`);
    console.info(`Generated Answer: "${example.generated}"`);
    console.info(`Ground Truth: "${example.groundTruth}"`);
    console.info(`Note: ${example.comment}`);
    console.info(`Semantic Similarity: ${(similarity * 100).toFixed(2)}%`);

    // Classify based on thresholds
    if (similarity >= 0.85) {
      console.log("Classification: CORRECT");
    } else if (similarity >= 0.7) {
      console.warn("Classification: PARTIAL");
    } else {
      console.error("Classification: INCORRECT");
    }

    console.info("----------------------------------------\n");
  }

  // Calculate aggregate metrics with multiple thresholds
  console.info("Aggregate Metrics Analysis:");

  const generatedAnswers = examples.map((e) => e.generated);
  const groundTruthAnswers = examples.map((e) => e.groundTruth);

  // Try different thresholds
  await analyzeSemanticSimilarity(
    generatedAnswers,
    groundTruthAnswers,
    [0.6, 0.7, 0.8, 0.85, 0.9]
  );

  console.info("\n============= Demo Complete =============");
}

// Run the demo
runSemanticDemo().catch((error) => {
  console.error("Error in semantic demo:", error);
});
