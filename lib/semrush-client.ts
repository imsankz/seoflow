import { PythonManager } from './python/python-manager';

export interface SEMrushKeywordResult {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competition: number;
}

export interface SEMrushResearchResult {
  focusKeyword: string;
  searchVolume: number;
  difficulty: number;
  relatedKeywords: SEMrushKeywordResult[];
  source: 'semrush' | 'fallback';
}

/**
 * SEMrush keyword research client using Python wrapper
 */
export class SEMrushClient {
  /**
   * Check if SEMrush API key is available
   */
  static hasKey(): boolean {
    return !!process.env.SEMRUSH_API_KEY;
  }

  /**
   * Research keywords using SEMrush
   */
  static async researchKeywords(
    seed: string,
    context: string = ''
  ): Promise<SEMrushResearchResult> {
    try {
      if (!this.hasKey()) {
        return this.fallbackResearch(seed);
      }

      if (!PythonManager.isPythonAvailable()) {
        return this.fallbackResearch(seed);
      }

      const result = PythonManager.run({
        scriptName: 'semrush_keywords',
        args: [
          `--seed "${this.escapeQuotes(seed)}"`,
          `--context "${this.escapeQuotes(context)}"`,
          `--api-key "${process.env.SEMRUSH_API_KEY}"`,
          '--json',
        ],
        timeout: 60000,
      });

      if (result.code === 0) {
        const data = JSON.parse(result.stdout);
        return {
          focusKeyword: data.focusKeyword || seed,
          searchVolume: data.searchVolume || 0,
          difficulty: data.difficulty || 0,
          relatedKeywords: data.relatedKeywords || [],
          source: 'semrush',
        };
      } else {
        console.error('SEMrush research failed:', result.stderr);
        return this.fallbackResearch(seed);
      }
    } catch (error: any) {
      console.error('SEMrush research error:', error.message);
      return this.fallbackResearch(seed);
    }
  }

  /**
   * Fallback research using basic keyword extraction
   */
  private static fallbackResearch(seed: string): SEMrushResearchResult {
    return {
      focusKeyword: seed,
      searchVolume: 0,
      difficulty: 0,
      relatedKeywords: [],
      source: 'fallback',
    };
  }

  /**
   * Escape quotes for shell command
   */
  private static escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

/**
 * Helper function for keyword research
 */
export async function researchKeywords(
  seed: string,
  context: string = ''
): Promise<SEMrushResearchResult> {
  return SEMrushClient.researchKeywords(seed, context);
}
