export type TextMetricName = "bleu";
export type ClassificationMetricName = "f1" | "recall" | "precision";
export type MetricName = TextMetricName | ClassificationMetricName;

export type ClassificationAverageStrategy =
  | "binary"
  | "micro"
  | "macro"
  | "weighted"
  | "samples";

export interface BleuData {
  predictions: string[];
  references: string[][];
}

export interface ClassificationData {
  predictions: (string | number | boolean)[];
  ground_truth: (string | number | boolean)[];
  average: ClassificationAverageStrategy;
  positive_label?: string | number | boolean;
  labels?: (string | number | boolean)[];
  zero_division?: 0 | 1 | "warn";
}

export interface MetricsServicePayload {
  metrics_to_calculate: MetricName[];
  bleu_data?: BleuData;
  classification_data?: ClassificationData;
}
