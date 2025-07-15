import { SearchProcessor, SearchContext } from '../../../shared/types/search.types';

export class SynonymExpansionProcessor implements SearchProcessor {
  async process(context: SearchContext): Promise<SearchContext> {
    context.expandedTerms = this.expandSynonyms(context.normalizedQuery);
    return context;
  }

  private expandSynonyms(query: string): string[] {
    const synonyms = [
      query,
      query.replace('法律', '法規'),
      query.replace('規定', '條文'),
      query.replace('辦法', '規則')
    ];
    return [...new Set(synonyms)];
  }
} 