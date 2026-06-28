/**
 * SeoFlow — Content Generator
 *
 * Generates new MDX posts from keywords/gaps using Gemini.
 * Site-specific identity comes from seoflow.config.json.
 */
import fs from 'fs';
import path from 'path';
import { loadConfig, getPostsDir, getAiContext, getContentTypes, getContentDomain, getDefaultCategory } from './config';
import { aiChatWithRetry } from './ai-provider';
import type { Frontmatter } from './types';

export interface ContentGap {
  keyword: string;
  type: string;
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

/**
 * Generate a post for a given keyword/content gap.
 * Returns the post content and frontmatter, or null on failure.
 */
export async function generatePost(gap: ContentGap): Promise<GeneratedPost | null> {
  const cfg = loadConfig();
  const ai = getAiContext();
  const today = new Date().toISOString().split('T')[0];
  const contentTypes = getContentTypes();
  const typeConfig = contentTypes[gap.type] || contentTypes['article'] || { schema: 'Article', instructions: 'Write an informative article.' };
  const slug = gap.slug || generateSlug(gap.keyword, gap.destination);
  const postsDir = getPostsDir();

  // Check if slug already exists
  if (fs.existsSync(path.join(postsDir, `${slug}.mdx`))) {
    console.log(`     ⏭️  "${slug}" already exists, skipping`);
    return null;
  }

  const domain = getContentDomain();
  const prompt = `You are ${ai.author}, a ${domain} writer for ${ai.siteUrl}. You live in ${ai.authorLocation} and write honest, practical, first-person ${domain} content.

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
category: ${getDefaultCategory()}
excerpt: "150-160 char meta description with keyword naturally included"
coverImage: ""
published: false
author: ${ai.author}
tags:
  - "${gap.destination}"
  - "${gap.country}"
  - "${getContentDomain()} guide"
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
    content = `---\ntitle: "${gap.keyword} - ${gap.destination} Guide"\ndate: "${today}"\nlastModified: "${today}"\ncategory: ${getDefaultCategory()}\nexcerpt: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."\ncoverImage: ""\npublished: false\nauthor: ${ai.author}\ntags:\n  - "${gap.destination}"\n  - "${gap.country}"\nschema: ${typeConfig.schema}\nfocusKeyword: "${gap.keyword}"\ndescription: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."\n---\n\n${content}`;
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
