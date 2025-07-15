import {
  AnnotationPosition,
  SelectionData,
  TextRange,
  PositioningResult,
  PositioningMethod,
  AnnotationMatch,
  TextNotFoundError,
  AmbiguousMatchError,
  LowConfidenceError
} from '../../../shared/types/annotation.types';
import { TextMatchingAlgorithm } from '../algorithms/TextMatchingAlgorithm';
import { ContextAnalyzer } from '../algorithms/ContextAnalyzer';
import { StructuralAnalyzer } from '../algorithms/StructuralAnalyzer';
import { HashUtil } from '../utils/hashUtils';

export class PositionService {
  private textMatchingAlgorithm: TextMatchingAlgorithm;
  private contextAnalyzer: ContextAnalyzer;
  private structuralAnalyzer: StructuralAnalyzer;
  private hashUtil: HashUtil;

  constructor() {
    this.textMatchingAlgorithm = new TextMatchingAlgorithm();
    this.contextAnalyzer = new ContextAnalyzer();
    this.structuralAnalyzer = new StructuralAnalyzer();
    this.hashUtil = new HashUtil();
  }

  async calculatePosition(textId: string, selectionData: SelectionData): Promise<AnnotationPosition> {
    const { selectedText, startOffset, endOffset, contextBefore, contextAfter } = selectionData;

    return {
      // 主要定位：絕對偏移量
      primary: {
        startOffset,
        endOffset,
        selectedText
      },

      // 輔助定位：上下文信息
      context: {
        before: contextBefore.slice(-50),
        after: contextAfter.slice(0, 50),
        hash: this.generateContextHash(contextBefore, selectedText, contextAfter)
      },

      // 結構定位：段落/章節信息
      structural: await this.structuralAnalyzer.analyze(textId, startOffset, endOffset, selectionData.elementPath),

      // 備用定位：文本指紋
      fingerprint: this.generateTextFingerprint(selectedText, contextBefore, contextAfter),

      // 元數據
      metadata: {
        createdAt: new Date(),
        textLength: selectedText.length,
        confidence: this.calculatePositionConfidence(selectionData)
      }
    };
  }

  async findAnnotationPosition(
    textContent: string, 
    position: AnnotationPosition,
    minConfidence: number = 0.7
  ): Promise<PositioningResult> {
    const startTime = Date.now();
    const strategies: Array<{
      method: PositioningMethod;
      execute: () => Promise<TextRange | null>;
    }> = [
      {
        method: 'primary_position',
        execute: () => this.findByPrimaryPosition(textContent, position)
      },
      {
        method: 'context_match',
        execute: () => this.findByContextMatch(textContent, position)
      },
      {
        method: 'text_fingerprint',
        execute: () => this.findByTextFingerprint(textContent, position)
      },
      {
        method: 'structural_path',
        execute: () => this.findByStructuralPath(textContent, position)
      },
      {
        method: 'fuzzy_match',
        execute: () => this.findByFuzzyMatch(textContent, position)
      }
    ];

    const matches: AnnotationMatch[] = [];
    const errors: string[] = [];
    const strategiesUsed: PositioningMethod[] = [];

    // 依序嘗試各種策略
    for (const strategy of strategies) {
      try {
        strategiesUsed.push(strategy.method);
        const result = await strategy.execute();
        
        if (result && this.validatePosition(result, position)) {
          const confidence = this.calculateMatchConfidence(result, position);
          
          matches.push({
            range: result,
            confidence,
            method: strategy.method,
            metadata: {
              strategy: strategy.method,
              validationPassed: true
            }
          });

          // 如果找到高信心度的匹配，直接返回
          if (confidence >= minConfidence) {
                         const currentMatch = matches[matches.length - 1];
             return {
               success: true,
               position: await this.updatePosition(position, result),
               matches: [currentMatch],
               metadata: {
                 totalAttempts: strategiesUsed.length,
                 strategiesUsed,
                 processingTime: Date.now() - startTime,
                 confidence
               }
             };
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${strategy.method}: ${errorMessage}`);
        continue;
      }
    }

    // 如果有匹配但信心度不夠
    if (matches.length > 0) {
      const bestMatch = matches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      if (bestMatch.confidence >= 0.5) { // 較低的閾值
        return {
          success: true,
          position: await this.updatePosition(position, bestMatch.range),
          matches,
          metadata: {
            totalAttempts: strategiesUsed.length,
            strategiesUsed,
            processingTime: Date.now() - startTime,
            confidence: bestMatch.confidence
          }
        };
      }
    }

    // 所有策略都失敗
    return {
      success: false,
      matches,
      errors,
      metadata: {
        totalAttempts: strategiesUsed.length,
        strategiesUsed,
        processingTime: Date.now() - startTime,
        confidence: 0
      }
    };
  }

  private async findByPrimaryPosition(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    const { startOffset, endOffset, selectedText } = position.primary;
    
    // 檢查偏移量是否有效
    if (startOffset < 0 || endOffset > textContent.length || startOffset >= endOffset) {
      return null;
    }

    // 提取指定位置的文本
    const extractedText = textContent.slice(startOffset, endOffset);
    
    // 檢查文本是否匹配
    if (extractedText === selectedText) {
      return {
        startOffset,
        endOffset,
        text: extractedText,
        confidence: 1.0
      };
    }

    // 允許輕微的差異（如空白字符變化）
    const normalizedExtracted = this.normalizeText(extractedText);
    const normalizedSelected = this.normalizeText(selectedText);
    
    if (normalizedExtracted === normalizedSelected) {
      return {
        startOffset,
        endOffset,
        text: extractedText,
        confidence: 0.9
      };
    }

    return null;
  }

  private async findByContextMatch(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    return this.textMatchingAlgorithm.findByContextMatch(textContent, position);
  }

  private async findByTextFingerprint(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    return this.textMatchingAlgorithm.findByTextFingerprint(textContent, position);
  }

  private async findByStructuralPath(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    if (!position.structural.elementPath && !position.structural.paragraphIndex) {
      return null;
    }

    return this.structuralAnalyzer.findByStructuralPath(textContent, position);
  }

  private async findByFuzzyMatch(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    return this.textMatchingAlgorithm.findByFuzzyMatch(textContent, position);
  }

  private validatePosition(result: TextRange, originalPosition: AnnotationPosition): boolean {
    // 基本驗證
    if (!result.text || result.text.length === 0) {
      return false;
    }

    // 長度檢查（允許一定範圍的變化）
    const originalLength = originalPosition.primary.selectedText.length;
    const lengthRatio = result.text.length / originalLength;
    
    if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      return false;
    }

    // 文本相似性檢查
    const similarity = this.calculateTextSimilarity(
      result.text,
      originalPosition.primary.selectedText
    );

    return similarity >= 0.6;
  }

  private calculateMatchConfidence(result: TextRange, originalPosition: AnnotationPosition): number {
    let confidence = 0;

    // 文本相似性 (40%)
    const textSimilarity = this.calculateTextSimilarity(
      result.text,
      originalPosition.primary.selectedText
    );
    confidence += textSimilarity * 0.4;

    // 位置準確性 (30%)
    const positionAccuracy = this.calculatePositionAccuracy(result, originalPosition);
    confidence += positionAccuracy * 0.3;

    // 長度一致性 (20%)
    const lengthConsistency = this.calculateLengthConsistency(result, originalPosition);
    confidence += lengthConsistency * 0.2;

    // 上下文匹配 (10%)
    const contextMatch = this.calculateContextMatch(result, originalPosition);
    confidence += contextMatch * 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);
    
    if (normalized1 === normalized2) return 0.95;

    // 使用Jaccard相似性
    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculatePositionAccuracy(result: TextRange, originalPosition: AnnotationPosition): number {
    const originalStart = originalPosition.primary.startOffset;
    const originalEnd = originalPosition.primary.endOffset;
    
    const startDiff = Math.abs(result.startOffset - originalStart);
    const endDiff = Math.abs(result.endOffset - originalEnd);
    
    // 計算相對偏差
    const textLength = originalEnd - originalStart;
    const maxAllowedDiff = Math.max(textLength * 0.1, 10); // 10%或至少10個字符
    
    const startAccuracy = Math.max(0, 1 - startDiff / maxAllowedDiff);
    const endAccuracy = Math.max(0, 1 - endDiff / maxAllowedDiff);
    
    return (startAccuracy + endAccuracy) / 2;
  }

  private calculateLengthConsistency(result: TextRange, originalPosition: AnnotationPosition): number {
    const originalLength = originalPosition.primary.selectedText.length;
    const currentLength = result.text.length;
    
    if (originalLength === 0) return currentLength === 0 ? 1 : 0;
    
    const ratio = Math.min(currentLength, originalLength) / Math.max(currentLength, originalLength);
    return ratio;
  }

  private calculateContextMatch(result: TextRange, originalPosition: AnnotationPosition): number {
    // 暫時返回固定值，實際實現中應該比較上下文
    return 0.8;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u4e00-\u9fff]/g, '')
      .toLowerCase()
      .trim();
  }

  private generateContextHash(contextBefore: string, selectedText: string, contextAfter: string): string {
    const combined = contextBefore + selectedText + contextAfter;
    return this.hashUtil.sha256(combined);
  }

  private generateTextFingerprint(selectedText: string, contextBefore: string, contextAfter: string): string {
    const combined = contextBefore + selectedText + contextAfter;
    const words = combined.split(/\s+/).filter(word => word.length > 2);
    
    // 生成3-gram指紋
    const trigrams = [];
    for (let i = 0; i < words.length - 2; i++) {
      trigrams.push(words.slice(i, i + 3).join(' '));
    }
    
    return this.hashUtil.sha256(trigrams.join('|'));
  }

  private calculatePositionConfidence(selectionData: SelectionData): number {
    let confidence = 0.5; // 基礎信心度

    // 文本長度因子
    if (selectionData.selectedText.length > 10) confidence += 0.1;
    if (selectionData.selectedText.length > 50) confidence += 0.1;

    // 上下文因子
    if (selectionData.contextBefore.length > 20) confidence += 0.1;
    if (selectionData.contextAfter.length > 20) confidence += 0.1;

    // 結構信息因子
    if (selectionData.elementPath) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  private async updatePosition(originalPosition: AnnotationPosition, newRange: TextRange): Promise<AnnotationPosition> {
    return {
      ...originalPosition,
      primary: {
        startOffset: newRange.startOffset,
        endOffset: newRange.endOffset,
        selectedText: newRange.text
      },
      metadata: {
        ...originalPosition.metadata,
        confidence: newRange.confidence || 0.8
      }
    };
  }
} 