import mongoose, { Schema, Document } from 'mongoose';

// 法律文本內容接口
export interface ILegalTextContent extends Document {
  textId: string; // PostgreSQL UUID
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
  structure: {
    chapters: Array<{
      id: string;
      title: string;
      startOffset: number;
      endOffset: number;
    }>;
    articles: Array<{
      id: string;
      number: string;
      title: string;
      startOffset: number;
      endOffset: number;
    }>;
    sections: Array<{
      id: string;
      title: string;
      startOffset: number;
      endOffset: number;
    }>;
  };
  metadata: {
    extractionMethod: 'manual' | 'url' | 'pdf' | 'docx';
    sourceUrl?: string;
    extractedAt?: Date;
    lastModified: Date;
  };
}

// 法律文本內容Schema
const LegalTextContentSchema = new Schema<ILegalTextContent>({
  textId: { type: String, required: true, unique: true, index: true },
  content: {
    zh: {
      text: { type: String },
      html: { type: String },
      wordCount: { type: Number, default: 0 }
    },
    pt: {
      text: { type: String },
      html: { type: String },
      wordCount: { type: Number, default: 0 }
    }
  },
  structure: {
    chapters: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      startOffset: { type: Number, required: true },
      endOffset: { type: Number, required: true }
    }],
    articles: [{
      id: { type: String, required: true },
      number: { type: String, required: true },
      title: { type: String, required: true },
      startOffset: { type: Number, required: true },
      endOffset: { type: Number, required: true }
    }],
    sections: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      startOffset: { type: Number, required: true },
      endOffset: { type: Number, required: true }
    }]
  },
  metadata: {
    extractionMethod: {
      type: String,
      enum: ['manual', 'url', 'pdf', 'docx'],
      required: true
    },
    sourceUrl: { type: String },
    extractedAt: { type: Date },
    lastModified: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  versionKey: false
});

// 註解位置接口
export interface IAnnotationPosition extends Document {
  annotationId: string; // PostgreSQL UUID
  textId: string; // PostgreSQL UUID
  position: {
    startOffset: number;
    endOffset: number;
    selectedText: string;
    contextHash: string;
    structuralPath?: string;
  };
  context: {
    before: string;
    after: string;
    hash: string;
  };
  fingerprint: string;
  confidence: number;
  backup: {
    fuzzyMatches: Array<{
      startOffset: number;
      endOffset: number;
      similarity: number;
    }>;
  };
}

// 註解位置Schema
const AnnotationPositionSchema = new Schema<IAnnotationPosition>({
  annotationId: { type: String, required: true, unique: true, index: true },
  textId: { type: String, required: true, index: true },
  position: {
    startOffset: { type: Number, required: true },
    endOffset: { type: Number, required: true },
    selectedText: { type: String, required: true },
    contextHash: { type: String, required: true, index: true },
    structuralPath: { type: String }
  },
  context: {
    before: { type: String, required: true },
    after: { type: String, required: true },
    hash: { type: String, required: true, index: true }
  },
  fingerprint: { type: String, required: true, index: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  backup: {
    fuzzyMatches: [{
      startOffset: { type: Number, required: true },
      endOffset: { type: Number, required: true },
      similarity: { type: Number, required: true, min: 0, max: 1 }
    }]
  }
}, {
  timestamps: true,
  versionKey: false
});

// 導出模型
export const LegalTextContent = mongoose.model<ILegalTextContent>('LegalTextContent', LegalTextContentSchema);
export const AnnotationPosition = mongoose.model<IAnnotationPosition>('AnnotationPosition', AnnotationPositionSchema); 