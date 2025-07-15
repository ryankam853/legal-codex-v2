import {
  ExtractionOptions,
  ExtractionResult,
  ExtractedContent,
  WebExtractor,
  NetworkError,
  ParseError
} from '../../../shared/types/extraction.types';

export class GenericWebExtractor implements WebExtractor {
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private readonly TIMEOUT = 30000;

  async extract(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 獲取網頁內容
      const htmlContent = await this.fetchContent(url, options);
      
      // 2. 解析並清理內容
      const content = this.parseAndCleanContent(htmlContent);
      
      // 3. 構建提取結果
      const extractedContent: ExtractedContent = {
        content: {
          zh: {
            text: content.text,
            html: content.html,
            wordCount: this.countWords(content.text)
          }
        }
      };

      // 4. 嘗試提取標題
      const title = this.extractTitle(htmlContent);
      if (title) {
        extractedContent.title = { zh: title };
      }

      return {
        success: true,
        data: extractedContent,
        metadata: {
          sourceUrl: url,
          extractedAt: new Date(),
          extractor: 'GenericWebExtractor',
          confidence: this.calculateConfidence(extractedContent),
          processingTime: Date.now() - startTime,
          language: this.detectLanguage(content.text)
        }
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      
      throw new ParseError(
        `Generic web extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  detectSiteType(url: string): string {
    return 'generic';
  }

  private async fetchContent(url: string, options: ExtractionOptions): Promise<string> {
    try {
      // 模擬HTTP請求
      const headers = {
        'User-Agent': options.userAgent || this.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        ...options.headers
      };

      // 在實際實現中應該使用真實的HTTP客戶端
      return this.makeHttpRequest(url, headers, options.timeout || this.TIMEOUT);
    } catch (error) {
      throw new NetworkError(url, error instanceof Error ? error : undefined);
    }
  }

  private async makeHttpRequest(url: string, headers: Record<string, string>, timeout: number): Promise<string> {
    // 模擬實現
    return `
      <html>
        <head>
          <title>通用網頁標題</title>
        </head>
        <body>
          <h1>標題</h1>
          <div class="content">
            <p>通用網頁內容...</p>
          </div>
        </body>
      </html>
    `;
  }

  private parseAndCleanContent(html: string): { text: string; html: string } {
    // 簡單的HTML清理實現
    // 在實際應用中應該使用proper HTML parser like cheerio
    
    // 移除script和style標籤
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // 提取主要內容區域
    const contentPatterns = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<body[^>]*>([\s\S]*?)<\/body>/i
    ];

    let mainContent = cleanHtml;
    for (const pattern of contentPatterns) {
      const match = cleanHtml.match(pattern);
      if (match) {
        mainContent = match[1];
        break;
      }
    }

    // 轉換為純文本
    const text = this.htmlToText(mainContent);

    return {
      text,
      html: mainContent
    };
  }

  private extractTitle(html: string): string | undefined {
    // 提取標題
    const titlePatterns = [
      /<title[^>]*>(.*?)<\/title>/i,
      /<h1[^>]*>(.*?)<\/h1>/i,
      /<h2[^>]*>(.*?)<\/h2>/i
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match.length > 1 && match[1]) {
        const titleText = match[1];
        const title = this.htmlToText(titleText).trim();
        if (title.length > 0 && title.length < 200) {
          return title;
        }
      }
    }

    return undefined;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
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

  private detectLanguage(text: string): string {
    if (!text) return 'unknown';
    
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

  private calculateConfidence(content: ExtractedContent): number {
    let confidence = 0;
    
    if (content.title) confidence += 0.2;
    if (content.content && Object.keys(content.content).length > 0) confidence += 0.5;
    
    // 內容質量評估
    const totalWordCount = Object.values(content.content)
      .reduce((sum: number, lang: any) => sum + (lang?.wordCount || 0), 0);
    
    if (totalWordCount > 50) confidence += 0.1;
    if (totalWordCount > 200) confidence += 0.1;
    if (totalWordCount > 500) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
} 