import {
  AnnotationPosition,
  TextRange,
  TextMatch,
  PositioningMethod
} from '../../../shared/types/annotation.types';

export class TextMatchingAlgorithm {
  async findByContextMatch(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    const { context, primary } = position;
    
    // 1. 尋找上下文匹配
    const contextPattern = this.buildContextPattern(context);
    const matches = this.findMatches(textContent, contextPattern);
    
    if (matches.length === 0) {
      return null;
    }
    
    // 2. 如果有多個匹配，使用啟發式算法選擇最佳匹配
    const bestMatch = this.selectBestMatch(matches, position);
    
    // 3. 在匹配範圍內定位具體文本
    return this.locateExactText(textContent, bestMatch, primary.selectedText);
  }

  async findByTextFingerprint(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    const targetText = position.primary.selectedText;
    const fingerprint = position.fingerprint;
    
    // 使用滑動窗口尋找相似的文本段
    const windowSize = targetText.length;
    const step = Math.max(1, Math.floor(windowSize / 4));
    
    for (let i = 0; i <= textContent.length - windowSize; i += step) {
      const candidate = textContent.slice(i, i + windowSize);
      const candidateFingerprint = this.generateTextFingerprint(candidate);
      
      if (this.compareFingerprints(fingerprint, candidateFingerprint)) {
        const similarity = this.calculateTextSimilarity(targetText, candidate);
        if (similarity > 0.8) {
          return {
            startOffset: i,
            endOffset: i + windowSize,
            text: candidate,
            confidence: similarity
          };
        }
      }
    }
    
    return null;
  }

  async findByFuzzyMatch(textContent: string, position: AnnotationPosition): Promise<TextRange | null> {
    const targetText = position.primary.selectedText;
    const maxDistance = Math.floor(targetText.length * 0.2); // 允許20%的差異
    
    // 使用簡化的模糊匹配算法
    const words = targetText.split(/\s+/);
    const searchPattern = words.join('\\s*');
    
    try {
      const regex = new RegExp(searchPattern, 'gi');
      const matches = Array.from(textContent.matchAll(regex));
      
             if (matches.length > 0) {
         // 選擇最佳匹配
         const bestMatch = matches[0];
         if (bestMatch && bestMatch.index !== undefined) {
           const matchedText = bestMatch[0];
           const similarity = this.calculateTextSimilarity(targetText, matchedText);
           
           if (similarity > 0.6) {
             return {
               startOffset: bestMatch.index,
               endOffset: bestMatch.index + matchedText.length,
               text: matchedText,
               confidence: similarity
             };
           }
         }
       }
    } catch (error) {
      // 正則表達式錯誤，使用其他方法
    }
    
    // 回退到簡單的子字符串搜索
    return this.findBestSubstringMatch(textContent, targetText);
  }

  private buildContextPattern(context: any): RegExp {
    const before = this.escapeRegex(context.before || '');
    const after = this.escapeRegex(context.after || '');
    
    // 建立寬鬆的匹配模式，允許輕微變化
    const pattern = `${before}.{0,200}${after}`;
    return new RegExp(pattern, 'gi');
  }

  private findMatches(text: string, pattern: RegExp): TextMatch[] {
    const matches: TextMatch[] = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        startOffset: match.index || 0,
        endOffset: (match.index || 0) + match[0].length,
        text: match[0],
        score: 1.0,
        method: 'context_match'
      });
    }
    
    return matches;
  }

  private selectBestMatch(matches: TextMatch[], position: AnnotationPosition): TextMatch {
    if (matches.length === 0) {
      throw new Error('No matches provided');
    }
    
    if (matches.length === 1) {
      return matches[0];
    }
    
    // 使用多個因子計算匹配度
    return matches.reduce((best, current) => {
      const bestScore = this.calculateMatchScore(best, position);
      const currentScore = this.calculateMatchScore(current, position);
      return currentScore > bestScore ? current : best;
    }, matches[0]);
  }

  private calculateMatchScore(match: TextMatch, position: AnnotationPosition): number {
    let score = 0;
    
    // 位置相似度 (30%)
    score += this.calculatePositionSimilarity(match, position) * 0.3;
    
    // 文本相似度 (40%)
    score += this.calculateTextSimilarity(match.text, position.primary.selectedText) * 0.4;
    
    // 長度相似度 (30%)
    score += this.calculateLengthSimilarity(match, position) * 0.3;
    
    return score;
  }

  private calculatePositionSimilarity(match: TextMatch, position: AnnotationPosition): number {
    const originalStart = position.primary.startOffset;
    const distance = Math.abs(match.startOffset - originalStart);
    const maxDistance = Math.max(1000, originalStart * 0.1); // 相對距離
    
    return Math.max(0, 1 - distance / maxDistance);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    
    // 標準化文本
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);
    
    if (norm1 === norm2) return 0.95;
    
    // 計算Jaccard相似性
    const words1 = new Set(norm1.split(/\s+/));
    const words2 = new Set(norm2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / (union.size || 1);
  }

  private calculateLengthSimilarity(match: TextMatch, position: AnnotationPosition): number {
    const originalLength = position.primary.selectedText.length;
    const matchLength = match.text.length;
    
    if (originalLength === 0) return matchLength === 0 ? 1 : 0;
    
    const ratio = Math.min(matchLength, originalLength) / Math.max(matchLength, originalLength);
    return ratio;
  }

  private locateExactText(textContent: string, match: TextMatch, targetText: string): TextRange | null {
    // 在匹配範圍內尋找目標文本
    const searchArea = textContent.slice(match.startOffset, match.endOffset);
    const targetIndex = searchArea.indexOf(targetText);
    
    if (targetIndex !== -1) {
      const absoluteStart = match.startOffset + targetIndex;
      return {
        startOffset: absoluteStart,
        endOffset: absoluteStart + targetText.length,
        text: targetText,
        confidence: 0.95
      };
    }
    
    // 如果找不到精確匹配，返回整個匹配範圍
    return {
      startOffset: match.startOffset,
      endOffset: match.endOffset,
      text: match.text,
      confidence: 0.7
    };
  }

  private generateTextFingerprint(text: string): string {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // 生成3-gram
    const trigrams = [];
    for (let i = 0; i < words.length - 2; i++) {
      trigrams.push(words.slice(i, i + 3).join(' '));
    }
    
    return trigrams.join('|');
  }

  private compareFingerprints(fp1: string, fp2: string): boolean {
    const trigrams1 = new Set(fp1.split('|'));
    const trigrams2 = new Set(fp2.split('|'));
    
    const intersection = new Set([...trigrams1].filter(x => trigrams2.has(x)));
    const union = new Set([...trigrams1, ...trigrams2]);
    
    const similarity = intersection.size / (union.size || 1);
    return similarity > 0.3;
  }

  private findBestSubstringMatch(textContent: string, targetText: string): TextRange | null {
    const normalizedTarget = this.normalizeText(targetText);
    const normalizedContent = this.normalizeText(textContent);
    
    const index = normalizedContent.indexOf(normalizedTarget);
    if (index !== -1) {
      // 找到對應的原始位置
      const originalIndex = this.findOriginalPosition(textContent, index, normalizedTarget.length);
      if (originalIndex !== -1) {
        return {
          startOffset: originalIndex,
          endOffset: originalIndex + targetText.length,
          text: textContent.slice(originalIndex, originalIndex + targetText.length),
          confidence: 0.8
        };
      }
    }
    
    return null;
  }

  private findOriginalPosition(originalText: string, normalizedIndex: number, normalizedLength: number): number {
    // 這是一個簡化的實現，實際中需要更複雜的對應邏輯
    return normalizedIndex;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u4e00-\u9fff\s]/g, '')
      .toLowerCase()
      .trim();
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
} 