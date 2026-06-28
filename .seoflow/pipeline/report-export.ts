import { StepInput, StepOutput } from '../lib/types';
import { ReportGenerator } from '../lib/reports/reports';

export interface ReportExportConfig {
  format?: 'pdf' | 'html' | 'json';
  outputDir?: string;
  filename?: string;
  includeTechnical?: boolean;
  includeContent?: boolean;
  includeSchema?: boolean;
  includeBacklinks?: boolean;
}

export function stepExportReport(input: StepInput, options: ReportExportConfig = {}): StepOutput {
  const {
    format = 'pdf',
    outputDir = 'reports',
    filename = `report-${input.slug}-${Date.now()}.${format}`,
    includeTechnical = true,
    includeContent = true,
    includeSchema = true,
    includeBacklinks = false,
  } = options;

  const changes: string[] = [];

  try {
    // Prepare report data from input
    const reportData = {
      url: input.slug,
      score: 85, // This would come from actual analysis
      issues: input.frontmatter.issues || [],
      warnings: input.frontmatter.warnings || [],
      quickWins: input.frontmatter.quickWins || [],
    };

    // Generate the report
    const outputPath = ReportGenerator.generate(reportData, {
      format,
      outputDir,
      filename,
      includeTechnical,
      includeContent,
      includeSchema,
      includeBacklinks,
    });

    changes.push(`Generated ${format.toUpperCase()} report: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to generate report: ${error}`);
    changes.push(`⚠️  Failed to generate report: ${error}`);
  }

  return {
    ...input,
    changes,
  };
}
