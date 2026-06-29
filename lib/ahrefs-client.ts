/**
 * Ahrefs API client for keyword research and backlink analysis.
 *
 * Requires AHREFS_API_KEY in env. Falls back gracefully if not set.
 *
 * Endpoint: https://apiv2.ahrefs.com
 * Docs: https://ahrefs.com/api/documentation
 */
import https from 'https';
import { PythonManager } from './python/python-manager';

export interface AhrefsKeywordResult {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  traffic: number;
  globalVolume: number;
}

export interface AhrefsResearchResult {
  focusKeyword: string;
  searchVolume: number;
  difficulty: number;
  relatedKeywords: AhrefsKeywordResult[];
  source: 'ahrefs' | 'fallback';
}

export class AhrefsClient {
  /**
   * Check if Ahrefs API key is available
   */
  static hasKey(): boolean {
    return !!process.env.AHREFS_API_KEY;
  }

  /**
   * Research keywords using Ahrefs
   */
  static async researchKeywords(
    seed: string,
    context: string = ''
  ): Promise<AhrefsResearchResult> {
    try {
      if (!this.hasKey()) {
        return this.fallbackResearch(seed);
      }

      if (!PythonManager.isPythonAvailable()) {
        return this.fallbackResearch(seed);
      }

      const result = PythonManager.run({
        scriptName: 'ahrefs_keywords',
        args: [
          `--seed "${this.escapeQuotes(seed)}"`,
          `--context "${this.escapeQuotes(context)}"`,
          `--api-key "${process.env.AHREFS_API_KEY}"`,
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
          source: 'ahrefs',
        };
      } else {
        console.error('Ahrefs research failed:', result.stderr);
        return this.fallbackResearch(seed);
      }
    } catch (error: any) {
      console.error('Ahrefs research error:', error.message);
      return this.fallbackResearch(seed);
    }
  }

  /**
   * Fallback research using basic keyword extraction
   */
  private static fallbackResearch(seed: string): AhrefsResearchResult {
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
): Promise<AhrefsResearchResult> {
  return AhrefsClient.researchKeywords(seed, context);
}
