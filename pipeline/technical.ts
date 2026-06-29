/**
 * Technical SEO audit step — uses PageSpeed Insights and CrUX API
 *
 * Integrates Claude SEO's pagespeed_check.py for technical SEO analysis
 */

import type { StepInput, StepOutput } from '../lib/types';
import { getPSIInstance, validateUrl, type PSIResult, type CrUXResult, type LCPBreakdown } from '../lib/technical/psi';
import { checkBrokenLinks, checkRedirectChains } from '../lib/technical/broken-links';

export interface TechnicalAuditResult {
  psi: PSIResult;
  crux?: CrUXResult;
  lcpBreakdown?: LCPBreakdown;
  brokenLinks?: any[];
  redirectChains?: any[];
  issues: string[];
  warnings: string[];
  quickWins: string[];
}

/**
 * Runs technical SEO audit
 */
export async function stepTechnicalAudit(input: StepInput): Promise<StepOutput & { data?: TechnicalAuditResult }> {
  const changes: string[] = [];

  // Validate URL
  if (!validateUrl(input.slug)) {
    changes.push('⚠️  URL validation failed');
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }

  // Get PSI instance with API key from config
  const psi = getPSIInstance(process.env.GOOGLE_API_KEY);

  try {
    console.log(`     📊 Running technical SEO audit for ${input.slug}`);

    // Run PSI, CrUX, and other checks
    const [psiResult, cruxResult, lcpBreakdown, brokenLinks, redirectChains, canonicalTag, hreflangTags] = await Promise.all([
      psi.run(input.slug),
      psi.getCrUX(input.slug),
      psi.getLCPBreakdown(input.slug),
      checkBrokenLinks(input.slug),
      checkRedirectChains(input.slug),
      checkCanonicalTag(input.slug),
      checkHreflangTags(input.slug),
    ]);

    const auditResult = analyzeTechnicalData(psiResult, cruxResult, lcpBreakdown, brokenLinks, redirectChains, canonicalTag, hreflangTags);

    // Log findings
    if (auditResult.issues.length > 0) {
      changes.push(`🔴 Technical issues found: ${auditResult.issues.length}`);
      auditResult.issues.forEach(issue => changes.push(`   • ${issue}`));
    }

    if (auditResult.warnings.length > 0) {
      changes.push(`⚠️  Technical warnings: ${auditResult.warnings.length}`);
      auditResult.warnings.forEach(warning => changes.push(`   • ${warning}`));
    }

    if (auditResult.quickWins.length > 0) {
      changes.push(`✅ Quick wins: ${auditResult.quickWins.length}`);
      auditResult.quickWins.forEach(win => changes.push(`   • ${win}`));
    }

    changes.push(`📈 PSI score: ${auditResult.psi.score}/100 (LCP: ${auditResult.psi.lcp}s, INP: ${auditResult.psi.inp}ms, CLS: ${auditResult.psi.cls})`);
    if (auditResult.crux) {
      changes.push(`🌐 CrUX: LCP ${auditResult.crux.lcp}s, INP ${auditResult.crux.inp}ms, CLS ${auditResult.crux.cls}`);
    }

    return {
      content: input.content,
      frontmatter: input.frontmatter,
      changes,
      data: auditResult,
    };
  } catch (error: any) {
    console.error(`     ❌ Technical audit failed: ${error.message}`);
    changes.push(`⚠️  Technical audit failed: ${error.message}`);
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }
}

/**
 * Analyzes technical SEO data
 */
function analyzeTechnicalData(
  psi: PSIResult,
  crux?: CrUXResult,
  lcpBreakdown?: LCPBreakdown,
  brokenLinks?: any[],
  redirectChains?: any[],
  canonicalTag?: string,
  hreflangTags?: string[]
): TechnicalAuditResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const quickWins: string[] = [];

  // Canonical tag
  if (canonicalTag) {
    const expectedCanonical = psi.url;
    if (canonicalTag !== expectedCanonical) {
      warnings.push(`Canonical tag mismatch: ${canonicalTag} (expected: ${expectedCanonical})`);
    } else {
      quickWins.push('Canonical tag is correct');
    }
  } else {
    warnings.push('No canonical tag found');
  }

  // Hreflang tags
  if (hreflangTags && hreflangTags.length > 0) {
    quickWins.push(`Found ${hreflangTags.length} hreflang tags`);
  }

  // Broken links
  if (brokenLinks && brokenLinks.length > 0) {
    const broken = brokenLinks.filter((link: any) => link.isBroken);
    if (broken.length > 0) {
      issues.push(`Found ${broken.length} broken links`);
      broken.forEach((link: any) => {
        issues.push(`  • ${link.url} (${link.status} ${link.statusText})`);
      });
    }
  }

  // Redirect chains
  if (redirectChains && redirectChains.length > 0) {
    const longChains = redirectChains.filter((chain: any) => chain.chain.length > 2);
    if (longChains.length > 0) {
      warnings.push(`Found ${longChains.length} long redirect chains`);
      longChains.forEach((chain: any) => {
        warnings.push(`  • ${chain.url} (${chain.chain.length} redirects)`);
      });
    }

    const loops = redirectChains.filter((chain: any) => chain.isRedirectLoop);
    if (loops.length > 0) {
      issues.push(`Found ${loops.length} redirect loops`);
      loops.forEach((loop: any) => {
        issues.push(`  • ${loop.url} (redirect loop)`);
      });
    }
  }

  // Core Web Vitals thresholds
  const CWV_THRESHOLDS = {
    lcp: { good: 2.5, poor: 4.0 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
  };

  // PSI (Lab) metrics
  if (psi.lcp > CWV_THRESHOLDS.lcp.poor) {
    issues.push(`LCP is poor (${psi.lcp}s)`);
  } else if (psi.lcp > CWV_THRESHOLDS.lcp.good) {
    warnings.push(`LCP needs improvement (${psi.lcp}s)`);
  }

  if (psi.inp > CWV_THRESHOLDS.inp.poor) {
    issues.push(`INP is poor (${psi.inp}ms)`);
  } else if (psi.inp > CWV_THRESHOLDS.inp.good) {
    warnings.push(`INP needs improvement (${psi.inp}ms)`);
  }

  if (psi.cls > CWV_THRESHOLDS.cls.poor) {
    issues.push(`CLS is poor (${psi.cls})`);
  } else if (psi.cls > CWV_THRESHOLDS.cls.good) {
    warnings.push(`CLS needs improvement (${psi.cls})`);
  }

  // CrUX (Field) metrics
  if (crux) {
    if (crux.lcp > CWV_THRESHOLDS.lcp.poor) {
      issues.push(`Field LCP is poor (${crux.lcp}s)`);
    } else if (crux.lcp > CWV_THRESHOLDS.lcp.good) {
      warnings.push(`Field LCP needs improvement (${crux.lcp}s)`);
    }

    if (crux.inp > CWV_THRESHOLDS.inp.poor) {
      issues.push(`Field INP is poor (${crux.inp}ms)`);
    } else if (crux.inp > CWV_THRESHOLDS.inp.good) {
      warnings.push(`Field INP needs improvement (${crux.inp}ms)`);
    }

    if (crux.cls > CWV_THRESHOLDS.cls.poor) {
      issues.push(`Field CLS is poor (${crux.cls})`);
    } else if (crux.cls > CWV_THRESHOLDS.cls.good) {
      warnings.push(`Field CLS needs improvement (${crux.cls})`);
    }
  }

  // LCP breakdown analysis
  if (lcpBreakdown) {
    if (lcpBreakdown.ttfb > 800) {
      warnings.push(`TTFB is high (${lcpBreakdown.ttfb}ms)`);
      quickWins.push('Optimize server response time');
    }

    if (lcpBreakdown.loadDuration > 1000) {
      warnings.push(`LCP load duration is high (${lcpBreakdown.loadDuration}ms)`);
      quickWins.push('Optimize LCP image/video');
    }
  }

  // PSI score
  if (psi.score < 50) {
    issues.push(`Overall PSI score is poor (${psi.score}/100)`);
  } else if (psi.score < 85) {
    warnings.push(`Overall PSI score needs improvement (${psi.score}/100)`);
  } else {
    quickWins.push('PSI score is excellent!');
  }

  return {
    psi,
    crux,
    lcpBreakdown,
    issues,
    warnings,
    quickWins,
  };
}
