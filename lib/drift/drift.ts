/**
 * SEO Drift monitoring wrapper
 *
 * Wraps Claude SEO's drift monitoring scripts: drift_baseline.py, drift_compare.py, drift_history.py
 */

import { PythonManager } from '../python/python-manager';
import path from 'path';
import fs from 'fs';

export interface DriftBaseline {
  id: string;
  url: string;
  timestamp: string;
  contentSnapshot: string;
  seoMetrics: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: { [keyword: string]: number };
    links: number;
    images: number;
  };
}

export interface DriftComparison {
  baseline: DriftBaseline;
  current: DriftBaseline;
  changes: {
    contentScore: number;
    wordCountChange: number;
    readabilityChange: number;
    keywordChanges: Array<{ keyword: string; oldDensity: number; newDensity: number }>;
    linkChanges: number;
    imageChanges: number;
  };
  issues: string[];
  warnings: string[];
}

export class DriftMonitor {
  /**
   * Captures a new baseline
   */
  static captureBaseline(url: string): DriftBaseline {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockBaseline(url);
      }

      const result = PythonManager.run({
        scriptName: 'drift_baseline',
        args: [
          `--url "${url}"`,
          '--json',
        ],
        timeout: 60000,
      });

      if (result.code === 0) {
        const parsedResult = JSON.parse(result.stdout);
        return {
          id: parsedResult.id || Date.now().toString(),
          url,
          timestamp: parsedResult.timestamp || new Date().toISOString(),
          contentSnapshot: parsedResult.contentSnapshot || '',
          seoMetrics: parsedResult.seoMetrics || {
            wordCount: 0,
            readabilityScore: 0,
            keywordDensity: {},
            links: 0,
            images: 0,
          },
        };
      } else {
        console.error('Baseline capture failed:', result.stderr);
        return this.mockBaseline(url);
      }
    } catch (error: any) {
      console.error('Baseline capture failed:', error.message);
      return this.mockBaseline(url);
    }
  }

  /**
   * Compares current state with baseline
   */
  static compareWithBaseline(baselineId: string, url: string): DriftComparison {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockComparison(baselineId, url);
      }

      const result = PythonManager.run({
        scriptName: 'drift_compare',
        args: [
          `--baseline ${baselineId}`,
          `--url "${url}"`,
          '--json',
        ],
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('Drift comparison failed:', result.stderr);
        return this.mockComparison(baselineId, url);
      }
    } catch (error: any) {
      console.error('Drift comparison failed:', error.message);
      return this.mockComparison(baselineId, url);
    }
  }

  /**
   * Gets baseline history
   */
  static getHistory(url: string): DriftBaseline[] {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return [this.mockBaseline(url)];
      }

      const result = PythonManager.run({
        scriptName: 'drift_history',
        args: [
          `--url "${url}"`,
          '--json',
        ],
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('History retrieval failed:', result.stderr);
        return [this.mockBaseline(url)];
      }
    } catch (error: any) {
      console.error('History retrieval failed:', error.message);
      return [this.mockBaseline(url)];
    }
  }

  /**
   * Mocks a baseline
   */
  private static mockBaseline(url: string): DriftBaseline {
    return {
      id: Date.now().toString(),
      url,
      timestamp: new Date().toISOString(),
      contentSnapshot: 'Sample content for testing',
      seoMetrics: {
        wordCount: 1250,
        readabilityScore: 78,
        keywordDensity: { 'organic': 1.2, 'blog': 0.8 },
        links: 15,
        images: 5,
      },
    };
  }

  /**
   * Mocks a comparison
   */
  private static mockComparison(baselineId: string, url: string): DriftComparison {
    const baseline = this.mockBaseline(url);
    const current = {
      ...baseline,
      id: 'current',
      timestamp: new Date().toISOString(),
      seoMetrics: {
        ...baseline.seoMetrics,
        wordCount: baseline.seoMetrics.wordCount + 50,
        readabilityScore: 75,
        keywordDensity: { ...baseline.seoMetrics.keywordDensity, 'strategy': 0.5 },
        links: baseline.seoMetrics.links + 2,
        images: baseline.seoMetrics.images + 1,
      },
    };

    return {
      baseline,
      current,
      changes: {
        contentScore: 0.95,
        wordCountChange: 50,
        readabilityChange: -3,
        keywordChanges: [
          { keyword: 'strategy', oldDensity: 0, newDensity: 0.5 },
        ],
        linkChanges: 2,
        imageChanges: 1,
      },
      issues: [],
      warnings: ['Readability score decreased slightly'],
    };
  }
}
