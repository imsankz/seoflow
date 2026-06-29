/**
 * SEO report generation
 *
 * Wraps Claude SEO's google_report.py for PDF report generation
 */

import { PDFGenerator } from './pdf-generator';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ReportOptions {
  format?: 'pdf' | 'html' | 'json';
  includeTechnical?: boolean;
  includeContent?: boolean;
  includeSchema?: boolean;
  includeBacklinks?: boolean;
  outputDir?: string;
  filename?: string;
}

export interface ReportData {
  url: string;
  score: number;
  issues: string[];
  warnings: string[];
  quickWins: string[];
  technical?: any;
  content?: any;
  schema?: any;
  backlinks?: any;
}

export class ReportGenerator {
  /**
   * Generates an SEO report
   */
  static generate(data: ReportData, options: ReportOptions = {}): string {
    const {
      format = 'pdf',
      includeTechnical = true,
      includeContent = true,
      includeSchema = true,
      includeBacklinks = false,
      outputDir = 'reports',
      filename = `seoflow-report-${Date.now()}.${format}`,
    } = options;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);

    try {
      if (format === 'pdf') {
        // Use PDF generator for PDF format
        return PDFGenerator.generateSimpleReport(data, new URL(data.url).hostname, outputPath);
      } else {
        // Use other formats directly
        const scriptPath = path.join(process.cwd(), 'python', 'google_report.py');
        const cmd = this.buildCommand(data, format, includeTechnical, includeContent, includeSchema, includeBacklinks, outputPath);

        execSync(cmd, { encoding: 'utf8', stdio: 'ignore' });

        if (fs.existsSync(outputPath)) {
          console.log(`✅ Report generated: ${outputPath}`);
          return outputPath;
        } else {
          throw new Error(`Report file not generated at: ${outputPath}`);
        }
      }
    } catch (error: any) {
      console.error('Report generation failed:', error.message);

      // Fallback to JSON if PDF fails
      if (format === 'pdf') {
        return this.generateFallbackJSONReport(data, outputPath.replace('.pdf', '.json'));
      }

      throw error;
    }
  }

  /**
   * Builds the Python command
   */
  private static buildCommand(
    data: ReportData,
    format: string,
    includeTechnical: boolean,
    includeContent: boolean,
    includeSchema: boolean,
    includeBacklinks: boolean,
    outputPath: string
  ): string {
    const args = [
      'python3',
      path.join(process.cwd(), 'python', 'google_report.py'),
      '--url', `"${data.url}"`,
      '--score', data.score.toString(),
      '--output', `"${outputPath}"`,
      '--format', format,
    ];

    if (includeTechnical && data.technical) {
      args.push('--technical', `"${JSON.stringify(data.technical)}"`);
    }

    if (includeContent && data.content) {
      args.push('--content', `"${JSON.stringify(data.content)}"`);
    }

    if (includeSchema && data.schema) {
      args.push('--schema', `"${JSON.stringify(data.schema)}"`);
    }

    if (includeBacklinks && data.backlinks) {
      args.push('--backlinks', `"${JSON.stringify(data.backlinks)}"`);
    }

    // Add issues, warnings, and quick wins
    if (data.issues.length > 0) {
      args.push('--issues', `"${JSON.stringify(data.issues)}"`);
    }

    if (data.warnings.length > 0) {
      args.push('--warnings', `"${JSON.stringify(data.warnings)}"`);
    }

    if (data.quickWins.length > 0) {
      args.push('--quick-wins', `"${JSON.stringify(data.quickWins)}"`);
    }

    return args.join(' ');
  }

  /**
   * Generates a fallback JSON report if PDF fails
   */
  private static generateFallbackJSONReport(data: ReportData, outputPath: string): string {
    const report = {
      generatedAt: new Date().toISOString(),
      version: '1.0',
      data,
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ Fallback report generated: ${outputPath}`);
    return outputPath;
  }

  /**
   * Generates a report from a list of posts
   */
  static generateBatchReport(posts: Array<{
    slug: string;
    url: string;
    score: number;
    issues: string[];
    warnings: string[];
    quickWins: string[];
    data?: any;
  }>, options: ReportOptions = {}): string {
    const batchData: ReportData = {
      url: 'Batch Report',
      score: Math.round(posts.reduce((sum, post) => sum + post.score, 0) / posts.length),
      issues: posts.flatMap(post => post.issues.map(issue => `${post.slug}: ${issue}`)),
      warnings: posts.flatMap(post => post.warnings.map(warning => `${post.slug}: ${warning}`)),
      quickWins: posts.flatMap(post => post.quickWins.map(win => `${post.slug}: ${win}`)),
      content: posts.map(post => ({
        slug: post.slug,
        score: post.score,
        issues: post.issues.length,
        warnings: post.warnings.length,
        quickWins: post.quickWins.length,
      })),
    };

    return this.generate(batchData, options);
  }
}
