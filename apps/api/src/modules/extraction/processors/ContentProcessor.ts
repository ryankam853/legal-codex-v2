import {
  ExtractedContent,
  ExtractionOptions
} from '../../../shared/types/extraction.types';

export class ContentProcessor {
  async process(content: ExtractedContent, options: ExtractionOptions): Promise<ExtractedContent> {
    // 1. 清理文本內容
    content = await this.cleanContent(content);
    
    // 2. 標準化格式
    content = await this.normalizeFormat(content);
    
    // 3. 驗證內容質量
    content = await this.validateContent(content);
    
    return content;
  }

  private async cleanContent(content: ExtractedContent): Promise<ExtractedContent> {
    // 處理中文內容
    if (content.content.zh) {
      content.content.zh = {
        text: this.cleanText(content.content.zh.text),
        html: this.cleanHtml(content.content.zh.html),
        wordCount: this.recalculateWordCount(this.cleanText(content.content.zh.text))
      };
    }

    // 處理葡文內容
    if (content.content.pt) {
      content.content.pt = {
        text: this.cleanText(content.content.pt.text),
        html: this.cleanHtml(content.content.pt.html),
        wordCount: this.recalculateWordCount(this.cleanText(content.content.pt.text))
      };
    }

    // 清理標題
    if (content.title) {
      if (content.title.zh) {
        content.title.zh = this.cleanTitle(content.title.zh);
      }
      if (content.title.pt) {
        content.title.pt = this.cleanTitle(content.title.pt);
      }
    }

    return content;
  }

  private cleanText(text: string): string {
    return text
      // 移除多餘的空白字符
      .replace(/\s+/g, ' ')
      // 移除控制字符
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // 統一引號
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // 統一破折號
      .replace(/[—–−]/g, '-')
      // 移除多餘的標點符號
      .replace(/\.{3,}/g, '...')
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      // 正規化換行
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanHtml(html: string): string {
    return html
      // 移除空的標籤
      .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
      // 移除多餘的空白
      .replace(/\s+/g, ' ')
      // 移除script和style標籤（防止遺漏）
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // 移除注釋
      .replace(/<!--[\s\S]*?-->/g, '')
      // 清理空的paragraph
      .replace(/<p>\s*<\/p>/g, '')
      .trim();
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/^[^\w\u4e00-\u9fff]+/, '') // 移除開頭的非字符
      .replace(/[^\w\u4e00-\u9fff]+$/, '') // 移除結尾的非字符
      .trim();
  }

  private async normalizeFormat(content: ExtractedContent): Promise<ExtractedContent> {
    // 標準化HTML結構
    if (content.content.zh?.html) {
      content.content.zh.html = this.normalizeHtmlStructure(content.content.zh.html);
    }

    if (content.content.pt?.html) {
      content.content.pt.html = this.normalizeHtmlStructure(content.content.pt.html);
    }

    return content;
  }

  private normalizeHtmlStructure(html: string): string {
    return html
      // 確保段落標籤正確閉合
      .replace(/<p([^>]*)>([^<]*?)(?=<p|$)/g, '<p$1>$2</p>')
      // 標準化heading標籤
      .replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, '<h$1$2>$3</h$1>')
      // 移除多餘的換行
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private async validateContent(content: ExtractedContent): Promise<ExtractedContent> {
    // 驗證內容質量
    const issues: string[] = [];

    // 檢查是否有實際內容
    const hasContent = this.hasValidContent(content);
    if (!hasContent) {
      issues.push('No valid content found');
    }

    // 檢查內容長度
    const contentLength = this.getTotalContentLength(content);
    if (contentLength < 10) {
      issues.push('Content too short');
    }

    // 檢查重複內容
    const hasDuplicates = this.checkForDuplicates(content);
    if (hasDuplicates) {
      issues.push('Duplicate content detected');
    }

    // 如果有問題，可以在這裡記錄或處理
    if (issues.length > 0) {
      // 可以添加警告標記或降低信心度
      // 暫時只記錄，不阻斷處理
    }

    return content;
  }

  private hasValidContent(content: ExtractedContent): boolean {
    const zhText = content.content.zh?.text || '';
    const ptText = content.content.pt?.text || '';
    
    return zhText.length > 0 || ptText.length > 0;
  }

  private getTotalContentLength(content: ExtractedContent): number {
    const zhLength = content.content.zh?.text?.length || 0;
    const ptLength = content.content.pt?.text?.length || 0;
    
    return zhLength + ptLength;
  }

  private checkForDuplicates(content: ExtractedContent): boolean {
    const zhText = content.content.zh?.text || '';
    const ptText = content.content.pt?.text || '';
    
    if (!zhText || !ptText) return false;
    
    // 簡單的重複檢測：如果兩個語言的內容過於相似
    const similarity = this.calculateSimilarity(zhText, ptText);
    return similarity > 0.8;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private recalculateWordCount(text: string): number {
    if (!text) return 0;
    
    // 中文字符數
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    
    // 英文/其他語言單詞數
    const westernWords = text
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    return chineseChars + westernWords;
  }

  // 公共方法：檢查內容質量
  getContentQuality(content: ExtractedContent): {
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 1.0;

    // 檢查內容長度
    const contentLength = this.getTotalContentLength(content);
    if (contentLength < 50) {
      issues.push('Content is very short');
      score -= 0.3;
    }

    // 檢查是否有標題
    if (!content.title || (!content.title.zh && !content.title.pt)) {
      issues.push('No title found');
      score -= 0.2;
    }

    // 檢查是否有結構化信息
    if (!content.lawNumber && !content.category && !content.publicationDate) {
      issues.push('Missing structural information');
      score -= 0.2;
    }

    return {
      score: Math.max(score, 0),
      issues
    };
  }
} 