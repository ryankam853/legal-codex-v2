import { SearchProcessor, SearchContext } from '../../../shared/types/search.types';

export class ResultRankingProcessor implements SearchProcessor {
  async process(context: SearchContext): Promise<SearchContext> {
    // 對結果進行重新排序和評分
    if (context.results.length > 0) {
      context.results = this.reRankResults(context.results, context);
    }
    return context;
  }

  private reRankResults(results: any[], context: SearchContext): any[] {
    return results.map(result => ({
      ...result,
      score: this.calculateRelevanceScore(result, context)
    })).sort((a, b) => b.score - a.score);
  }

  private calculateRelevanceScore(result: any, context: SearchContext): number {
    let score = result.score || 0;
    
    // 標題匹配加分
    const titleText = result.title?.zh || result.title?.pt || '';
    if (titleText.includes(context.normalizedQuery)) {
      score += 0.2;
    }
    
    // 最近發布加分
    if (result.metadata?.publicationDate) {
      const daysSincePublication = (Date.now() - new Date(result.metadata.publicationDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublication < 365) {
        score += 0.1;
      }
    }
    
    return Math.min(score, 1.0);
  }
} 