export interface BeirCorpusDoc {
  _id: string;
  text: string;
  title?: string;
  // Add other fields if present in your chosen BEIR dataset's corpus.json
}

export type BeirCorpus = Record<string, BeirCorpusDoc>;

export interface BeirQuery {
  _id: string;
  text: string;
  // Add other fields if present
}

export type BeirQueries = Record<string, BeirQuery>;

export interface BeirQrelValue {
  [docId: string]: number; // score
}

export type BeirQrels = Record<string, BeirQrelValue>; // query_id -> {doc_id: score}

// Types for API responses
export interface BeirDatasetDownloadResponse {
  dataset_name: string;
  corpus_path: string;
  queries_path: string;
  qrels_path: string;
  success: boolean;
  message: string;
}

export interface BeirEvaluationResults {
  metrics: {
    ndcg: Record<string, number>;
    map: Record<string, number>;
    recall: Record<string, number>;
    precision: Record<string, number>;
  };
  dataset_name: string;
}

export interface BeirAvailableDatasetsResponse {
  available_datasets: string[];
}
