export interface AnnotationPosition {
  // 主要定位：絕對偏移量
  primary: {
    startOffset: number;
    endOffset: number;
    selectedText: string;
  };

  // 輔助定位：上下文信息
  context: {
    before: string; // 前50字符
    after: string;  // 後50字符
    hash: string;   // 上下文哈希
  };

  // 結構定位：段落/章節信息
  structural: {
    chapterId?: string;
    articleId?: string;
    sectionId?: string;
    paragraphIndex?: number;
    elementPath?: string; // CSS選擇器路徑
  };

  // 備用定位：文本指紋
  fingerprint: string;

  // 元數據
  metadata: {
    createdAt: Date;
    textLength: number;
    confidence: number;
    version?: string;
  };
}

export interface SelectionData {
  selectedText: string;
  startOffset: number;
  endOffset: number;
  contextBefore: string;
  contextAfter: string;
  elementPath?: string;
  pageUrl?: string;
}

export interface TextRange {
  startOffset: number;
  endOffset: number;
  text: string;
  confidence?: number;
}

export interface AnnotationMatch {
  range: TextRange;
  confidence: number;
  method: PositioningMethod;
  metadata?: Record<string, any>;
}

export type PositioningMethod = 
  | 'primary_position'
  | 'context_match'
  | 'text_fingerprint' 
  | 'structural_path'
  | 'fuzzy_match';

export interface ContextInfo {
  before: string;
  after: string;
  hash: string;
}

export interface StructuralPath {
  chapterId?: string;
  articleId?: string;
  sectionId?: string;
  paragraphIndex?: number;
  elementPath?: string;
}

export interface TextFingerprint {
  hash: string;
  trigrams: string[];
  length: number;
  wordCount: number;
}

export interface PositioningConfig {
  strategies: PositioningStrategy[];
  fallbackToFuzzy: boolean;
  maxContextLength: number;
  minConfidenceThreshold: number;
  preserveWhitespace: boolean;
}

export interface PositioningStrategy {
  method: PositioningMethod;
  weight: number;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PositioningResult {
  success: boolean;
  position?: AnnotationPosition;
  matches?: AnnotationMatch[];
  errors?: string[];
  metadata: {
    totalAttempts: number;
    strategiesUsed: PositioningMethod[];
    processingTime: number;
    confidence: number;
  };
}

// 註解核心數據結構
export interface Annotation {
  id: string;
  textId: string;
  authorId: string;
  position: AnnotationPosition;
  content: {
    text: string;
    html?: string;
    type: AnnotationType;
  };
  status: AnnotationStatus;
  isPublic: boolean;
  tags?: string[];
  replies?: AnnotationReply[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type AnnotationType = 
  | 'highlight'
  | 'comment'
  | 'note'
  | 'question'
  | 'correction'
  | 'reference';

export type AnnotationStatus = 
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'archived';

export interface AnnotationReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  isPublic: boolean;
}

// 錯誤類型
export class PositioningError extends Error {
  constructor(
    message: string,
    public code: string = 'POSITIONING_ERROR',
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'PositioningError';
  }
}

export class TextNotFoundError extends PositioningError {
  constructor(searchText: string) {
    super(`Text not found: ${searchText}`, 'TEXT_NOT_FOUND', { searchText });
  }
}

export class AmbiguousMatchError extends PositioningError {
  constructor(matchCount: number, searchText: string) {
    super(
      `Multiple matches found (${matchCount}) for text: ${searchText}`, 
      'AMBIGUOUS_MATCH',
      { matchCount, searchText }
    );
  }
}

export class LowConfidenceError extends PositioningError {
  constructor(confidence: number, threshold: number) {
    super(
      `Match confidence ${confidence} below threshold ${threshold}`,
      'LOW_CONFIDENCE',
      { confidence, threshold }
    );
  }
}

// 匹配算法相關
export interface TextMatch {
  startOffset: number;
  endOffset: number;
  text: string;
  score: number;
  method: PositioningMethod;
}

export interface SimilarityMetrics {
  textSimilarity: number;
  positionSimilarity: number;
  contextSimilarity: number;
  structuralSimilarity: number;
  overallScore: number;
}

export interface MatchCandidate {
  match: TextMatch;
  position: AnnotationPosition;
  similarity: SimilarityMetrics;
  confidence: number;
}

// 算法配置
export interface FuzzyMatchConfig {
  maxEdits: number;
  minSimilarity: number;
  contextWindow: number;
  weightByDistance: boolean;
}

export interface ContextMatchConfig {
  maxContextLength: number;
  minContextOverlap: number;
  allowPartialMatch: boolean;
  caseSensitive: boolean;
}

export interface StructuralMatchConfig {
  useElementPath: boolean;
  useParagraphIndex: boolean;
  useChapterStructure: boolean;
  tolerateStructuralChanges: boolean;
} 