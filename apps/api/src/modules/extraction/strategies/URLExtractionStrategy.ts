import {
  ExtractionSource,
  ExtractionOptions,
  ExtractionResult,
  ExtractionStrategy,
  WebExtractor,
  NetworkError,
  ParseError
} from '../../../shared/types/extraction.types';
import { MacauGovernmentExtractor } from '../extractors/MacauGovernmentExtractor';
import { GenericWebExtractor } from '../extractors/GenericWebExtractor';

export class URLExtractionStrategy implements ExtractionStrategy {
  private extractors = new Map<string, WebExtractor>();

  constructor() {
    this.initializeExtractors();
  }

  private initializeExtractors(): void {
    this.extractors.set('macau-government', new MacauGovernmentExtractor());
    this.extractors.set('generic', new GenericWebExtractor());
  }

  supports(source: ExtractionSource): boolean {
    return source.type === 'url' && this.isValidUrl(source.source);
  }

  async extract(source: ExtractionSource, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!this.supports(source)) {
      throw new Error(`URLExtractionStrategy does not support source type: ${source.type}`);
    }

    const url = source.source;
    const startTime = Date.now();

    try {
      // 1. 檢測網站類型
      const siteType = this.detectSiteType(url);
      
      // 2. 選擇對應的擷取器
      const extractor = this.getExtractor(siteType);
      
      // 3. 執行擷取
      const result = await extractor.extract(url, options);
      
      // 4. 添加策略元數據
      result.metadata = {
        ...result.metadata,
        extractor: `URLExtractionStrategy:${siteType}`,
        processingTime: Date.now() - startTime,
        sourceUrl: url
      };
      
      return result;
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ParseError) {
        throw error;
      }
      
      throw new ParseError(
        `URL extraction failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private detectSiteType(url: string): string {
    const patterns = {
      'macau-government': /bo\.io\.gov\.mo/,
      'hong-kong-legislation': /legislation\.gov\.hk/,
      'taiwan-law': /law\.moj\.gov\.tw/,
      'mainland-china': /npc\.gov\.cn|chinalaw\.gov\.cn/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) {
        return type;
      }
    }
    
    return 'generic';
  }

  private getExtractor(siteType: string): WebExtractor {
    // 嘗試獲取特定擷取器，否則使用通用擷取器
    const extractor = this.extractors.get(siteType) || this.extractors.get('generic');
    
    if (!extractor) {
      throw new Error(`No extractor available for site type: ${siteType}`);
    }
    
    return extractor;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new (globalThis as any).URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // 批量URL擷取
  async extractMultipleUrls(urls: string[], options: ExtractionOptions): Promise<ExtractionResult[]> {
    const sources: ExtractionSource[] = urls.map(url => ({
      type: 'url' as const,
      source: url
    }));

    const promises = sources.map(source => this.extract(source, options));
    return Promise.all(promises);
  }

  // 獲取支持的網站類型
  getSupportedSiteTypes(): string[] {
    return Array.from(this.extractors.keys());
  }

  // 註冊新的擷取器
  registerExtractor(siteType: string, extractor: WebExtractor): void {
    this.extractors.set(siteType, extractor);
  }
} 