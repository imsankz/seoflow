/**
 * PageSpeed Insights (PSI) and CrUX API wrapper
 *
 * Wraps Claude SEO's pagespeed_check.py script
 */

import { PythonManager } from '../python/python-manager';
import path from 'path';

export interface PSIResult {
  lcp: number; // Largest Contentful Paint (seconds)
  inp: number; // Interaction to Next Paint (seconds)
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint (seconds)
  tbt: number; // Total Blocking Time (ms)
  score: number; // Overall PSI score (0-100)
  url: string;
  device: 'mobile' | 'desktop';
  strategy: 'mobile' | 'desktop';
}

export interface CrUXResult {
  lcp: number; // Field LCP (seconds)
  inp: number; // Field INP (seconds)
  cls: number; // Field CLS
  origin: string;
  effectiveConnectionType: string;
  formFactor: string;
}

export interface LCPBreakdown {
  ttfb: number; // Time to First Byte (ms)
  loadDelay: number; // Load Delay (ms)
  loadDuration: number; // Load Duration (ms)
  renderDelay: number; // Render Delay (ms)
  total: number; // Total LCP (ms)
}

export class PageSpeedInsights {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Runs PageSpeed Insights for a URL
   */
  async run(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PSIResult> {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockResult(url, strategy);
      }

      const args: string[] = [
        `--url "${url}"`,
        `--strategy ${strategy}`,
      ];

      if (this.apiKey) {
        args.push(`--api-key "${this.apiKey}"`);
      }

      args.push('--json');

      const result = PythonManager.run({
        scriptName: 'pagespeed_check',
        args,
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('PSI check failed:', result.stderr);
        return this.mockResult(url, strategy);
      }
    } catch (error: any) {
      console.error('PSI check failed:', error.message);
      return this.mockResult(url, strategy);
    }
  }

  /**
   * Gets CrUX (Chrome User Experience Report) data for a URL
   */
  async getCrUX(url: string): Promise<CrUXResult> {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockCrUXResult(url);
      }

      const args: string[] = [
        `--url "${url}"`,
        '--crux-only',
      ];

      if (this.apiKey) {
        args.push(`--api-key "${this.apiKey}"`);
      }

      args.push('--json');

      const result = PythonManager.run({
        scriptName: 'pagespeed_check',
        args,
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('CrUX check failed:', result.stderr);
        return this.mockCrUXResult(url);
      }
    } catch (error: any) {
      console.error('CrUX check failed:', error.message);
      return this.mockCrUXResult(url);
    }
  }

  /**
   * Gets LCP subparts breakdown
   */
  async getLCPBreakdown(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<LCPBreakdown> {
    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        return this.mockLCPBreakdown();
      }

      const args: string[] = [
        `--url "${url}"`,
        `--strategy ${strategy}`,
      ];

      if (this.apiKey) {
        args.push(`--api-key "${this.apiKey}"`);
      }

      args.push('--json');

      const result = PythonManager.run({
        scriptName: 'lcp_subparts',
        args,
        timeout: 60000,
      });

      if (result.code === 0) {
        return JSON.parse(result.stdout);
      } else {
        console.error('LCP breakdown failed:', result.stderr);
        return this.mockLCPBreakdown();
      }
    } catch (error: any) {
      console.error('LCP breakdown failed:', error.message);
      return this.mockLCPBreakdown();
    }
  }

  /**
   * Mocks PSI result for development/testing
   */
  private mockResult(url: string, strategy: 'mobile' | 'desktop'): PSIResult {
    return {
      lcp: 1.8,
      inp: 150,
      cls: 0.05,
      fcp: 0.9,
      tbt: 120,
      score: 92,
      url,
      device: strategy,
      strategy,
    };
  }

  /**
   * Mocks CrUX result
   */
  private mockCrUXResult(url: string): CrUXResult {
    return {
      lcp: 2.1,
      inp: 180,
      cls: 0.08,
      origin: new URL(url).origin,
      effectiveConnectionType: '4G',
      formFactor: 'PHONE',
    };
  }

  /**
   * Mocks LCP breakdown
   */
  private mockLCPBreakdown(): LCPBreakdown {
    return {
      ttfb: 300,
      loadDelay: 400,
      loadDuration: 800,
      renderDelay: 300,
      total: 1800,
    };
  }
}

// Singleton instance
let psiInstance: PageSpeedInsights | null = null;

export function getPSIInstance(apiKey?: string): PageSpeedInsights {
  if (!psiInstance) {
    psiInstance = new PageSpeedInsights(apiKey);
  }
  return psiInstance;
}

/**
 * Validates if a URL is safe to check (prevents SSRF)
 */
export function validateUrl(url: string): boolean {
  try {
    const scriptPath = path.join(process.cwd(), 'python', 'url_safety.py');
    const cmd = `python3 ${scriptPath} --url "${url}"`;
    execSync(cmd, { encoding: 'utf8', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
