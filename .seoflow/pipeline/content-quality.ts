/**
 * Content quality (E-E-A-T) audit step
 *
 * Integrates Claude SEO's content_quality.py, content_humanize.py, and content_verify.py
 */

import type { StepInput, StepOutput } from '../lib/types';
import { ContentQualityAnalyzer, type ContentQualityResult } from '../lib/content-quality/content-quality';

export interface ContentQualityAuditResult {
  quality: ContentQualityResult;
  changesMade: number;
}

/**
 * Runs content quality audit and applies improvements
 */
export async function stepContentQualityAudit(input: StepInput): Promise<StepOutput & { data?: ContentQualityAuditResult }> {
  const changes: string[] = [];
  let modifiedContent = input.content;

  console.log(`     📊 Running content quality audit`);

  // Analyze content quality
  const qualityResult = ContentQualityAnalyzer.analyze(
    input.content,
    input.frontmatter.title,
    input.frontmatter.category
  );

  // Log findings
  if (qualityResult.issues.length > 0) {
    changes.push(`🔴 Content quality issues: ${qualityResult.issues.length}`);
    qualityResult.issues.forEach(issue => changes.push(`   • ${issue}`));
  }

  if (qualityResult.warnings.length > 0) {
    changes.push(`⚠️  Content quality warnings: ${qualityResult.warnings.length}`);
    qualityResult.warnings.forEach(warning => changes.push(`   • ${warning}`));
  }

  if (qualityResult.improvements.length > 0) {
    changes.push(`✅ Content quality improvements: ${qualityResult.improvements.length}`);
    qualityResult.improvements.forEach(improvement => changes.push(`   • ${improvement}`));
  }

  if (qualityResult.aiPatternCount > 0) {
    changes.push(`🤖 Found ${qualityResult.aiPatternCount} AI patterns`);
  }

  if (qualityResult.claimsNeedingCitation.length > 0) {
    changes.push(`📚 ${qualityResult.claimsNeedingCitation.length} claims need citation`);
  }

  changes.push(`📈 Quality score: ${qualityResult.score}/100, E-E-A-T: ${qualityResult.eeatScore}/100`);

  // Humanize content if needed
  if (qualityResult.aiPatternCount > 0) {
    const humanizeResult = ContentQualityAnalyzer.humanize(modifiedContent);
    if (humanizeResult.changesMade > 0) {
      modifiedContent = humanizeResult.humanizedText;
      changes.push(`✅ Humanized content: ${humanizeResult.changesMade} changes`);
      humanizeResult.aiPatternsRemoved.forEach(pattern => changes.push(`   • Removed: ${pattern}`));
    }
  }

  // Verify claims if needed
  if (qualityResult.claimsNeedingCitation.length > 0) {
    const verifyResult = ContentQualityAnalyzer.verify(
      modifiedContent,
      input.frontmatter.title
    );
    if (verifyResult.verifiedClaims > 0) {
      changes.push(`✅ Verified ${verifyResult.verifiedClaims} claims`);
    }
    if (verifyResult.claimsNeedingCitation > 0) {
      changes.push(`⚠️  Still need citation for ${verifyResult.claimsNeedingCitation} claims`);
    }
  }

  return {
    content: modifiedContent,
    frontmatter: input.frontmatter,
    changes,
    data: {
      quality: qualityResult,
      changesMade: qualityResult.aiPatternCount > 0 ? 1 : 0,
    },
  };
}
