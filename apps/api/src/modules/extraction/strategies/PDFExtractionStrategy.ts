import {
  ExtractionSource,
  ExtractionOptions,
  ExtractionResult,
  ExtractionStrategy,
  ExtractedContent,
  ParseError
} from '../../../shared/types/extraction.types';

// 簡單的Buffer類型聲明
declare global {
  class Buffer {
    static from(data: string): Buffer;
    length: number;
  }
}

export class PDFExtractionStrategy implements ExtractionStrategy {
  supports(source: ExtractionSource): boolean {
    return source.type === 'pdf' && this.isPdfFile(source.source);
  }

  async extract(source: ExtractionSource, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!this.supports(source)) {
      throw new Error(`PDFExtractionStrategy does not support source type: ${source.type}`);
    }

    const startTime = Date.now();
    const filePath = source.source;

    try {
      // 1. 讀取PDF文件
      const pdfData = await this.readPdfFile(filePath);
      
      // 2. 擷取文本內容
      const textContent = await this.extractTextFromPdf(pdfData);
      
      // 3. 處理和清理文本
      const cleanedText = this.cleanText(textContent);
      
      // 4. 檢測語言
      const language = this.detectLanguage(cleanedText);
      
      // 5. 構建結果
      const extractedContent: ExtractedContent = {
        content: {}
      };

      if (language === 'zh') {
        extractedContent.content.zh = {
          text: cleanedText,
          html: this.textToHtml(cleanedText),
          wordCount: this.countWords(cleanedText)
        };
      } else {
        extractedContent.content.pt = {
          text: cleanedText,
          html: this.textToHtml(cleanedText),
          wordCount: this.countWords(cleanedText)
        };
      }

      // 6. 嘗試提取元數據
      const metadata = await this.extractMetadata(pdfData);
      if (metadata.title) {
        extractedContent.title = language === 'zh' 
          ? { zh: metadata.title }
          : { pt: metadata.title };
      }

      return {
        success: true,
        data: extractedContent,
        metadata: {
          extractedAt: new Date(),
          extractor: 'PDFExtractionStrategy',
          confidence: this.calculateConfidence(extractedContent),
          processingTime: Date.now() - startTime,
          language,
          fileSize: metadata.fileSize,
          pageCount: metadata.pageCount
        }
      };
    } catch (error) {
      throw new ParseError(
        `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private isPdfFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.pdf');
  }

  private async readPdfFile(filePath: string): Promise<Buffer> {
    // 在實際實現中，這裡應該使用fs模組讀取文件
    // 現在只是模擬實現
    return Buffer.from('PDF content placeholder');
  }

  private async extractTextFromPdf(pdfData: Buffer): Promise<string> {
    // 在實際實現中，這裡應該使用pdf-parse或類似的庫
    // 現在只是模擬實現
    return `
      模擬PDF文本內容
      這是從PDF文件中擷取的文本
      包含多行內容
      支持中文和葡文文本擷取
    `.trim();
  }

  private cleanText(text: string): string {
    return text
      // 移除多餘的空白
      .replace(/\s+/g, ' ')
      // 移除特殊字符
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // 正規化換行
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 移除多餘的換行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private detectLanguage(text: string): 'zh' | 'pt' | 'en' {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;
    
    if (chineseChars > totalChars * 0.3) {
      return 'zh';
    }
    
    // 檢查葡語特征
    const portuguesePattern = /[àáâãçéêíóôõú]|(\bde\b|\bda\b|\bdo\b|\bdas\b|\bdos\b|\bem\b|\bpara\b)/gi;
    if (portuguesePattern.test(text)) {
      return 'pt';
    }
    
    return 'en';
  }

  private textToHtml(text: string): string {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${this.escapeHtml(line)}</p>`)
      .join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private countWords(text: string): number {
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

  private async extractMetadata(pdfData: Buffer): Promise<{
    title?: string;
    fileSize: number;
    pageCount: number;
  }> {
    // 在實際實現中，這裡應該從PDF metadata中提取信息
    return {
      title: '模擬PDF標題',
      fileSize: pdfData.length,
      pageCount: 10
    };
  }

  private calculateConfidence(content: ExtractedContent): number {
    let confidence = 0.7; // PDF擷取基礎信心度
    
    if (content.title) confidence += 0.1;
    
    const totalWordCount = Object.values(content.content)
      .reduce((sum: number, lang: any) => sum + (lang?.wordCount || 0), 0);
    
    if (totalWordCount > 100) confidence += 0.1;
    if (totalWordCount > 500) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
} 