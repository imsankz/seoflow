/**
 * SEO content brief generator for SEOFlow
 *
 * Generates research-backed content briefs with competitor analysis,
 * per-section word counts, keyword density guidance, and page-type templates.
 */

import type { ClusterKeyword } from './cluster';

export interface Competitor {
  url: string;
  title: string;
  h2Sections: string[];
  estimatedWords: number;
  score: number; // 0-40
  mainGap: string;
}

export interface ContentGap {
  type: 'topic' | 'depth' | 'quality';
  description: string;
  impact: number; // 1-10
  effort: number; // 1-10
  priority: number; // 1-10 (impact / effort)
}

export interface ContentSection {
  heading: string;
  wordCount: number;
  format: 'paragraph' | 'bullet' | 'table' | 'definition' | 'faq';
  keywordGuidance: string;
  featuredSnippetTarget: boolean;
}

export interface ContentBrief {
  primaryKeyword: string;
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  targetAudience: string;
  competitors: Competitor[];
  contentGaps: ContentGap[];
  outline: ContentSection[];
  targetWordCount: number;
  recommendedMeta: {
    title: string;
    description: string;
  };
  uniqueAngle: string;
  eeatRequirements: string[];
  internalLinking: Array<{ anchor: string; url: string }>;
}

// Competitor scoring weights
const COMPETITOR_SCORE_WEIGHTS = {
  depth: 0.3,       // How comprehensive the content is
  formatting: 0.2,  // Readability, structure
  seo: 0.3,         // On-page SEO signals
  ux: 0.2,          // User experience
};

/**
 * Analyzes competitors for the target keyword
 * In real implementation, this would fetch actual SERP data
 */
export async function analyzeCompetitors(keyword: string): Promise<Competitor[]> {
  // Simulated competitors - in production, this would use WebSearch or DataForSEO
  const competitors: Competitor[] = [
    {
      url: 'https://example.com/best-product',
      title: `The Best ${keyword} in 2024 - Top 10 Reviews`,
      h2Sections: [
        'Introduction',
        'How We Tested',
        'Top 10 Products',
        'Buying Guide',
        'FAQ',
        'Conclusion',
      ],
      estimatedWords: 2800,
      score: 32,
      mainGap: 'Missing price comparison table',
    },
    {
      url: 'https://example.org/product-review',
      title: `${keyword} Review - Is It Worth Buying?`,
      h2Sections: [
        'Overview',
        'Features',
        'Pros and Cons',
        'Performance',
        'Pricing',
        'Conclusion',
      ],
      estimatedWords: 1800,
      score: 28,
      mainGap: 'Shallow feature comparison',
    },
    {
      url: 'https://test.com/product-guide',
      title: `Complete Guide to ${keyword} - Everything You Need to Know`,
      h2Sections: [
        'What Is It?',
        'Key Features',
        'How to Use',
        'Tips and Tricks',
        'FAQ',
      ],
      estimatedWords: 2200,
      score: 30,
      mainGap: 'Missing real-world use cases',
    },
  ];

  return competitors;
}

/**
 * Identifies content gaps from competitor analysis
 */
export function identifyContentGaps(competitors: Competitor[]): ContentGap[] {
  const gaps: ContentGap[] = [];

  // Analyze topic gaps
  const allSections = new Set<string>();
  competitors.forEach(comp => {
    comp.h2Sections.forEach(section => allSections.add(section.toLowerCase()));
  });

  // Common sections that should exist
  const expectedSections = ['introduction', 'how we tested', 'buying guide', 'faq', 'conclusion'];
  expectedSections.forEach(section => {
    if (!allSections.has(section.toLowerCase())) {
      gaps.push({
        type: 'topic',
        description: `Missing "${section}" section`,
        impact: 8,
        effort: 2,
        priority: 4,
      });
    }
  });

  // Depth gaps based on section coverage
  competitors.forEach(comp => {
    const sectionCount = comp.h2Sections.length;
    if (sectionCount < 6) {
      gaps.push({
        type: 'depth',
        description: `${comp.title} has shallow section coverage (only ${sectionCount} H2 sections)`,
        impact: 6,
        effort: 3,
        priority: 2,
      });
    }
  });

  // Quality gaps
  competitors.forEach(comp => {
    if (!comp.h2Sections.some(s => s.toLowerCase().includes('faq') || s.toLowerCase().includes('questions'))) {
      gaps.push({
        type: 'quality',
        description: `${comp.title} missing FAQ section with common questions`,
        impact: 7,
        effort: 2,
        priority: 3.5,
      });
    }
  });

  return gaps.sort((a, b) => b.priority - a.priority);
}

/**
 * Generates content outline based on competitors and gaps
 */
export function generateOutline(keyword: string, competitors: Competitor[], gaps: ContentGap[]): ContentSection[] {
  const outline: ContentSection[] = [];

  // Standard sections
  outline.push({
    heading: 'Introduction',
    wordCount: 200,
    format: 'paragraph',
    keywordGuidance: 'Use primary keyword in first 100 words',
    featuredSnippetTarget: false,
  });

  outline.push({
    heading: 'How We Selected and Tested',
    wordCount: 300,
    format: 'paragraph',
    keywordGuidance: 'Use secondary keywords: "how to choose", "testing methodology"',
    featuredSnippetTarget: true,
  });

  // Competitor sections
  const competitorSections = new Set<string>();
  competitors.forEach(comp => {
    comp.h2Sections.forEach(section => {
      if (!['introduction', 'conclusion', 'faq'].includes(section.toLowerCase())) {
        competitorSections.add(section);
      }
    });
  });

  competitorSections.forEach(section => {
    outline.push({
      heading: section,
      wordCount: 400,
      format: 'paragraph',
      keywordGuidance: `Use relevant secondary keywords for this section`,
      featuredSnippetTarget: false,
    });
  });

  // Gap sections
  gaps.forEach(gap => {
    if (gap.type === 'topic') {
      const sectionName = gap.description.replace('Missing "', '').replace('" section', '');
      outline.push({
        heading: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
        wordCount: 300,
        format: 'paragraph',
        keywordGuidance: `Focus on addressing this gap: ${gap.description}`,
        featuredSnippetTarget: true,
      });
    }
  });

  outline.push({
    heading: 'Frequently Asked Questions',
    wordCount: 400,
    format: 'faq',
    keywordGuidance: 'Use long-tail question keywords',
    featuredSnippetTarget: true,
  });

  outline.push({
    heading: 'Conclusion',
    wordCount: 200,
    format: 'paragraph',
    keywordGuidance: 'Include primary keyword and clear recommendation',
    featuredSnippetTarget: false,
  });

  return outline;
}

/**
 * Generates recommended meta tags
 */
export function generateMetaTags(keyword: string): { title: string; description: string } {
  const title = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - Expert Reviews and Buying Guide`;
  const description = `Complete guide to ${keyword}. Expert reviews, buying tips, and comparisons to help you make the best choice in 2024.`;

  // Ensure title length is between 50-60 characters
  let finalTitle = title;
  if (finalTitle.length > 60) {
    finalTitle = title.slice(0, 57) + '...';
  }

  // Ensure meta description is between 130-150 characters
  let finalDescription = description;
  if (finalDescription.length > 150) {
    finalDescription = description.slice(0, 147) + '...';
  }

  return {
    title: finalTitle,
    description: finalDescription,
  };
}

/**
 * Generates unique content angle
 */
export function generateUniqueAngle(keyword: string, competitors: Competitor[]): string {
  return `Our unique angle combines real-world testing with data-driven analysis, focusing on ${keyword} that offer the best value for money. We include side-by-side comparisons of key features and highlight hidden benefits that other reviews miss.`;
}

/**
 * Generates E-E-A-T requirements
 */
export function generateEEATRequirements(keyword: string): string[] {
  return [
    'Include author bio with relevant expertise in the field',
    'Cite specific sources for any claims or statistics',
    'Add last updated date to ensure content freshness',
    'Include real-world examples and case studies',
    'Add clear disclosure statements if applicable',
  ];
}

/**
 * Generates internal linking suggestions
 */
export function generateInternalLinks(keyword: string): Array<{ anchor: string; url: string }> {
  return [
    { anchor: 'related products', url: '/related-products' },
    { anchor: 'buying guide', url: '/buying-guide' },
    { anchor: 'best practices', url: '/best-practices' },
    { anchor: 'beginner tips', url: '/beginner-tips' },
  ];
}

/**
 * Main content brief generation workflow
 */
export async function generateContentBrief(keyword: string): Promise<ContentBrief> {
  console.log(`🔍 Analyzing competitors for "${keyword}"...`);
  const competitors = await analyzeCompetitors(keyword);

  console.log(`🔍 Identifying content gaps...`);
  const gaps = identifyContentGaps(competitors);

  console.log(`🔍 Generating outline...`);
  const outline = generateOutline(keyword, competitors, gaps);

  const totalWordCount = outline.reduce((sum, section) => sum + section.wordCount, 0);

  const brief: ContentBrief = {
    primaryKeyword: keyword,
    searchIntent: 'commercial', // Default for product reviews
    targetAudience: 'Buyers researching ' + keyword + ' who want to compare options and make informed decisions',
    competitors,
    contentGaps: gaps,
    outline,
    targetWordCount: totalWordCount,
    recommendedMeta: generateMetaTags(keyword),
    uniqueAngle: generateUniqueAngle(keyword, competitors),
    eeatRequirements: generateEEATRequirements(keyword),
    internalLinking: generateInternalLinks(keyword),
  };

  console.log(`✅ Content brief generated: ${totalWordCount} words, ${outline.length} sections`);

  return brief;
}

/**
 * Saves content brief to file
 */
export function saveContentBrief(brief: ContentBrief, dir: string = 'content-briefs'): void {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const slug = brief.primaryKeyword.toLowerCase().replace(/\s+/g, '-');
  const mdPath = path.join(dir, `${slug}-brief.md`);
  fs.writeFileSync(mdPath, contentBriefToMarkdown(brief));

  const jsonPath = path.join(dir, `${slug}-brief.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(brief, null, 2));

  console.log(`✅ Content brief saved to ${dir}`);
}

/**
 * Converts content brief to markdown format
 */
function contentBriefToMarkdown(brief: ContentBrief): string {
  let md = `# Content Brief: ${brief.primaryKeyword}\n\n`;

  md += `## Search Intent\n${brief.targetAudience}\n\n`;

  md += `## Competitor Analysis\n`;
  md += `| # | URL | Key H2 Sections | Est. Words | Score | Main Gap |\n`;
  md += `|---|-----|-----------------|------------|-------|----------|\n`;
  brief.competitors.forEach((comp, idx) => {
    md += `| ${idx + 1} | ${comp.url} | ${comp.h2Sections.slice(0, 3).join(', ')}${comp.h2Sections.length > 3 ? ', ...' : ''} | ${comp.estimatedWords} | ${comp.score}/40 | ${comp.mainGap} |\n`;
  });
  md += `\n`;

  md += `## Content Gaps and Opportunities\n`;
  brief.contentGaps.forEach(gap => {
    md += `- **${gap.type} gap**: ${gap.description} (Impact: ${gap.impact}/10, Effort: ${gap.effort}/10, Priority: ${gap.priority.toFixed(1)})\n`;
  });
  md += `\n`;

  md += `## Winning Outline\n\n`;
  md += `**H1**: ${brief.primaryKeyword.charAt(0).toUpperCase() + brief.primaryKeyword.slice(1)}\n`;
  md += `**URL Slug**: /${brief.primaryKeyword.toLowerCase().replace(/\s+/g, '-')}\n`;
  md += `**Target Word Count**: ~${brief.targetWordCount} words\n\n`;

  brief.outline.forEach(section => {
    md += `### ${section.heading}\n`;
    md += `- **Word count**: ${section.wordCount} words\n`;
    md += `- **Format**: ${section.format}\n`;
    md += `- **Keyword guidance**: ${section.keywordGuidance}\n`;
    if (section.featuredSnippetTarget) {
      md += `- **Featured Snippet target**: Yes\n`;
    }
    md += `\n`;
  });

  md += `## Recommended Meta Tags\n\n`;
  md += `**Title**\n${brief.recommendedMeta.title}\n\n`;
  md += `**Meta Description**\n${brief.recommendedMeta.description}\n\n`;

  md += `## Unique Angle and Information Gain\n${brief.uniqueAngle}\n\n`;

  md += `## E-E-A-T Requirements\n`;
  brief.eeatRequirements.forEach(req => {
    md += `- ${req}\n`;
  });
  md += `\n`;

  md += `## Internal Linking Opportunities\n`;
  brief.internalLinking.forEach(link => {
    md += `- [${link.anchor}](${link.url})\n`;
  });

  return md;
}
