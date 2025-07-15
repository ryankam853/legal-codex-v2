import {
  ExtractionSource,
  ExtractionOptions,
  ExtractionResult,
  ExtractionStrategy,
  ExtractedContent,
  ParseError
} from '../../../shared/types/extraction.types';

export class DOCXExtractionStrategy implements ExtractionStrategy {
  supports(source: ExtractionSource): boolean {
    return source.type === 'docx' && this.isDocxFile(source.source);
  }

  async extract(source: ExtractionSource, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!this.supports(source)) {
      throw new Error(`DOCXExtractionStrategy does not support source type: ${source.type}`);
    }

    const startTime = Date.now();
    const filePath = source.source;

    try {
      // 1. 讀取DOCX文件
      const docxContent = await this.readDocxFile(filePath);
      
      // 2. 擷取文本內容
      const textContent = await this.extractTextFromDocx(docxContent);
      
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
      const metadata = await this.extractMetadata(docxContent);
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
          extractor: 'DOCXExtractionStrategy',
          confidence: this.calculateConfidence(extractedContent),
          processingTime: Date.now() - startTime,
          language,
          fileSize: metadata.fileSize
        }
      };
    } catch (error) {
      throw new ParseError(
        `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private isDocxFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.docx');
  }

  private async readDocxFile(filePath: string): Promise<ArrayBuffer> {
    // 在實際實現中，這裡應該使用fs模組讀取文件
    // 現在只是模擬實現
    return new ArrayBuffer(1024);
  }

  private async extractTextFromDocx(docxData: ArrayBuffer): Promise<string> {
    // 在實際實現中，這裡應該使用mammoth或docx-parser等庫
    // 現在只是模擬實現
    return `
      模擬DOCX文本內容
      這是從Word文檔中擷取的文本
      支持格式化文本的處理
      包含標題、段落、列表等元素
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
      .map(line => {
        // 簡單的格式識別
        if (line.match(/^#+\s/)) {
          return `<h3>${this.escapeHtml(line.replace(/^#+\s/, ''))}</h3>`;
        }
        if (line.match(/^\*\s/)) {
          return `<li>${this.escapeHtml(line.replace(/^\*\s/, ''))}</li>`;
        }
        return `<p>${this.escapeHtml(line)}</p>`;
      })
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

  private async extractMetadata(docxData: ArrayBuffer): Promise<{
    title?: string;
    fileSize: number;
  }> {
    // 在實際實現中，這裡應該從DOCX metadata中提取信息
    return {
      title: '模擬DOCX標題',
      fileSize: docxData.byteLength
    };
  }

  private calculateConfidence(content: ExtractedContent): number {
    let confidence = 0.8; // DOCX擷取基礎信心度較高
    
    if (content.title) confidence += 0.1;
    
    const totalWordCount = Object.values(content.content)
      .reduce((sum: number, lang: any) => sum + (lang?.wordCount || 0), 0);
    
    if (totalWordCount > 100) confidence += 0.05;
    if (totalWordCount > 500) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
} 