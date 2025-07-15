import {
  ExtractionSource,
  ExtractionOptions,
  ExtractionResult,
  ExtractionStrategy,
  UnsupportedSourceError,
  ExtractionError
} from '../../../shared/types/extraction.types';
import { URLExtractionStrategy } from '../strategies/URLExtractionStrategy';
import { PDFExtractionStrategy } from '../strategies/PDFExtractionStrategy';
import { DOCXExtractionStrategy } from '../strategies/DOCXExtractionStrategy';
import { ContentProcessor } from '../processors/ContentProcessor';
import { LanguageProcessor } from '../processors/LanguageProcessor';

export class TextExtractionService {
  private strategies = new Map<string, ExtractionStrategy>();
  private contentProcessor: ContentProcessor;
  private languageProcessor: LanguageProcessor;

  constructor() {
    this.contentProcessor = new ContentProcessor();
    this.languageProcessor = new LanguageProcessor();
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.registerStrategy('url', new URLExtractionStrategy());
    this.registerStrategy('pdf', new PDFExtractionStrategy());
    this.registerStrategy('docx', new DOCXExtractionStrategy());
  }

  private registerStrategy(type: string, strategy: ExtractionStrategy): void {
    this.strategies.set(type, strategy);
  }

  async extract(source: ExtractionSource, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 選擇策略
      const strategy = this.getStrategy(source.type);
      
      // 2. 驗證源
      await this.validateSource(source);
      
      // 3. 前置處理
      const preprocessedSource = await this.preprocessSource(source, options);
      
      // 4. 執行擷取
      const result = await strategy.extract(preprocessedSource, options);
      
      // 5. 後置處理
      const processedResult = await this.postprocessResult(result, options);
      
      // 6. 更新處理時間
      processedResult.metadata.processingTime = Date.now() - startTime;
      
      return processedResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
        metadata: {
          extractedAt: new Date(),
          extractor: 'TextExtractionService',
          confidence: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  private getStrategy(type: string): ExtractionStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new UnsupportedSourceError(type);
    }
    return strategy;
  }

  private async validateSource(source: ExtractionSource): Promise<void> {
    if (!source.source || typeof source.source !== 'string') {
      throw new ExtractionError('Invalid source: source must be a non-empty string');
    }

    switch (source.type) {
      case 'url':
        if (!this.isValidUrl(source.source)) {
          throw new ExtractionError('Invalid URL format');
        }
        break;
      case 'pdf':
      case 'docx':
        // 對於文件路徑，可以在這裡添加更多驗證
        break;
      default:
        throw new UnsupportedSourceError(source.type);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async preprocessSource(
    source: ExtractionSource, 
    options: ExtractionOptions
  ): Promise<ExtractionSource> {
    // 在這裡可以添加源的預處理邏輯
    // 例如：URL正規化、文件路徑處理等
    
    if (source.type === 'url') {
      source.source = this.normalizeUrl(source.source);
    }

    return source;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private async postprocessResult(
    result: ExtractionResult, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!result.success || !result.data) {
      return result;
    }

    try {
      // 1. 內容處理
      result.data = await this.contentProcessor.process(result.data, options);
      
      // 2. 語言處理
      if (options.language === 'auto' || !options.language) {
        result.data = await this.languageProcessor.detectAndProcess(result.data);
      }
      
      // 3. 計算信心度
      result.metadata.confidence = this.calculateConfidence(result.data);
      
      return result;
    } catch (error) {
      // 記錄後處理失敗，但不阻斷流程
      return result; // 返回原始結果，不阻斷流程
    }
  }

  private calculateConfidence(data: any): number {
    let confidence = 0;
    
    // 基礎分數
    if (data.title) confidence += 0.2;
    if (data.content) confidence += 0.3;
    if (data.lawNumber) confidence += 0.2;
    if (data.structure) confidence += 0.2;
    if (data.publicationDate) confidence += 0.1;
    
    // 內容質量分數
    const totalWordCount = Object.values(data.content || {})
      .reduce((sum: number, lang: any) => sum + (lang?.wordCount || 0), 0);
    
    if (totalWordCount > 100) confidence += 0.1;
    if (totalWordCount > 1000) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // 批量擷取方法
  async extractMultiple(
    sources: ExtractionSource[], 
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult[]> {
    const promises = sources.map(source => this.extract(source, options));
    return Promise.all(promises);
  }

  // 獲取支持的擷取類型
  getSupportedTypes(): string[] {
    return Array.from(this.strategies.keys());
  }

  // 檢查是否支持某種類型
  supportsType(type: string): boolean {
    return this.strategies.has(type);
  }
} 