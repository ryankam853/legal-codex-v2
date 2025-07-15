import {
  SearchEngine,
  SearchContext,
  SearchOptions,
  SearchResultItem,
  IndexDocument,
  SearchEngineStats
} from '../../../shared/types/search.types';

export class PostgreSQLSearchEngine implements SearchEngine {
  async search(context: SearchContext, options?: SearchOptions): Promise<SearchResultItem[]> {
    // 模擬PostgreSQL全文搜索
    const mockResults: SearchResultItem[] = [
      {
        id: 'pg_result_1',
        type: 'legal_text',
        title: { zh: `搜索結果：${context.normalizedQuery}` },
        snippet: { zh: `包含 "${context.normalizedQuery}" 的法律條文內容...` },
        score: 0.85,
        metadata: {
          category: '法律',
          publicationDate: new Date('2023-01-01'),
          wordCount: 1500,
          language: 'zh'
        }
      }
    ];

    return mockResults.filter(result => 
      result.title.zh?.includes(context.normalizedQuery) ||
      result.snippet.zh?.includes(context.normalizedQuery)
    );
  }

  async index(documents: IndexDocument[]): Promise<void> {
    // 模擬索引更新
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 100));
  }

  async updateIndex(documents: IndexDocument[]): Promise<void> {
    await this.index(documents);
  }

  async deleteFromIndex(documentIds: string[]): Promise<void> {
    // 模擬索引刪除
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 50));
  }

  async getStats(): Promise<SearchEngineStats> {
    return {
      documentCount: 1000,
      indexSize: 50000000, // 50MB
      lastIndexUpdate: new Date(),
      averageSearchTime: 120,
      popularQueries: [
        { query: '法律', count: 100, avgResultCount: 25 },
        { query: '規定', count: 80, avgResultCount: 15 }
      ]
    };
  }
} 