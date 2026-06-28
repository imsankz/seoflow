/**
 * MDX parsing and content analysis utilities.
 */
import type { Frontmatter, Section } from './types';

/**
 * Parse an MDX string into frontmatter and body content.
 */
export function parseMdx(raw: string): { frontmatter: Frontmatter; fmBlock: string; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { frontmatter: {}, fmBlock: '', content: raw };
  const fmBlock = match[0];
  const content = raw.slice(fmBlock.length);
  const frontmatter: Frontmatter = {};
  let currentKey = null;
  let inMultiline = false;
  let multilineVal: string[] = [];

  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (kv) {
      if (inMultiline && currentKey) {
        frontmatter[currentKey] = multilineVal.join('\n').trim();
        inMultiline = false;
        multilineVal = [];
      }
      currentKey = kv[1];
      let val: any = kv[2].trim();
      if (val === '>-' || val === '>') { inMultiline = true; multilineVal = []; continue; }
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^\d+$/.test(val)) val = parseInt(val);
      else if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) val = val.slice(1, -1);
      frontmatter[currentKey] = val;
    } else if (inMultiline) {
      multilineVal.push(line.trim());
    } else if (currentKey && line.match(/^\s+-\s+(.+)/)) {
      if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(line.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  if (inMultiline && currentKey) frontmatter[currentKey] = multilineVal.join(' ').trim();
  return { frontmatter, fmBlock, content };
}

/**
 * Rebuild a frontmatter block from a Frontmatter object.
 */
export function buildFrontmatterBlock(fm: Frontmatter): string {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${JSON.stringify(item)}`);
    } else if (typeof v === 'string' && v.includes('\n')) {
      lines.push(`${k}: >-`);
      for (const l of v.split('\n')) lines.push(`  ${l}`);
    } else if (typeof v === 'string' && (v.includes(':') || v.includes('#') || v.includes('"'))) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

/**
 * Count words in MDX content (excludes code blocks, HTML tags, markdown syntax).
 */
export function countWords(content: string): number {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_\[\]()]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Count internal links in MDX content.
 */
export function countInternalLinks(content: string, siteUrl?: string): number {
  const links = [...content.matchAll(/\[.*?\]\(([^)]+)\)/g)].map(m => m[1]);
  return links.filter(l => !l.startsWith('http') || (siteUrl ? l.includes(siteUrl) : false)).length;
}

/**
 * Count images in MDX content.
 */
export function countImages(content: string): number {
  return (content.match(/!\[.*?\]\(.*?\)|<Image\s/g) || []).length;
}

/**
 * Extract all existing internal links from content as a Set of paths.
 */
export function extractExistingLinks(content: string): Set<string> {
  const links = new Set<string>();
  for (const m of content.matchAll(/\[.*?\]\(([^)]+)\)/g)) {
    const href = m[1].replace(/^https?:\/\/(www\.)?chasingwhereabouts\.com/, '');
    links.add(href);
  }
  return links;
}

/**
 * Extract H2 sections from MDX content.
 */
export function getH2Sections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');
  let current: Section | null = null;
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Check if a section needs an image (no existing image, and enough text).
 */
export function sectionNeedsImage(sectionLines: string[]): boolean {
  const text = sectionLines.join('\n');
  const hasImage = /!\[.*?\]\(.*?\)|<Image\s/.test(text);
  const wordCount = countWords(text);
  return !hasImage && wordCount > 150;
}

/**
 * Score a post's SEO priority based on GSC data.
 */
export function scorePriority(slug: string, gscData: { [slug: string]: { impressions?: number; position?: number; ctr?: number; clicks?: number } }): number {
  const gsc = gscData[slug] || {};
  let score = 0;

  if (gsc.impressions && gsc.impressions > 5000) score += 50;
  else if (gsc.impressions && gsc.impressions > 1000) score += 30;
  else if (gsc.impressions && gsc.impressions > 500) score += 15;

  if (gsc.position && gsc.position >= 5 && gsc.position <= 15) score += 40;
  else if (gsc.position && gsc.position >= 15 && gsc.position <= 30) score += 20;

  if (gsc.impressions && gsc.impressions > 500 && gsc.ctr && gsc.ctr < 3) score += 25;
  if (gsc.clicks && gsc.clicks > 100) score += 20;
  else if (gsc.clicks && gsc.clicks > 50) score += 10;

  return score;
}
