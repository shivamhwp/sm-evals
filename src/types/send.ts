export type TextMetricName = "bleu";
export type ClassificationMetricName = "f1" | "recall" | "precision";
export type MetricName = TextMetricName | ClassificationMetricName;

export type ClassificationAverageStrategy =
  | "binary"
  | "micro"
  | "macro"
  | "weighted"
  | "samples";

export interface MetricsServicePayload {
  metrics_to_calculate: MetricName[];

  text_data?: {
    predictions: string[];
    references: string[][];
  };

  classification_data?: {
    predictions: (string | number | boolean)[];
    ground_truth: (string | number | boolean)[];
    average: ClassificationAverageStrategy;
    positive_label?: string | number | boolean;
    labels?: (string | number | boolean)[];
    zero_division?: 0 | 1 | "warn";
  };
}
