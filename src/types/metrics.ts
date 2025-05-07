export interface SimilarityMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  accuracyScore: number;
  similarityScores: number[];
  averageSimilarity: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  threshold: number;
}

//  these are for calculating metrics
interface Metrics {
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  f1Score: number;
  precision: number;
  recall: number;
}

export interface QAItem {
  question: string;
  answer: string;
  category: string;
  evidence?: string[];
}

export interface CategoryResult {
  questionCount: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  semanticCorrect: number;
  semanticPartial: number;
  semanticIncorrect: number;
  totalSimilarity: number;
}

export interface SearchParams {
  q?: string;
  limit: number;
  filter: {
    sample_id: string;
  };
}
