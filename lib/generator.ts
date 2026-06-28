/**
 * SeoFlow — Content Generator
 *
 * Generates new MDX posts from keywords/gaps using Gemini.
 * Site-specific identity comes from seoflow.config.json.
 */
import fs from 'fs';
import path from 'path';
import { loadConfig, getPostsDir, getAiContext } from './config';
import { aiChatWithRetry } from './ai-provider';
import type { Frontmatter } from './types';

export interface ContentGap {
  keyword: string;
  type: 'guide' | 'itinerary' | 'things-to-do' | 'city-pass-review' | 'article';
  destination: string;
  country: string;
  slug?: string;
  priority?: number;
}

export interface GeneratedPost {
  slug: string;
  filePath: string;
  content: string;
  frontmatter: Frontmatter;
}

const CONTENT_TYPES: Record<string, { schema: string; instructions: string }> = {
  'guide': {
    schema: 'TravelGuide',
    instructions: `Write a comprehensive travel guide. Include practical tips, transportation options, best time to visit, where to stay (budget/mid-range/splurge), and local customs. Use first-person where relevant ("I found that...", "In my experience..."). Include specific prices, transit times, and real details.`,
  },
  'itinerary': {
    schema: 'Itinerary',
    instructions: `Write a day-by-day itinerary. Include specific timings, meal recommendations, transit between stops, and practical tips for each day. Start with a "Quick Summary" box highlighting the itinerary at a glance. Include a budget breakdown section.`,
  },
  'things-to-do': {
    schema: 'TravelGuide',
    instructions: `Write a things-to-do guide with categorized attractions. Include opening hours, ticket prices, how long to spend at each, and honest opinions on what's worth skipping. Group by category (museums, outdoor, free, etc.) or by area.`,
  },
  'city-pass-review': {
    schema: 'Review',
    instructions: `Write an honest review of the city pass. Include price comparison with individual attraction costs, what's included vs excluded, best use strategy (which days/attractions maximize value), and who it's worth for. Start with a verdict summary.`,
  },
  'article': {
    schema: 'Article',
    instructions: `Write an informative article. Use first-person perspective where relevant. Include specific examples, data points, and practical takeaways. Structure with clear H2 sections.`,
  },
};

/**
 * Generate a post for a given keyword/content gap.
 * Returns the post content and frontmatter, or null on failure.
 */
export async function generatePost(gap: ContentGap): Promise<GeneratedPost | null> {
  const cfg = loadConfig();
  const ai = getAiContext();
  const today = new Date().toISOString().split('T')[0];
  const typeConfig = CONTENT_TYPES[gap.type] || CONTENT_TYPES['article'];
  const slug = gap.slug || generateSlug(gap.keyword, gap.destination);
  const postsDir = getPostsDir();

  // Check if slug already exists
  if (fs.existsSync(path.join(postsDir, `${slug}.mdx`))) {
    console.log(`     ⏭️  "${slug}" already exists, skipping`);
    return null;
  }

  const prompt = `You are ${ai.author}, a travel writer for ${ai.siteUrl}. You live in ${ai.authorLocation} and write honest, practical, first-person travel content.

Generate a complete MDX blog post for the following topic. Follow the instructions strictly.

TOPIC: ${gap.keyword} in ${gap.destination}, ${gap.country}
TYPE: ${gap.type}
TARGET WORD COUNT: ${cfg.generation?.wordCountMin || 1500}–${cfg.generation?.wordCountMax || 2500} words

CONTENT INSTRUCTIONS:
${typeConfig.instructions}

VOICE RULES:
- First-person, practical, specific. Never generic or AI-sounding.
- Never start a paragraph with "I" — vary your sentence openings.
- Include specific prices, transit times, and real details you've experienced.
- Short, punchy sentences. Vary length.
- Never use: nestled, delve, vibrant, treasure trove, hidden gem, breathtaking, truly unique.

OUTPUT FORMAT (YAML frontmatter + MDX body):
---
title: "Compelling SEO title under 55 chars"
date: "${today}"
lastModified: "${today}"
category: ${cfg.generation?.defaultCategory || 'travel'}
excerpt: "150-160 char meta description with keyword naturally included"
coverImage: ""
published: false
author: ${ai.author}
tags:
  - "${gap.destination}"
  - "${gap.country}"
  - "travel guide"
schema: ${typeConfig.schema}
focusKeyword: "${gap.keyword}"
description: "Same as excerpt"
visitedDate: "${today.slice(0, 7)}"
---

[Your content here with ## H2 headings]

Internal link format: [anchor text](/related-page) — use / and not full URLs.
Include a "Quick Summary" section near the top if it's a guide or itinerary.
Do NOT include markdown code fences around the YAML frontmatter.`;

  console.log(`     🤖 Generating "${slug}" (${gap.type}, ${gap.country})...`);

  const response = await aiChatWithRetry(prompt, 'content-audit');
  if (!response) {
    console.log(`     ❌ Generation failed for "${slug}"`);
    return null;
  }

  // Extract or prepend frontmatter
  let content = response.trim();
  if (!content.startsWith('---')) {
    content = `---\ntitle: "${gap.keyword} - ${gap.destination} Guide"\ndate: "${today}"\nlastModified: "${today}"\ncategory: ${cfg.generation?.defaultCategory || 'travel'}\nexcerpt: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."\ncoverImage: ""\npublished: false\nauthor: ${ai.author}\ntags:\n  - "${gap.destination}"\n  - "${gap.country}"\nschema: ${typeConfig.schema}\nfocusKeyword: "${gap.keyword}"\ndescription: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."\n---\n\n${content}`;
  }

  const filePath = path.join(postsDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`     ✅ Generated: ${slug}.mdx`);

  return { slug, filePath, content, frontmatter: {} };
}

/**
 * Generate a URL-friendly slug from a keyword and destination.
 */
export function generateSlug(keyword: string, destination: string): string {
  const kw = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${kw}-${destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * Generate multiple posts from a list of gaps.
 */
export async function generateBatch(gaps: ContentGap[], limit = 5): Promise<GeneratedPost[]> {
  const results: GeneratedPost[] = [];
  const toProcess = gaps.slice(0, limit);

  for (let i = 0; i < toProcess.length; i++) {
    const gap = toProcess[i];
    console.log(`\n  [${i + 1}/${toProcess.length}] ${gap.keyword} (${gap.destination})`);
    const post = await generatePost(gap);
    if (post) results.push(post);
  }

  console.log(`\n📋 Generated ${results.length}/${toProcess.length} posts`);
  if (results.length > 0) {
    console.log(`   Files: ${results.map(p => p.slug).join(', ')}`);
    console.log(`   Review and set published: true when ready.`);
  }

  return results;
}
