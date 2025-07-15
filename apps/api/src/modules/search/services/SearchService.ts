import {
  SearchQuery,
  SearchOptions,
  SearchResult,
  SearchContext,
  SearchProcessor,
  SearchEngine,
  SearchEngineType,
  ProcessingStep
} from '../../../shared/types/search.types';
import { QueryNormalizationProcessor } from '../processors/QueryNormalizationProcessor';
import { LanguageDetectionProcessor } from '../processors/LanguageDetectionProcessor';
import { SynonymExpansionProcessor } from '../processors/SynonymExpansionProcessor';
import { ResultRankingProcessor } from '../processors/ResultRankingProcessor';
import { PostgreSQLSearchEngine } from '../engines/PostgreSQLSearchEngine';
import { MeilisearchEngine } from '../engines/MeilisearchEngine';

export class SearchService {
  private processors: SearchProcessor[] = [];
  private engines: Map<SearchEngineType, SearchEngine> = new Map();

  constructor() {
    this.initializeProcessors();
    this.initializeEngines();
  }

  private initializeProcessors(): void {
    this.processors = [
      new QueryNormalizationProcessor(),
      new LanguageDetectionProcessor(),
      new SynonymExpansionProcessor(),
      new ResultRankingProcessor()
    ];
  }

  private initializeEngines(): void {
    this.engines = new Map([
      ['postgresql', new PostgreSQLSearchEngine()],
      ['meilisearch', new MeilisearchEngine()]
    ]);
  }

  async search(query: SearchQuery, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();

    // 1. 初始化搜索上下文
    let context: SearchContext = {
      originalQuery: query.text,
      normalizedQuery: query.text,
      language: query.language || 'auto',
      filters: query.filters || {},
      engines: options.engines || ['meilisearch', 'postgresql'],
      results: [],
      startTime,
      processingSteps: []
    };

    try {
      // 2. 責任鏈處理
      for (const processor of this.processors) {
        const stepStartTime = Date.now();
        context = await processor.process(context);
        
        context.processingSteps.push({
          name: processor.constructor.name,
          duration: Date.now() - stepStartTime,
          results: context.results.length
        });
      }

      // 3. 多引擎搜索
      const engineResults = await this.executeMultiEngineSearch(context, options);
      
      // 4. 結果合併和排序
      const mergedResults = this.mergeResults(engineResults);
      const rankedResults = await this.rankResults(mergedResults, context, options);

      // 5. 分頁處理
      const paginatedResults = this.applyPagination(rankedResults, options);

      return {
        query: context.originalQuery,
        results: paginatedResults,
        metadata: {
          totalResults: rankedResults.length,
          searchTime: Date.now() - startTime,
          engines: context.engines,
          language: context.language,
          page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
          limit: options.limit || 20,
          processingSteps: context.processingSteps
        },
        suggestions: await this.generateSuggestions(context)
      };
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeMultiEngineSearch(
    context: SearchContext, 
    options: SearchOptions
  ): Promise<Array<any[]>> {
    const searchPromises = context.engines.map(engineType => {
      const engine = this.engines.get(engineType);
      if (!engine) {
        return Promise.resolve([]);
      }
      return engine.search(context, options).catch(error => {
        // 記錄引擎錯誤但不阻斷其他引擎
        return [];
      });
    });

    return Promise.all(searchPromises);
  }

  private mergeResults(engineResults: Array<any[]>): any[] {
    const mergedResults = [];
    const seenIds = new Set<string>();

    // 合併所有引擎的結果，避免重複
    for (const results of engineResults) {
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          mergedResults.push(result);
        } else {
          // 如果已存在，取更高的分數
          const existingIndex = mergedResults.findIndex(r => r.id === result.id);
          if (existingIndex !== -1 && result.score > mergedResults[existingIndex].score) {
            mergedResults[existingIndex] = result;
          }
        }
      }
    }

    return mergedResults;
  }

  private async rankResults(results: any[], context: SearchContext, options: SearchOptions): Promise<any[]> {
    // 應用排序選項
    const sortBy = options.sortBy || [{ field: 'relevance', direction: 'desc' }];
    
    return results.sort((a, b) => {
      for (const sort of sortBy) {
        let comparison = 0;
        
        switch (sort.field) {
          case 'relevance':
            comparison = b.score - a.score;
            break;
          case 'date':
            const dateA = a.metadata.publicationDate || new Date(0);
            const dateB = b.metadata.publicationDate || new Date(0);
            comparison = dateB.getTime() - dateA.getTime();
            break;
          case 'title':
            const titleA = a.title.zh || a.title.pt || '';
            const titleB = b.title.zh || b.title.pt || '';
            comparison = titleA.localeCompare(titleB);
            break;
          case 'wordCount':
            comparison = (b.metadata.wordCount || 0) - (a.metadata.wordCount || 0);
            break;
          default:
            continue;
        }
        
        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      
      return 0;
    });
  }

  private applyPagination(results: any[], options: SearchOptions): any[] {
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    
    return results.slice(offset, offset + limit);
  }

  private async generateSuggestions(context: SearchContext): Promise<string[]> {
    // 簡化的建議生成
    const suggestions: string[] = [];
    
    // 基於查詢歷史的建議（模擬）
    if (context.originalQuery.length > 2) {
      suggestions.push(context.originalQuery + ' 法律');
      suggestions.push(context.originalQuery + ' 規定');
      suggestions.push(context.originalQuery + ' 條文');
    }
    
    return suggestions.slice(0, 5);
  }

  // 批量搜索方法
  async searchMultiple(queries: SearchQuery[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const promises = queries.map(query => this.search(query, options));
    return Promise.all(promises);
  }

  // 索引管理方法
  async indexDocument(document: any): Promise<void> {
    const indexPromises = Array.from(this.engines.values()).map(engine => 
      engine.index([document]).catch(error => {
        // 記錄錯誤但不阻斷其他引擎
      })
    );
    
    await Promise.all(indexPromises);
  }

  async updateIndex(documents: any[]): Promise<void> {
    const updatePromises = Array.from(this.engines.values()).map(engine => 
      engine.updateIndex(documents).catch(error => {
        // 記錄錯誤但不阻斷其他引擎
      })
    );
    
    await Promise.all(updatePromises);
  }

  async deleteFromIndex(documentIds: string[]): Promise<void> {
    const deletePromises = Array.from(this.engines.values()).map(engine => 
      engine.deleteFromIndex(documentIds).catch(error => {
        // 記錄錯誤但不阻斷其他引擎
      })
    );
    
    await Promise.all(deletePromises);
  }

  // 獲取搜索統計
  async getSearchStats(): Promise<any> {
    const engineStats = await Promise.all(
      Array.from(this.engines.entries()).map(async ([type, engine]) => ({
        engine: type,
        stats: await engine.getStats().catch(() => null)
      }))
    );

    return {
      engines: engineStats.filter(stat => stat.stats !== null),
      totalEngines: this.engines.size,
      lastUpdate: new Date()
    };
  }

  // 獲取支持的搜索引擎
  getSupportedEngines(): SearchEngineType[] {
    return Array.from(this.engines.keys());
  }

  // 檢查引擎健康狀態
  async checkEngineHealth(): Promise<Record<SearchEngineType, boolean>> {
    const healthChecks = await Promise.all(
      Array.from(this.engines.entries()).map(async ([type, engine]) => {
        try {
          await engine.getStats();
          return [type, true];
        } catch {
          return [type, false];
        }
      })
    );

    return Object.fromEntries(healthChecks) as Record<SearchEngineType, boolean>;
  }

  // 查詢建議
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    // 簡化的建議實現
    const suggestions = [
      query + ' 法律',
      query + ' 條文',
      query + ' 規定',
      query + ' 辦法',
      query + ' 實施'
    ];

    return suggestions.slice(0, limit);
  }
} 