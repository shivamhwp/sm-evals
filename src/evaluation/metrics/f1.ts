import { calculatePrecisionRecall } from "./precisionRecall";

export async function calculateAnswerF1(
  generated: string,
  groundTruth: string
) {
  const { precision, recall } = await calculatePrecisionRecall(
    generated,
    groundTruth
  );
  if (precision + recall === 0) return 0;
  return (2 * (precision * recall)) / (precision + recall);
}
