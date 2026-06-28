import { PythonManager } from '../python/python-manager';
import path from 'path';
import fs from 'fs';

export interface ReportData {
  type: 'cwv-audit' | 'gsc-performance' | 'indexation' | 'full';
  domain: string;
  data: any;
}

export class PDFGenerator {
  /**
   * Generates a PDF report using the Claude SEO report generator
   */
  static generate(data: ReportData, outputPath: string): string {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write data to a temporary JSON file
    const tempDataPath = path.join(outputDir, `temp-report-data-${Date.now()}.json`);
    fs.writeFileSync(tempDataPath, JSON.stringify(data.data, null, 2));

    try {
      // Check if Python is available
      if (!PythonManager.isPythonAvailable()) {
        throw new Error('Python not available - install Python 3.10+');
      }

      // Check dependencies
      const { missing } = PythonManager.checkDependencies();
      if (missing.length > 0) {
        console.warn(`Missing Python dependencies: ${missing.join(', ')}`);
        console.warn('Attempting to install dependencies...');
        const installResult = PythonManager.installDependencies();
        if (installResult.code !== 0) {
          throw new Error(`Failed to install dependencies: ${installResult.stderr}`);
        }
        console.log('Dependencies installed successfully');
      }

      // Run the Python report generator
      const result = PythonManager.run({
        scriptName: 'google_report',
        args: [
          `--type ${data.type}`,
          `--data "${tempDataPath}"`,
          `--domain ${data.domain}`,
          `--output "${outputPath}"`,
        ],
        timeout: 120000, // 2 minutes
      });

      if (result.code === 0 && fs.existsSync(outputPath)) {
        console.log(`PDF report generated successfully: ${outputPath}`);
        return outputPath;
      } else {
        const errorMsg = result.stderr || 'PDF report generation failed - no file created';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error}`);
    } finally {
      // Cleanup temporary file
      if (fs.existsSync(tempDataPath)) {
        fs.unlinkSync(tempDataPath);
      }
    }
  }

  /**
   * Generates a simple PDF report with audit results
   */
  static generateSimpleReport(data: any, domain: string, outputPath: string): string {
    const reportData: ReportData = {
      type: 'full',
      domain,
      data: {
        timestamp: new Date().toISOString(),
        domain,
        ...data,
      },
    };

    return this.generate(reportData, outputPath);
  }

  /**
   * Generates an audit report PDF
   */
  static generateAuditReport(results: any, domain: string, outputPath: string): string {
    const reportData: ReportData = {
      type: 'full',
      domain,
      data: {
        timestamp: new Date().toISOString(),
        domain,
        ...results,
      },
    };

    return this.generate(reportData, outputPath);
  }
}
