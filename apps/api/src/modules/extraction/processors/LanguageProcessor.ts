import {
  ExtractedContent
} from '../../../shared/types/extraction.types';

export class LanguageProcessor {
  async detectAndProcess(content: ExtractedContent): Promise<ExtractedContent> {
    // 1. 檢測主要語言
    const primaryLanguage = this.detectPrimaryLanguage(content);
    
    // 2. 分離雙語內容（如果存在）
    content = await this.separateBilingualContent(content);
    
    // 3. 語言特定的處理
    content = await this.applyLanguageSpecificProcessing(content);
    
    return content;
  }

  detectPrimaryLanguage(content: ExtractedContent): 'zh' | 'pt' | 'en' | 'mixed' {
    const zhContent = content.content.zh?.text || '';
    const ptContent = content.content.pt?.text || '';
    
    // 如果已經分離了語言內容
    if (zhContent && ptContent) {
      return 'mixed';
    }
    
    // 檢測單一內容的語言
    const allText = zhContent + ptContent;
    return this.detectLanguageFromText(allText);
  }

  private detectLanguageFromText(text: string): 'zh' | 'pt' | 'en' {
    if (!text || text.length === 0) return 'en';
    
    const textLength = text.length;
    
    // 中文字符檢測
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseRatio = chineseChars / textLength;
    
    // 葡語字符檢測
    const portugueseChars = (text.match(/[àáâãçéêíóôõú]/gi) || []).length;
    const portugueseWords = this.countPortugueseWords(text);
    const portugueseRatio = (portugueseChars + portugueseWords * 5) / textLength;
    
    // 語言判斷邏輯
    if (chineseRatio > 0.3) {
      return 'zh';
    } else if (portugueseRatio > 0.1 || this.hasPortuguesePatterns(text)) {
      return 'pt';
    } else {
      return 'en';
    }
  }

  private countPortugueseWords(text: string): number {
    const portugueseWords = [
      'de', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'por', 'ser', 
      'estar', 'ter', 'fazer', 'dizer', 'ir', 'ver', 'dar', 'saber', 
      'querer', 'ficar', 'vir', 'poder', 'dever', 'haver', 'como', 
      'mais', 'muito', 'bem', 'já', 'mesmo', 'ainda', 'aqui', 'ali',
      'então', 'depois', 'antes', 'agora', 'hoje', 'ontem', 'amanhã',
      'lei', 'decreto', 'artigo', 'regulamento', 'portaria'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => portugueseWords.includes(word)).length;
  }

  private hasPortuguesePatterns(text: string): boolean {
    const patterns = [
      /\bdo\s+de\b/i,
      /\bda\s+República\b/i,
      /\bPortaria\s+n\.º/i,
      /\bDecreto[-\s]Lei\b/i,
      /\bartigo\s+\d+/i,
      /\bn\.º\s+\d+/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  private async separateBilingualContent(content: ExtractedContent): Promise<ExtractedContent> {
    // 如果已經有分離的語言內容，直接返回
    if (content.content.zh && content.content.pt) {
      return content;
    }
    
    // 尋找需要分離的內容
    const mixedContent = content.content.zh?.text || content.content.pt?.text || '';
    const mixedHtml = content.content.zh?.html || content.content.pt?.html || '';
    
    if (mixedContent.length === 0) {
      return content;
    }
    
    // 嘗試分離雙語內容
    const separated = this.attemptLanguageSeparation(mixedContent, mixedHtml);
    
    if (separated.zh || separated.pt) {
      content.content = {};
      
      if (separated.zh) {
        content.content.zh = {
          text: separated.zh.text,
          html: separated.zh.html,
          wordCount: this.countWords(separated.zh.text)
        };
      }
      
      if (separated.pt) {
        content.content.pt = {
          text: separated.pt.text,
          html: separated.pt.html,
          wordCount: this.countWords(separated.pt.text)
        };
      }
    }
    
    return content;
  }

  private attemptLanguageSeparation(text: string, html: string): {
    zh?: { text: string; html: string };
    pt?: { text: string; html: string };
  } {
    const result: {
      zh?: { text: string; html: string };
      pt?: { text: string; html: string };
    } = {};
    
    // 按段落分離
    const paragraphs = text.split(/\n\s*\n/);
    const htmlParagraphs = html.split(/<\/p>\s*<p[^>]*>/i);
    
    let zhParagraphs: string[] = [];
    let ptParagraphs: string[] = [];
    let zhHtmlParagraphs: string[] = [];
    let ptHtmlParagraphs: string[] = [];
    
    paragraphs.forEach((paragraph, index) => {
      const lang = this.detectLanguageFromText(paragraph);
      const htmlParagraph = htmlParagraphs[index] || paragraph;
      
      if (lang === 'zh') {
        zhParagraphs.push(paragraph);
        zhHtmlParagraphs.push(htmlParagraph);
      } else if (lang === 'pt') {
        ptParagraphs.push(paragraph);
        ptHtmlParagraphs.push(htmlParagraph);
      } else {
        // 對於無法確定的段落，根據上下文或長度分配
        if (zhParagraphs.length <= ptParagraphs.length) {
          zhParagraphs.push(paragraph);
          zhHtmlParagraphs.push(htmlParagraph);
        } else {
          ptParagraphs.push(paragraph);
          ptHtmlParagraphs.push(htmlParagraph);
        }
      }
    });
    
    // 組合結果
    if (zhParagraphs.length > 0) {
      result.zh = {
        text: zhParagraphs.join('\n\n'),
        html: zhHtmlParagraphs.join('</p><p>')
      };
    }
    
    if (ptParagraphs.length > 0) {
      result.pt = {
        text: ptParagraphs.join('\n\n'),
        html: ptHtmlParagraphs.join('</p><p>')
      };
    }
    
    return result;
  }

  private async applyLanguageSpecificProcessing(content: ExtractedContent): Promise<ExtractedContent> {
    // 中文內容處理
    if (content.content.zh) {
      content.content.zh.text = this.processChineseText(content.content.zh.text);
    }
    
    // 葡文內容處理
    if (content.content.pt) {
      content.content.pt.text = this.processPortugueseText(content.content.pt.text);
    }
    
    return content;
  }

  private processChineseText(text: string): string {
    return text
      // 統一中文標點符號
      .replace(/，/g, '，')
      .replace(/。/g, '。')
      .replace(/；/g, '；')
      .replace(/：/g, '：')
      .replace(/？/g, '？')
      .replace(/！/g, '！')
      // 移除多餘的空格（中文通常不需要空格）
      .replace(/\s+(?=[\u4e00-\u9fff])/g, '')
      .replace(/(?<=[\u4e00-\u9fff])\s+/g, '')
      // 標準化數字和法條格式
      .replace(/第(\d+)條/g, '第$1條')
      .replace(/第(\d+)章/g, '第$1章');
  }

  private processPortugueseText(text: string): string {
    return text
      // 標準化葡語格式
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,.;:!?])\s*/g, '$1 ')
      // 標準化法條格式
      .replace(/artigo\s*(\d+)/gi, 'Artigo $1')
      .replace(/n\.?\s*º\s*(\d+)/gi, 'n.º $1')
      // 標準化大小寫
      .replace(/\b(lei|decreto|portaria|regulamento)\b/gi, (match) => {
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
  }

  private countWords(text: string): number {
    if (!text) return 0;
    
    // 中文字符數
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    
    // 英文/葡文單詞數
    const westernWords = text
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    return chineseChars + westernWords;
  }

  // 公共方法：獲取語言統計信息
  getLanguageStats(content: ExtractedContent): {
    languages: string[];
    primaryLanguage: string;
    distribution: Record<string, number>;
  } {
    const stats = {
      languages: [] as string[],
      primaryLanguage: 'unknown',
      distribution: {} as Record<string, number>
    };
    
    if (content.content.zh) {
      stats.languages.push('zh');
      stats.distribution.zh = content.content.zh.wordCount;
    }
    
    if (content.content.pt) {
      stats.languages.push('pt');
      stats.distribution.pt = content.content.pt.wordCount;
    }
    
    // 確定主要語言
    const totalWords = Object.values(stats.distribution).reduce((sum, count) => sum + count, 0);
    if (totalWords > 0) {
      stats.primaryLanguage = Object.entries(stats.distribution)
        .reduce((primary, [lang, count]) => 
          count > (stats.distribution[primary] || 0) ? lang : primary, 'unknown');
    }
    
    return stats;
  }
} 