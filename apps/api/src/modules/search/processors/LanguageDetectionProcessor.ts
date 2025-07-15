import { SearchProcessor, SearchContext } from '../../../shared/types/search.types';

export class LanguageDetectionProcessor implements SearchProcessor {
  async process(context: SearchContext): Promise<SearchContext> {
    if (context.language === 'auto') {
      context.detectedLanguage = this.detectLanguage(context.normalizedQuery);
      context.language = context.detectedLanguage;
    }
    
    return context;
  }

  private detectLanguage(text: string): 'zh' | 'pt' | 'en' {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;
    
    if (chineseChars > totalChars * 0.3) {
      return 'zh';
    }
    
    const portuguesePattern = /[àáâãçéêíóôõú]/gi;
    if (portuguesePattern.test(text)) {
      return 'pt';
    }
    
    return 'en';
  }
} 