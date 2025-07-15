import { SearchProcessor, SearchContext } from '../../../shared/types/search.types';

export class QueryNormalizationProcessor implements SearchProcessor {
  async process(context: SearchContext): Promise<SearchContext> {
    // 標準化查詢文本
    context.normalizedQuery = this.normalizeQuery(context.originalQuery);
    
    return context;
  }

  private normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u4e00-\u9fff\s]/g, '');
  }
} 