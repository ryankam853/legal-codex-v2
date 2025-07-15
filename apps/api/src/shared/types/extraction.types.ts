export interface ExtractionSource {
  type: 'url' | 'pdf' | 'docx' | 'text';
  source: string; // URL or file path
  metadata?: Record<string, any>;
}

export interface ExtractionOptions {
  language?: 'zh' | 'pt' | 'en' | 'auto';
  extractImages?: boolean;
  preserveFormatting?: boolean;
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
  metadata: ExtractionMetadata;
}

export interface ExtractedContent {
  title?: {
    zh?: string;
    pt?: string;
  };
  content: {
    zh?: {
      text: string;
      html: string;
      wordCount: number;
    };
    pt?: {
      text: string;
      html: string;
      wordCount: number;
    };
  };
  structure?: {
    chapters: Chapter[];
    articles: Article[];
    sections: Section[];
  };
  lawNumber?: string;
  publicationDate?: Date;
  category?: string;
}

export interface Chapter {
  id: string;
  title: {
    zh?: string;
    pt?: string;
  };
  level: number;
  startOffset: number;
  endOffset: number;
  articles: string[]; // Article IDs
}

export interface Article {
  id: string;
  number: string;
  title?: {
    zh?: string;
    pt?: string;
  };
  content: {
    zh?: string;
    pt?: string;
  };
  startOffset: number;
  endOffset: number;
  chapterId?: string;
}

export interface Section {
  id: string;
  title: {
    zh?: string;
    pt?: string;
  };
  level: number;
  startOffset: number;
  endOffset: number;
  articleId?: string;
}

export interface ExtractionMetadata {
  sourceUrl?: string;
  extractedAt: Date;
  extractor: string;
  confidence: number;
  language?: string;
  processingTime: number;
  fileSize?: number;
  pageCount?: number;
}

export interface TextRange {
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface StructuredData {
  lawNumber?: string;
  title: {
    zh?: string;
    pt?: string;
  };
  content: {
    zh?: string;
    pt?: string;
  };
  publicationDate?: Date;
  category?: string;
}

// 策略接口
export interface ExtractionStrategy {
  extract(source: ExtractionSource, options: ExtractionOptions): Promise<ExtractionResult>;
  supports(source: ExtractionSource): boolean;
}

export interface WebExtractor {
  extract(url: string, options: ExtractionOptions): Promise<ExtractionResult>;
  detectSiteType(url: string): string;
}

// 錯誤類型
export class ExtractionError extends Error {
  constructor(
    message: string,
    public code: string = 'EXTRACTION_ERROR',
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export class UnsupportedSourceError extends ExtractionError {
  constructor(sourceType: string) {
    super(`Unsupported source type: ${sourceType}`, 'UNSUPPORTED_SOURCE');
  }
}

export class NetworkError extends ExtractionError {
  constructor(url: string, originalError?: Error) {
    super(`Network error accessing: ${url}`, 'NETWORK_ERROR', {
      url,
      originalError: originalError?.message
    });
  }
}

export class ParseError extends ExtractionError {
  constructor(content: string, originalError?: Error) {
    super(`Failed to parse content`, 'PARSE_ERROR', {
      contentLength: content.length,
      originalError: originalError?.message
    });
  }
} 