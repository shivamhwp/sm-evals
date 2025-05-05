import { calculatePrecisionRecall } from "./precisionRecall";

export async function calculateAnswerF1(
  generated: string | number,
  groundTruth: string | number,
  similarityScore: number
) {
  const { precision, recall } = await calculatePrecisionRecall(
    generated,
    groundTruth,
    similarityScore
  );
  if (precision + recall === 0) return 0;
  return (2 * (precision * recall)) / (precision + recall);
}
