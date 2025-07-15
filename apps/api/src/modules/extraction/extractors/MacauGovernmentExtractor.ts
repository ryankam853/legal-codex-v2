import {
  ExtractionOptions,
  ExtractionResult,
  ExtractedContent,
  WebExtractor,
  NetworkError,
  ParseError,
  StructuredData
} from '../../../shared/types/extraction.types';

interface CheerioAPI {
  (selector: string): any;
  load?: (content: string) => CheerioAPI;
}

export class MacauGovernmentExtractor implements WebExtractor {
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private readonly TIMEOUT = 30000; // 30 seconds

  async extract(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 獲取網頁內容
      const response = await this.fetchContent(url, options);
      
      // 2. 解析HTML
      const $ = await this.loadHTML(response);
      
      // 3. 移除無關元素
      this.removeUnwantedElements($);
      
      // 4. 擷取結構化數據
      const structuredData = this.extractStructuredData($, url);
      
      // 5. 處理雙語內容
      const content = this.processBilingualContent(structuredData, options);
      
      return {
        success: true,
        data: content,
        metadata: {
          sourceUrl: url,
          extractedAt: new Date(),
          extractor: 'MacauGovernmentExtractor',
          confidence: this.calculateConfidence(content),
          processingTime: Date.now() - startTime,
          language: this.detectPrimaryLanguage(structuredData)
        }
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      
      throw new ParseError(
        `Macau government extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  detectSiteType(url: string): string {
    if (/bo\.io\.gov\.mo/.test(url)) {
      return 'macau-government';
    }
    return 'unknown';
  }

  private async fetchContent(url: string, options: ExtractionOptions): Promise<string> {
    try {
      // 在Node.js環境中，我們需要使用fetch API或類似的HTTP客戶端
      // 這裡我們暫時模擬fetch的行為
      const headers = {
        'User-Agent': options.userAgent || this.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8,pt;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        ...options.headers
      };

      // 在實際實現中，這裡應該使用真實的HTTP請求
      // 例如使用 axios 或 node-fetch
      const response = await this.makeHttpRequest(url, headers, options.timeout || this.TIMEOUT);
      
      return response;
    } catch (error) {
      throw new NetworkError(url, error instanceof Error ? error : undefined);
    }
  }

  private async makeHttpRequest(url: string, headers: Record<string, string>, timeout: number): Promise<string> {
    // 模擬HTTP請求，在實際實現中應該使用真實的HTTP客戶端
    // 這裡只是為了類型檢查通過
    return Promise.resolve(`
      <html>
        <head>
          <title>澳門特別行政區公報</title>
        </head>
        <body>
          <h1>法律文本標題</h1>
          <div class="content">
            <p>法律內容...</p>
          </div>
        </body>
      </html>
    `);
  }

  private async loadHTML(htmlContent: string): Promise<CheerioAPI> {
    // 在實際實現中，這裡應該使用 cheerio 或類似的HTML解析器
    // 這裡只是模擬API
    const mockCheerio = (selector: string) => ({
      find: (s: string) => mockCheerio(s),
      text: () => '模擬文本內容',
      html: () => '<p>模擬HTML內容</p>',
      remove: () => mockCheerio(selector),
      each: (fn: (i: number, el: any) => void) => {},
      length: 1,
      eq: (index: number) => mockCheerio(selector)
    });
    
    return mockCheerio as any;
  }

  private removeUnwantedElements($: CheerioAPI): void {
    // 移除廣告、導航、頁腳等無關元素
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.advertisement',
      '.sidebar',
      '.breadcrumb',
      '.pagination',
      '#comments'
    ];

    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
  }

  private extractStructuredData($: CheerioAPI, url: string): StructuredData {
    // 法律編號擷取
    const lawNumber = this.extractLawNumber($);
    
    // 標題擷取
    const title = this.extractTitle($);
    
    // 內容擷取
    const content = this.extractContent($);
    
    // 發布日期擷取
    const publicationDate = this.extractPublicationDate($);
    
    // 分類擷取
    const category = this.extractCategory($);

    const result: StructuredData = {
      title,
      content
    };

    if (lawNumber) result.lawNumber = lawNumber;
    if (publicationDate) result.publicationDate = publicationDate;
    if (category) result.category = category;

    return result;
  }

  private extractLawNumber($: CheerioAPI): string | undefined {
    // 嘗試從多個可能的位置提取法律編號
    const patterns = [
      /第\s*(\d+\/\d+)\s*號/,
      /Law\s+No\.\s*(\d+\/\d+)/i,
      /Lei\s+n\.º\s*(\d+\/\d+)/i
    ];

    const text = $('title, h1, h2, .law-number, .document-number').text();
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractTitle($: CheerioAPI): { zh?: string; pt?: string } {
    const title: { zh?: string; pt?: string } = {};
    
    // 嘗試提取中文標題
    const chineseTitle = $('h1, .title-zh, .chinese-title').text().trim();
    if (chineseTitle && this.isChinese(chineseTitle)) {
      title.zh = chineseTitle;
    }
    
    // 嘗試提取葡文標題
    const portugueseTitle = $('.title-pt, .portuguese-title').text().trim();
    if (portugueseTitle && this.isPortuguese(portugueseTitle)) {
      title.pt = portugueseTitle;
    }

    return title;
  }

  private extractContent($: CheerioAPI): { zh?: string; pt?: string } {
    const content: { zh?: string; pt?: string } = {};
    
    // 提取主要內容區域
    const mainContent = $('.content, .main-content, .article-content, .law-content').html() || '';
    
    // 簡單的語言分離邏輯（實際應用中需要更複雜的算法）
    if (this.isChinese(mainContent)) {
      content.zh = mainContent;
    }
    
    if (this.isPortuguese(mainContent)) {
      content.pt = mainContent;
    }

    return content;
  }

  private extractPublicationDate($: CheerioAPI): Date | undefined {
    const dateText = $('.publication-date, .date, .publish-date').text();
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日/
    ];

    for (const pattern of datePatterns) {
      const match = dateText.match(pattern);
      if (match) {
        // 根據不同的格式構建日期
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(year, month - 1, day);
        }
      }
    }

    return undefined;
  }

  private extractCategory($: CheerioAPI): string | undefined {
    const categoryText = $('.category, .type, .law-type').text().trim();
    
    const categories = [
      '行政法規',
      '法律',
      '批示',
      '決議',
      'Administrative Regulation',
      'Law',
      'Dispatch',
      'Resolution'
    ];

    for (const category of categories) {
      if (categoryText.includes(category)) {
        return category;
      }
    }

    return undefined;
  }

  private processBilingualContent(
    structuredData: StructuredData, 
    options: ExtractionOptions
  ): ExtractedContent {
    const content: ExtractedContent = {
      title: structuredData.title,
      content: {}
    };

    if (structuredData.lawNumber) content.lawNumber = structuredData.lawNumber;
    if (structuredData.publicationDate) content.publicationDate = structuredData.publicationDate;
    if (structuredData.category) content.category = structuredData.category;

    // 處理中文內容
    if (structuredData.content.zh) {
      content.content.zh = {
        text: this.htmlToText(structuredData.content.zh),
        html: structuredData.content.zh,
        wordCount: this.countWords(structuredData.content.zh)
      };
    }

    // 處理葡文內容
    if (structuredData.content.pt) {
      content.content.pt = {
        text: this.htmlToText(structuredData.content.pt),
        html: structuredData.content.pt,
        wordCount: this.countWords(structuredData.content.pt)
      };
    }

    return content;
  }

  private isChinese(text: string): boolean {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    return chineseChars ? chineseChars.length > text.length * 0.3 : false;
  }

  private isPortuguese(text: string): boolean {
    const portugueseChars = text.match(/[àáâãçéêíóôõú]/gi);
    const portugueseWords = /\b(de|da|do|das|dos|em|para|com|por|ser|estar|ter|fazer|dizer|ir|ver|dar|saber|querer|ficar|vir|poder|dever|haver|como|mais|muito|bem|já|mesmo|ainda|aqui|ali|então|depois|antes|agora|hoje|ontem|amanhã)\b/gi;
    
    return (portugueseChars && portugueseChars.length > 0) || portugueseWords.test(text);
  }

  private htmlToText(html: string): string {
    // 簡單的HTML轉文本實現
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private countWords(text: string): number {
    const cleanText = this.htmlToText(text);
    
    // 中文字符數計算
    const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
    
    // 英文/葡文單詞數計算
    const westernWords = cleanText
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    return chineseChars + westernWords;
  }

  private detectPrimaryLanguage(data: StructuredData): string {
    const zhContent = data.content.zh || '';
    const ptContent = data.content.pt || '';
    
    if (zhContent.length > ptContent.length) {
      return 'zh';
    } else if (ptContent.length > 0) {
      return 'pt';
    }
    
    return 'unknown';
  }

  private calculateConfidence(content: ExtractedContent): number {
    let confidence = 0;
    
    // 基礎分數
    if (content.title && (content.title.zh || content.title.pt)) confidence += 0.2;
    if (content.content && (content.content.zh || content.content.pt)) confidence += 0.4;
    if (content.lawNumber) confidence += 0.2;
    if (content.publicationDate) confidence += 0.1;
    if (content.category) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
} 