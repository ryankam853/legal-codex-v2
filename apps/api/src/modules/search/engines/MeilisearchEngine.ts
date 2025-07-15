import {
  SearchEngine,
  SearchContext,
  SearchOptions,
  SearchResultItem,
  IndexDocument,
  SearchEngineStats
} from '../../../shared/types/search.types';

export class MeilisearchEngine implements SearchEngine {
  async search(context: SearchContext, options?: SearchOptions): Promise<SearchResultItem[]> {
    // 模擬Meilisearch搜索
    const mockResults: SearchResultItem[] = [
      {
        id: 'meili_result_1',
        type: 'legal_text',
        title: { zh: `Meilisearch結果：${context.normalizedQuery}` },
        snippet: { zh: `高效搜索包含 "${context.normalizedQuery}" 的內容...` },
        score: 0.92,
        metadata: {
          category: '行政法規',
          publicationDate: new Date('2023-06-01'),
          wordCount: 2000,
          language: 'zh'
        },
        highlights: [
          {
            field: 'content',
            text: `...包含<mark>${context.normalizedQuery}</mark>的重要內容...`,
            start: 10,
            end: 30
          }
        ]
      }
    ];

    return mockResults;
  }

  async index(documents: IndexDocument[]): Promise<void> {
    // 模擬Meilisearch索引
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 200));
  }

  async updateIndex(documents: IndexDocument[]): Promise<void> {
    await this.index(documents);
  }

  async deleteFromIndex(documentIds: string[]): Promise<void> {
    // 模擬文檔刪除
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 100));
  }

  async getStats(): Promise<SearchEngineStats> {
    return {
      documentCount: 800,
      indexSize: 30000000, // 30MB
      lastIndexUpdate: new Date(),
      averageSearchTime: 50,
      popularQueries: [
        { query: '法規', count: 120, avgResultCount: 30 },
        { query: '條文', count: 95, avgResultCount: 20 }
      ]
    };
  }
} 