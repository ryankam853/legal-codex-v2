export interface SearchQuery {
  text: string;
  language?: 'zh' | 'pt' | 'en' | 'auto';
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
  tags?: string[];
  filters?: SearchFilters;
}

export interface SearchFilters {
  category?: string;
  language?: 'zh' | 'pt' | 'en';
  publicationDate?: {
    start?: Date;
    end?: Date;
  };
  lawNumber?: string;
  isPublic?: boolean;
  hasAnnotations?: boolean;
  textLength?: {
    min?: number;
    max?: number;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: SortOption[];
  highlightMatches?: boolean;
  includeSnippets?: boolean;
  engines?: SearchEngineType[];
  facets?: string[];
}

export interface SortOption {
  field: SortField;
  direction: 'asc' | 'desc';
  weight?: number;
}

export type SortField = 
  | 'relevance'
  | 'date'
  | 'title'
  | 'wordCount'
  | 'category'
  | 'popularity';

export type SearchEngineType = 
  | 'postgresql'
  | 'meilisearch'
  | 'hybrid';

export interface SearchResult {
  query: string;
  results: SearchResultItem[];
  metadata: SearchMetadata;
  facets?: SearchFacet[];
  suggestions?: string[];
}

export interface SearchResultItem {
  id: string;
  type: 'legal_text' | 'annotation';
  title: {
    zh?: string;
    pt?: string;
  };
  snippet: {
    zh?: string;
    pt?: string;
  };
  highlights?: Highlight[];
  score: number;
  metadata: {
    category?: string;
    lawNumber?: string;
    publicationDate?: Date;
    wordCount?: number;
    language?: string;
    author?: string;
    tags?: string[];
  };
  url?: string;
}

export interface Highlight {
  field: string;
  text: string;
  start: number;
  end: number;
}

export interface SearchMetadata {
  totalResults: number;
  searchTime: number;
  engines: SearchEngineType[];
  language: string;
  page: number;
  limit: number;
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  duration: number;
  results?: number;
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected?: boolean;
}

// 搜索上下文
export interface SearchContext {
  originalQuery: string;
  normalizedQuery: string;
  detectedLanguage?: string;
  language: string;
  expandedTerms?: string[];
  synonyms?: string[];
  filters: SearchFilters;
  engines: SearchEngineType[];
  results: SearchResultItem[];
  startTime: number;
  processingSteps: ProcessingStep[];
}

// 處理器接口
export interface SearchProcessor {
  process(context: SearchContext): Promise<SearchContext>;
}

// 搜索引擎接口
export interface SearchEngine {
  search(context: SearchContext, options?: SearchOptions): Promise<SearchResultItem[]>;
  index(documents: IndexDocument[]): Promise<void>;
  updateIndex(documents: IndexDocument[]): Promise<void>;
  deleteFromIndex(documentIds: string[]): Promise<void>;
  getStats(): Promise<SearchEngineStats>;
}

export interface IndexDocument {
  id: string;
  type: 'legal_text' | 'annotation';
  title: {
    zh?: string;
    pt?: string;
  };
  content: {
    zh?: {
      text: string;
      html: string;
    };
    pt?: {
      text: string;
      html: string;
    };
  };
  metadata: {
    category?: string;
    lawNumber?: string;
    publicationDate?: Date;
    language?: string;
    tags?: string[];
    wordCount?: number;
    authorId?: string;
  };
  searchableText: string; // 合併所有可搜索文本
  lastUpdated: Date;
}

export interface SearchEngineStats {
  documentCount: number;
  indexSize: number;
  lastIndexUpdate: Date;
  averageSearchTime: number;
  popularQueries: PopularQuery[];
}

export interface PopularQuery {
  query: string;
  count: number;
  avgResultCount: number;
}

// 查詢擴展
export interface QueryExpansion {
  originalTerm: string;
  expandedTerms: string[];
  method: ExpansionMethod;
  confidence: number;
}

export type ExpansionMethod = 
  | 'synonym'
  | 'stemming'
  | 'phonetic'
  | 'semantic'
  | 'translation';

// 相關性計算
export interface RelevanceScore {
  textMatch: number;
  titleMatch: number;
  categoryMatch: number;
  dateRelevance: number;
  popularityBoost: number;
  finalScore: number;
}

export interface ScoringConfig {
  weights: {
    textMatch: number;
    titleMatch: number;
    categoryMatch: number;
    dateRelevance: number;
    popularityBoost: number;
  };
  boosts: {
    exactMatch: number;
    titleMatch: number;
    recentContent: number;
  };
}

// 搜索建議
export interface SearchSuggestion {
  type: 'completion' | 'correction' | 'related';
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

// 錯誤類型
export class SearchError extends Error {
  constructor(
    message: string,
    public code: string = 'SEARCH_ERROR',
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export class IndexError extends SearchError {
  constructor(message: string, documentId?: string) {
    super(message, 'INDEX_ERROR', { documentId });
  }
}

export class QueryError extends SearchError {
  constructor(message: string, query: string) {
    super(message, 'QUERY_ERROR', { query });
  }
} 