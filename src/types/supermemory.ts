export interface AddMemoryRequest {
  content: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AddMemoryResponse {
  id: string;
  status: string;
}

// search request and response types : https://docs.supermemory.ai/api-reference/search/search-through-documents-with-filtering
export interface SearchRequest {
  q: string;
  limit: number;
  filter?: Record<string, any>;
  userId?: string; // used to search only within the user workspace or memoryspace
}

export interface SearchResult {
  documentId?: string;
  chunks: Array<{
    content: string;
    isRelevant?: boolean;
    score?: number;
  }>;
  metadata?: Record<string, any>;
  score?: number;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  timing: number;
}
