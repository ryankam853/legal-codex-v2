import {
  AnnotationPosition,
  ContextInfo
} from '../../../shared/types/annotation.types';

export class ContextAnalyzer {
  async analyzeContext(textContent: string, startOffset: number, endOffset: number): Promise<ContextInfo> {
    const contextBefore = textContent.slice(Math.max(0, startOffset - 100), startOffset);
    const contextAfter = textContent.slice(endOffset, Math.min(textContent.length, endOffset + 100));
    const selectedText = textContent.slice(startOffset, endOffset);
    
    return {
      before: contextBefore.slice(-50),
      after: contextAfter.slice(0, 50),
      hash: this.generateHash(contextBefore + selectedText + contextAfter)
    };
  }

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
} 