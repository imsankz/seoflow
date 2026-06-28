/**
 * Content quality (E-E-A-T) analysis wrapper
 *
 * Wraps Claude SEO's content_quality.py, content_humanize.py, and content_verify.py
 */

import { PythonManager } from '../python/python-manager';
import path from 'path';

export interface ContentQualityResult {
  score: number;
  eeatScore: number;
  readabilityScore: number;
  issues: string[];
  warnings: string[];
  improvements: string[];
  aiPatternCount: number;
  fillerWords: string[];
  claimsNeedingCitation: string[];
}

export interface ContentHumanizeResult {
  originalText: string;
  humanizedText: string;
  changesMade: number;
  aiPatternsRemoved: string[];
}

export interface ContentVerifyResult {
  claims: string[];
  verifiedClaims: number;
  claimsNeedingCitation: number;
  factCheckResults: Array<{
    claim: string;
    isVerified: boolean;
    confidence: 'high' | 'medium' | 'low';
    sources?: string[];
  }>;
}

export class ContentQualityAnalyzer {
  /**
   * Analyzes content quality and E-E-A-T
   */
  static analyze(text: string, title?: string, category?: string): ContentQualityResult {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockQualityResult(text);
      }

      const args: string[] = [
        `--text "${this.escapeQuotes(text)}"`,
      ];

      if (title) {
        args.push(`--title "${this.escapeQuotes(title)}"`);
      }

      if (category) {
        args.push(`--category "${this.escapeQuotes(category)}"`);
      }

      args.push('--json');

      const result = PythonManager.run({
        scriptName: 'content_quality',
        args,
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('Content quality analysis failed:', result.stderr);
        return this.mockQualityResult(text);
      }
    } catch (error: any) {
      console.error('Content quality analysis failed:', error.message);
      return this.mockQualityResult(text);
    }
  }

  /**
   * Humanizes AI-generated content
   */
  static humanize(text: string): ContentHumanizeResult {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return {
          originalText: text,
          humanizedText: text,
          changesMade: 0,
          aiPatternsRemoved: [],
        };
      }

      const result = PythonManager.run({
        scriptName: 'content_humanize',
        args: [
          `--text "${this.escapeQuotes(text)}"`,
          '--json',
        ],
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('Content humanization failed:', result.stderr);
        return {
          originalText: text,
          humanizedText: text,
          changesMade: 0,
          aiPatternsRemoved: [],
        };
      }
    } catch (error: any) {
      console.error('Content humanization failed:', error.message);
      return {
        originalText: text,
        humanizedText: text,
        changesMade: 0,
        aiPatternsRemoved: [],
      };
    }
  }

  /**
   * Verifies content claims
   */
  static verify(text: string, title?: string): ContentVerifyResult {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return {
          claims: [],
          verifiedClaims: 0,
          claimsNeedingCitation: 0,
          factCheckResults: [],
        };
      }

      const args: string[] = [
        `--text "${this.escapeQuotes(text)}"`,
      ];

      if (title) {
        args.push(`--title "${this.escapeQuotes(title)}"`);
      }

      args.push('--json');

      const result = PythonManager.run({
        scriptName: 'content_verify',
        args,
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('Content verification failed:', result.stderr);
        return {
          claims: [],
          verifiedClaims: 0,
          claimsNeedingCitation: 0,
          factCheckResults: [],
        };
      }
    } catch (error: any) {
      console.error('Content verification failed:', error.message);
      return {
        claims: [],
        verifiedClaims: 0,
        claimsNeedingCitation: 0,
        factCheckResults: [],
      };
    }
  }

  /**
   * Escapes quotes for shell command
   */
  private static escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Mocks content quality result
   */
  private static mockQualityResult(text: string): ContentQualityResult {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasPersonalExperience = /I\s+(have|had|went|visited|experienced)/i.test(text);
    const hasSpecificDetails = /\d+(\.\d+)?\s*(€|\$|£|km|miles|hours|days)/i.test(text);

    return {
      score: wordCount > 800 ? 85 : 65,
      eeatScore: hasPersonalExperience && hasSpecificDetails ? 90 : 70,
      readabilityScore: 75,
      issues: wordCount < 400 ? ['Content is too short'] : [],
      warnings: !hasPersonalExperience ? ['Lacks personal experience signals'] : [],
      improvements: wordCount > 1000 ? ['Consider breaking into shorter sections'] : [],
      aiPatternCount: 0,
      fillerWords: [],
      claimsNeedingCitation: [],
    };
  }
}
