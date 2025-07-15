import {
  AnnotationPosition,
  StructuralPath,
  TextRange
} from '../../../shared/types/annotation.types';

export class StructuralAnalyzer {
  async analyze(textId: string, startOffset: number, endOffset: number, elementPath?: string): Promise<StructuralPath> {
    const result: StructuralPath = {
      paragraphIndex: this.calculateParagraphIndex(startOffset)
    };

    if (elementPath) result.elementPath = elementPath;
    
    const chapterId = await this.findChapterId(textId, startOffset);
    if (chapterId) result.chapterId = chapterId;
    
    const articleId = await this.findArticleId(textId, startOffset);
    if (articleId) result.articleId = articleId;

    return result;
  }

  async findByStructuralPath(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    const structural = position.structural;
    
    if (structural.paragraphIndex !== undefined) {
      // 基於段落索引查找
      return this.findByParagraphIndex(textContent, structural.paragraphIndex, position.primary.selectedText);
    }
    
    if (structural.elementPath) {
      // 基於元素路徑查找
      return this.findByElementPath(textContent, structural.elementPath, position.primary.selectedText);
    }
    
    return null;
  }

  private calculateParagraphIndex(offset: number): number {
    // 簡化實現：假設每300個字符為一段
    return Math.floor(offset / 300);
  }

  private async findChapterId(textId: string, offset: number): Promise<string | undefined> {
    // 模擬實現，實際應該查詢數據庫
    return `chapter_${Math.floor(offset / 5000)}`;
  }

  private async findArticleId(textId: string, offset: number): Promise<string | undefined> {
    // 模擬實現，實際應該查詢數據庫
    return `article_${Math.floor(offset / 1000)}`;
  }

  private findByParagraphIndex(textContent: string, paragraphIndex: number, targetText: string): TextRange | null {
    // 簡化的段落查找邏輯
    const estimatedOffset = paragraphIndex * 300;
    const searchStart = Math.max(0, estimatedOffset - 100);
    const searchEnd = Math.min(textContent.length, estimatedOffset + 600);
    
    const searchArea = textContent.slice(searchStart, searchEnd);
    const targetIndex = searchArea.indexOf(targetText);
    
    if (targetIndex !== -1) {
      const absoluteStart = searchStart + targetIndex;
      return {
        startOffset: absoluteStart,
        endOffset: absoluteStart + targetText.length,
        text: targetText,
        confidence: 0.8
      };
    }
    
    return null;
  }

  private findByElementPath(textContent: string, elementPath: string, targetText: string): TextRange | null {
    // 簡化實現，實際應該解析CSS選擇器路徑
    const index = textContent.indexOf(targetText);
    if (index !== -1) {
      return {
        startOffset: index,
        endOffset: index + targetText.length,
        text: targetText,
        confidence: 0.9
      };
    }
    
    return null;
  }
} 