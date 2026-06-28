/**
 * Additional CLI commands for Claude SEO features
 *
 * Extends the main seoflow CLI with Claude SEO-specific commands
 */

import { Command } from 'commander';
import { ReportGenerator } from '../reports/reports';
import { DriftMonitor } from '../drift/drift';
import { BacklinkAnalyzer } from '../backlinks/backlinks';

export class SeoFlowCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Sets up all CLI commands
   */
  private setupCommands(): void {
    // Report generation
    this.program
      .command('report <url>')
      .description('Generate an SEO report for a specific URL')
      .option('--format <format>', 'Output format (pdf, html, json)', 'pdf')
      .option('--output <dir>', 'Output directory', 'reports')
      .option('--no-technical', 'Exclude technical SEO data')
      .option('--no-content', 'Exclude content quality data')
      .option('--no-schema', 'Exclude schema data')
      .option('--include-backlinks', 'Include backlink analysis')
      .action(async (url, options) => {
        try {
          console.log(`Generating SEO report for: ${url}`);
          const reportPath = await ReportGenerator.generate(
            await this.gatherReportData(url, options),
            {
              format: options.format as 'pdf' | 'html' | 'json',
              includeTechnical: options.technical,
              includeContent: options.content,
              includeSchema: options.schema,
              includeBacklinks: options.includeBacklinks,
              outputDir: options.output,
            }
          );
          console.log(`✅ Report generated successfully: ${reportPath}`);
        } catch (error) {
          console.error('❌ Error generating report:', error);
          process.exit(1);
        }
      });

    // SEO Drift commands
    const drift = new Command('drift')
      .description('SEO drift monitoring commands');

    drift.command('baseline <url>')
      .description('Capture a new SEO baseline')
      .action(async (url) => {
        try {
          console.log(`Capturing baseline for: ${url}`);
          const baseline = DriftMonitor.captureBaseline(url);
          console.log(`✅ Baseline captured successfully (ID: ${baseline.id})`);
        } catch (error) {
          console.error('❌ Error capturing baseline:', error);
          process.exit(1);
        }
      });

    drift.command('compare <url>')
      .description('Compare current state with baseline')
      .option('--baseline <id>', 'Baseline ID to compare with')
      .action(async (url, options) => {
        try {
          console.log(`Comparing with baseline for: ${url}`);
          const comparison = DriftMonitor.compareWithBaseline(
            options.baseline || 'latest',
            url
          );
          this.displayDriftComparison(comparison);
        } catch (error) {
          console.error('❌ Error comparing with baseline:', error);
          process.exit(1);
        }
      });

    drift.command('history <url>')
      .description('Show baseline history')
      .action(async (url) => {
        try {
          const history = DriftMonitor.getHistory(url);
          this.displayHistory(history);
        } catch (error) {
          console.error('❌ Error getting history:', error);
          process.exit(1);
        }
      });

    this.program.addCommand(drift);

    // Backlink commands
    const backlinks = new Command('backlinks')
      .description('Backlink analysis commands');

    backlinks.command('analyze <url>')
      .description('Analyze backlinks for a URL')
      .option('--limit <number>', 'Limit number of backlinks', '100')
      .option('--no-bing', 'Exclude Bing Webmaster data')
      .option('--include-moz', 'Include Moz API data')
      .option('--no-commoncrawl', 'Exclude Common Crawl data')
      .action(async (url, options) => {
        try {
          console.log(`Analyzing backlinks for: ${url}`);
          const result = BacklinkAnalyzer.analyze(url, {
            includeBing: options.bing,
            includeMoz: options.includeMoz,
            includeCommonCrawl: options.commoncrawl,
            limit: parseInt(options.limit),
          });
          this.displayBacklinkAnalysis(result);
        } catch (error) {
          console.error('❌ Error analyzing backlinks:', error);
          process.exit(1);
        }
      });

    backlinks.command('verify <url>')
      .description('Verify backlinks still exist')
      .option('--file <path>', 'Path to file containing backlinks')
      .action(async (url, options) => {
        try {
          let backlinksToVerify: string[] = [];
          if (options.file) {
            const content = await fs.promises.readFile(options.file, 'utf8');
            backlinksToVerify = content.split('\n').filter(line => line.trim());
          } else {
            const analysis = BacklinkAnalyzer.analyze(url);
            backlinksToVerify = analysis.backlinks.map(bl => bl.url);
          }

          console.log(`Verifying ${backlinksToVerify.length} backlinks...`);
          const results = await BacklinkAnalyzer.verify(backlinksToVerify);

          this.displayBacklinkVerification(results);
        } catch (error) {
          console.error('❌ Error verifying backlinks:', error);
          process.exit(1);
        }
      });

    this.program.addCommand(backlinks);

    // Help
    this.program
      .helpOption('-h, --help', 'Show help information')
      .addHelpCommand('help [command]', 'Show help for a specific command');

    // Version
    this.program
      .version('0.1.0', '-v, --version', 'Show version number');
  }

  /**
   * Gathers data for report generation
   */
  private async gatherReportData(url: string, options: any): Promise<any> {
    // In a real implementation, this would run the actual audit
    return {
      url,
      score: 85,
      issues: ['Mobile performance needs improvement', 'Image alt text missing'],
      warnings: ['Readability score could be better'],
      quickWins: ['Add internal links', 'Optimize meta description'],
    };
  }

  /**
   * Displays drift comparison
   */
  private displayDriftComparison(comparison: any): void {
    console.log('\n=== SEO Drift Analysis ===');
    console.log(`\nBaseline: ${new Date(comparison.baseline.timestamp).toLocaleString()}`);
    console.log(`Current: ${new Date(comparison.current.timestamp).toLocaleString()}`);
    console.log(`\nContent Score: ${comparison.changes.contentScore.toFixed(2)}`);

    console.log('\nChanges:');
    console.log(`- Word Count: ${comparison.changes.wordCountChange > 0 ? '+' : ''}${comparison.changes.wordCountChange}`);
    console.log(`- Readability Score: ${comparison.changes.readabilityChange > 0 ? '+' : ''}${comparison.changes.readabilityChange}`);
    console.log(`- Links: ${comparison.changes.linkChanges > 0 ? '+' : ''}${comparison.changes.linkChanges}`);
    console.log(`- Images: ${comparison.changes.imageChanges > 0 ? '+' : ''}${comparison.changes.imageChanges}`);

    if (comparison.changes.keywordChanges.length > 0) {
      console.log('\nKeyword Density Changes:');
      comparison.changes.keywordChanges.forEach((change: any) => {
        const oldDensity = (change.oldDensity * 100).toFixed(2);
        const newDensity = (change.newDensity * 100).toFixed(2);
        console.log(`- ${change.keyword}: ${oldDensity}% → ${newDensity}%`);
      });
    }

    if (comparison.issues.length > 0) {
      console.log('\nIssues:');
      comparison.issues.forEach((issue: string) => console.log(`- ${issue}`));
    }

    if (comparison.warnings.length > 0) {
      console.log('\nWarnings:');
      comparison.warnings.forEach((warning: string) => console.log(`- ${warning}`));
    }
  }

  /**
   * Displays history
   */
  private displayHistory(history: any[]): void {
    console.log('=== Baseline History ===');
    history.forEach(baseline => {
      console.log(`\n${new Date(baseline.timestamp).toLocaleString()}`);
      console.log(`ID: ${baseline.id}`);
      console.log(`- Words: ${baseline.seoMetrics.wordCount}`);
      console.log(`- Readability: ${baseline.seoMetrics.readabilityScore}`);
      console.log(`- Links: ${baseline.seoMetrics.links}`);
      console.log(`- Images: ${baseline.seoMetrics.images}`);
    });
  }

  /**
   * Displays backlink analysis
   */
  private displayBacklinkAnalysis(result: any): void {
    console.log('=== Backlink Analysis ===');
    console.log(`Total Backlinks: ${result.totalBacklinks}`);
    console.log(`Unique Domains: ${result.uniqueDomains}`);
    console.log(`Referring Domains: ${result.referringDomains}`);
    console.log(`Dofollow Ratio: ${(result.dofollowRatio * 100).toFixed(1)}%`);

    if (result.backlinks.length > 0) {
      console.log('\nTop Backlinks:');
      result.backlinks.slice(0, 10).forEach((backlink: any, index: number) => {
        console.log(`${index + 1}. ${backlink.url}`);
        console.log(`   Anchor: ${backlink.anchorText}`);
        console.log(`   Domain: ${backlink.domain}`);
        if (backlink.authority) {
          console.log(`   DA: ${backlink.authority}`);
        }
      });
    }

    if (result.issues.length > 0) {
      console.log('\nIssues:');
      result.issues.forEach((issue: string) => console.log(`- ${issue}`));
    }

    if (result.opportunities.length > 0) {
      console.log('\nOpportunities:');
      result.opportunities.forEach((opportunity: string) => console.log(`- ${opportunity}`));
    }
  }

  /**
   * Displays backlink verification
   */
  private displayBacklinkVerification(results: any[]): void {
    console.log('=== Backlink Verification ===');
    const successful = results.filter(r => r.exists).length;
    const failed = results.filter(r => !r.exists).length;

    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);

    if (failed > 0) {
      console.log('\nFailed Backlinks:');
      results.filter(r => !r.exists).forEach((r: any) => {
        console.log(`- ${r.url} (Status: ${r.status})`);
      });
    }
  }

  /**
   * Runs the CLI
   */
  run(): void {
    try {
      this.program.parse(process.argv);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }
}
