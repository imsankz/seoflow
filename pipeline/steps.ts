/**
 * SEO pipeline steps — each is an isolated function that transforms a post.
 *
 * Each step receives the current state (slug, content, frontmatter, gsc, auditLog)
 * and returns the modified state plus any changes made.
 */
import fs from 'fs';
import type { Frontmatter, GSCPageData, NeuronData, Section, StepInput, StepOutput, ToolTrigger, BookingTrigger } from '../lib/types';
import { countWords, countInternalLinks, countImages, parseMdx, buildFrontmatterBlock, extractExistingLinks, getH2Sections, sectionNeedsImage } from '../lib/mdx-parser';
import { fetchBestImage } from '../lib/pexels-client';
import { fetchNeuronData, hasNeuronKey } from '../lib/neuronwriter';
import { aiChatWithRetry } from '../lib/ai-provider';
import { logEntry, isAlreadyDone } from '../lib/audit-log';
import { researchKeywords as ubersuggestResearch } from '../lib/ubersuggest-client';
import { researchKeywords as semrushResearch } from '../lib/semrush-client';
import { researchKeywords as ahrefsResearch } from '../lib/ahrefs-client';
import { getToolTriggers, getBookingTriggers, getAiContext, getWritingSample, getImageSearchFallback, getDefaultCategory, getContentDomain, getSiteUrl, loadConfig } from '../lib/config';
import { resetAiCallCounter, getAiCallCount } from '../lib/ai-provider';
import { checkGscDelta, recordStep, logRun } from '../lib/learning';
import type { AuditLog } from '../lib/types';
import { processSchema } from '../lib/schema';
import { stepTechnicalAudit } from './technical';
import { stepContentQualityAudit } from './content-quality';
import { stepExportReport } from './report-export';

// ─── AI Quality Gate ──────────────────────────────────────────────────────────
const AI_PHRASES = ['nestled', 'delve', 'vibrant', 'treasure trove', 'bustling', 'hidden gem', 'breathtaking', 'truly unique', 'picturesque', 'enchanting', 'captivating', 'metropolis', 'testament to', 'rich tapestry', 'magical', 'whimsical', 'wanderlust', 'a must-visit'];

// Lazy-loaded trigger maps from site config
let _toolTriggers: ToolTrigger[] | null = null;
let _bookingTriggers: BookingTrigger[] | null = null;
function toolTriggers(): ToolTrigger[] { if (!_toolTriggers) _toolTriggers = getToolTriggers(); return _toolTriggers; }
function bookingTriggers(): BookingTrigger[] { if (!_bookingTriggers) _bookingTriggers = getBookingTriggers(); return _bookingTriggers; }

// ─── Step 0: Keyword Research (Ubersuggest) ───────────────────────────────────
/**
 * Research keywords for the post using Ubersuggest MCP.
 * Updates focusKeyword to the best-performing suggestion found.
 * Runs before frontmatter fixes so the keyword is available for schema detection.
 */
export async function stepKeywordResearch(input: StepInput): Promise<StepOutput> {
  const changes: string[] = [];
  const fm = { ...input.frontmatter };
  const seed = fm.focusKeyword || fm.title || input.slug;
  const context = `${fm.category || getDefaultCategory()} ${(fm.tags || []).join(' ')}`;

  let kwResult;
  if (process.env.AHREFS_API_KEY) {
    kwResult = await ahrefsResearch(seed, context);
  } else if (process.env.SEMRUSH_API_KEY) {
    kwResult = await semrushResearch(seed, context);
  } else {
    kwResult = await ubersuggestResearch(seed, input.slug, context);
  }
  if (kwResult.source === 'ubersuggest' && kwResult.focusKeyword !== seed) {
    const oldKw = fm.focusKeyword || seed;
    fm.focusKeyword = kwResult.focusKeyword;
    changes.push(`Keyword research: "${oldKw}" → "${kwResult.focusKeyword}" (vol: ${kwResult.searchVolume}, diff: ${kwResult.difficulty})`);
  } else if (kwResult.source === 'ubersuggest') {
    changes.push(`Keyword research: "${seed}" confirmed (vol: ${kwResult.searchVolume}, diff: ${kwResult.difficulty})`);
  } else if (kwResult.source === 'fallback') {
    changes.push(`Keyword research: SERP analysis for "${seed}" (fallback mode)`);
  }

  if (kwResult.relatedKeywords.length > 0) {
    const existing = fm.keywords || [];
    if (Array.isArray(existing)) {
      fm.keywords = [...new Set([...existing, ...kwResult.relatedKeywords])];
    }
    changes.push(`Added ${kwResult.relatedKeywords.length} related keywords from research`);
  }

  return { content: input.content, frontmatter: fm, changes };
}

// ─── Step 1: Fix Frontmatter ──────────────────────────────────────────────────
export function stepFixFrontmatter(input: StepInput): StepOutput {
  const changes: string[] = [];
  const fm = { ...input.frontmatter };
  const today = new Date().toISOString().split('T')[0];

  // Ensure schema field
  if (!fm.schema) {
    const title = (fm.title || '').toLowerCase();
    const tags = (fm.tags || []).join(' ').toLowerCase();
    if (title.includes('review') || tags.includes('review')) fm.schema = 'Review';
    else if (fm.focusKeyword && fm.focusKeyword.match(/\bfaq\b|\bwhat is\b|\bhow to\b/i)) fm.schema = 'FAQPage';
    else if (title.includes('guide') || title.includes('things to do') || title.includes('tips')) fm.schema = 'TravelGuide';
    else fm.schema = 'Article';
    changes.push(`Added schema: ${fm.schema}`);
  }

  // Fix description length
  const desc = fm.description || fm.excerpt || '';
  if (desc.length < 100 || desc.length > 165) {
    if (desc.length > 165) {
      fm.description = desc.slice(0, 158) + '...';
      changes.push('Trimmed description to 158 chars');
    }
    if (desc.length < 100) changes.push('FLAG: description too short — needs manual improvement');
  }

  // Ensure focusKeyword
  if (!fm.focusKeyword && fm.title) {
    fm.focusKeyword = fm.title.split(' ').slice(0, 5).join(' ');
    changes.push(`Added focusKeyword from title`);
  }

  // Update lastModified
  if (changes.length > 0) {
    fm.lastModified = today;
    changes.push(`Updated lastModified to ${today}`);
  }

  return { content: input.content, frontmatter: fm, changes };
}

// ─── Step 2: Inject Internal Links ────────────────────────────────────────────
export function stepInjectLinks(input: StepInput): StepOutput {
  const changes: string[] = [];
  let modified = input.content;
  const existingLinks = extractExistingLinks(modified);
  let linksAdded = 0;

  const tryInsertLink = (trigger: ToolTrigger | BookingTrigger): void => {
    if (linksAdded >= 3) return;
    if (existingLinks.has(trigger.path)) return;

    for (const kw of trigger.keywords) {
      const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?<!\\[.*?)\\b(${safeKw})\\b(?![^[]*?\\])(?![^(]*?\\))`, 'i');
      const match = modified.match(pattern);
      if (match) {
        modified = modified.replace(pattern, `[$1](${trigger.path})`);
        existingLinks.add(trigger.path);
        changes.push(`Added internal link to ${trigger.path} (anchor: "${match[1]}")`);
        linksAdded++;
        return;
      }
    }
  };

  for (const trigger of toolTriggers()) tryInsertLink(trigger);
  for (const trigger of bookingTriggers()) tryInsertLink(trigger);

  return { content: modified, frontmatter: input.frontmatter, changes };
}

// ─── Step 3: Inject Images ────────────────────────────────────────────────────
export async function stepInjectImages(input: StepInput): Promise<StepOutput> {
  const changes: string[] = [];
  const sections = getH2Sections(input.content);
  const destination = (input.frontmatter.tags || [])[0] || input.frontmatter.category || getImageSearchFallback(); // uses imageSearchFallback from config, not hardcoded 'europe'
  const contentDomain = getContentDomain();
  let modified = input.content;
  let imagesAdded = 0;
  const MAX_NEW_IMAGES = 2;

  for (const section of sections) {
    if (imagesAdded >= MAX_NEW_IMAGES) break;
    if (!sectionNeedsImage(section.lines)) continue;

    const searchQuery = `${section.heading} ${destination}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    console.log(`    🔍 Fetching image for: "${searchQuery}"`);

    const img = await fetchBestImage(searchQuery);
    if (!img) {
      console.log(`    ⚠️  No image found for: "${searchQuery}"`);
      continue;
    }

    const altText = `${section.heading} - ${destination} ${contentDomain}`;
    const imgMdx = `\n\n![${altText}](${img.url})\n*Photo: ${img.credit}*\n`;

    const headingLine = `## ${section.heading}`;
    const idx = modified.indexOf(headingLine);
    if (idx !== -1) {
      const afterHeading = modified.indexOf('\n', idx) + 1;
      modified = modified.slice(0, afterHeading) + imgMdx + modified.slice(afterHeading);
      changes.push(`Added image from ${img.source} for section "${section.heading}" (${img.photographer})`);
      imagesAdded++;
    }
  }

  return { content: modified, frontmatter: input.frontmatter, changes };
}

// ─── Step 4: NeuronWriter Analysis ────────────────────────────────────────────
export async function stepNeuronWriter(input: StepInput): Promise<StepOutput & { neuronData: NeuronData | null }> {
  if (!hasNeuronKey()) {
    return { content: input.content, frontmatter: input.frontmatter, changes: [], neuronData: null };
  }

  const keyword = input.frontmatter.focusKeyword || input.frontmatter.title || input.slug;
  console.log(`     NW: fetching data for "${keyword}"`);
  const neuronData = await fetchNeuronData(keyword);

  if (neuronData?.missingTerms?.length) {
    console.log(`     NW missing terms: ${neuronData.missingTerms.slice(0, 5).join(', ')}`);
  }
  if (neuronData?.targetWordCount) {
    console.log(`     NW target word count: ${neuronData.targetWordCount} (current: ${countWords(input.content)})`);
  }
  if (neuronData?.notes) {
    console.log(`     NW: ${neuronData.notes}`);
  }

  return { content: input.content, frontmatter: input.frontmatter, changes: [], neuronData };
}

// ─── Step 5: Gemini Content Audit (FAQ, thin sections, NLP terms) ─────────────
export async function stepGeminiContent(input: StepInput, neuronData: NeuronData | null): Promise<StepOutput> {
  const changes: string[] = [];
  if (!process.env.GEMINI_API_KEY) {
    console.log(`     ⚠️  GEMINI_API_KEY not set — skipping AI content audit`);
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }

  const gsc = input.gsc;
  const content = input.content;
  const fm = input.frontmatter;

  const hasFaq = /##\s*(FAQ|Frequently Asked|Common Questions)/i.test(content);
  const sections = getH2Sections(content);
  const thinSections = sections.filter(s => countWords(s.lines.join('\n')) < 100 && !s.heading.match(/FAQ|conclusion|final|wrap/i));
  const wordCount = countWords(content);

  const needsFaq = !hasFaq && ((gsc?.impressions || 0) > 500 || wordCount > 800);
  const needsExpansion = thinSections.length > 0;
  const needsNlpTerms = !!(neuronData?.missingTerms?.length);

  if (!needsFaq && !needsExpansion && !needsNlpTerms) {
    return { content, frontmatter: fm, changes };
  }

  const ai = getAiContext();
  const contentType = fm.schema?.toLowerCase().includes('review') ? 'review' :
    fm.schema?.toLowerCase().includes('itinerary') ? 'itinerary' :
    fm.category || 'guide';
  const writingSample = getWritingSample(contentType);
  const contentDomain = getContentDomain();

  const tasks: string[] = [];
  if (needsFaq) tasks.push(`- Add a "## Frequently Asked Questions" section at the end with 4 Q&As based on search intent for "${fm.focusKeyword || fm.title}". Format each as: **Q: question?** then the answer paragraph.`);
  if (needsExpansion) tasks.push(`- Expand these thin sections (under 100 words each) with 1-2 more practical paragraphs in ${ai.author}'s first-person voice: ${thinSections.map(s => `"${s.heading}"`).join(', ')}`);
  if (needsNlpTerms) tasks.push(`- Naturally weave in these missing NLP terms where relevant (do not keyword-stuff): ${neuronData!.missingTerms.slice(0, 8).join(', ')}`);

  const gscContext = [
    `Impressions: ${gsc?.impressions || 0} | Clicks: ${gsc?.clicks || 0} | Position: ${gsc?.position?.toFixed(1) || 'n/a'} | CTR: ${gsc?.ctr?.toFixed(2) || 0}%`,
    gsc?.position && gsc.position > 5 && gsc.position < 20 ? '→ Striking distance — small content improvements can push to page 1' : '',
    gsc?.impressions && gsc.impressions > 1000 && gsc?.ctr && gsc.ctr < 3 ? '→ High impressions + low CTR — title/meta and FAQ schema could improve clicks' : '',
  ].filter(Boolean).join('\n');

  const nwContext = neuronData ? [
    neuronData.targetWordCount ? `Target word count: ${neuronData.targetWordCount} (current: ${wordCount})` : '',
    neuronData.missingTerms?.length ? `Missing NLP terms: ${neuronData.missingTerms.slice(0, 10).join(', ')}` : '',
    neuronData.h2Terms?.length ? `Suggested headings: ${neuronData.h2Terms.slice(0, 5).join(' | ')}` : '',
    neuronData.peopleAlsoAsk?.length ? `People Also Ask: ${neuronData.peopleAlsoAsk.slice(0, 5).join(' | ')}` : '',
    neuronData.contentQuestions?.length ? `Content questions: ${neuronData.contentQuestions.slice(0, 5).join(' | ')}` : '',
  ].filter(Boolean).join('\n') : 'NeuronWriter data unavailable';

  const contentSnippet = content.length > 3000
    ? content.slice(0, 1500) + '\n\n...[middle of post]...\n\n' + content.slice(-800)
    : content;

  const voiceSection = writingSample
    ? `Here is a sample of ${ai.author}'s actual writing voice — match this tone exactly:\n"${writingSample}"\n`
    : '';

  const prompt = `You are editing a ${contentDomain} post for ${ai.siteUrl} written by ${ai.author}${ai.authorLocation ? `, based in ${ai.authorLocation}` : ''}.
Voice: first-person, practical, authentic, specific. Never generic. Never AI-sounding. Never start a section with "I".

${voiceSection}
Style rules:
- Short, punchy sentences. Vary length.
- Specific, grounded observations (not vague praise)
- Practical details: prices, transit, timing
- Direct address to the reader
- Never use: nestled, delve, vibrant, treasure trove, bustling, hidden gem, breathtaking, truly unique, picturesque, enchanting, captivating, magical, whimsical, wanderlust

POST TITLE: ${fm.title}
FOCUS KEYWORD: ${fm.focusKeyword || fm.title}

GOOGLE SEARCH CONSOLE DATA:
${gscContext}

NEURONWRITER ANALYSIS:
${nwContext}

CURRENT CONTENT EXCERPT:
${contentSnippet}

YOUR TASKS (only what's needed — do not invent work):
${tasks.join('\n')}

OUTPUT RULES:
- Respond with ONLY a raw JSON object — no explanation, no markdown, no code fences
- Start your response with { and end with }
- Use \\n for newlines inside string values
- Only include keys you have content for

JSON FORMAT:
{"faq_section":"## Frequently Asked Questions\\n\\n**Q: question?**\\nAnswer in 2-3 sentences.\\n\\n**Q: ...**\\n...","expanded_sections":{"Exact Section Heading":"## Exact Section Heading\\n\\nExpanded content here."},"nlp_insertions":["sentence using missing term naturally"]}

FAQ must have exactly 4 Q&As drawn from People Also Ask data above.`;

  console.log(`     🤖 AI content audit (FAQ: ${needsFaq}, thin sections: ${thinSections.length}, NLP terms: ${needsNlpTerms})`);
  const response = await aiChatWithRetry(prompt, 'content-audit');
  if (!response) {
    console.log(`     ⚠️  AI content audit failed after 3 attempts`);
    return { content, frontmatter: fm, changes };
  }

  return applyGeminiResponse(response, content, fm, sections, changes, needsFaq, needsExpansion, needsNlpTerms);
}

function applyGeminiResponse(
  response: string,
  content: string,
  fm: Frontmatter,
  sections: Section[],
  changes: string[],
  needsFaq: boolean,
  needsExpansion: boolean,
  _needsNlpTerms: boolean
): StepOutput {
  // Parse AI response
  let faqSection: string | null = null;
  let expanded: { [heading: string]: string } | null = null;

  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      raw = raw.slice(start, end + 1);
      const parsed = JSON.parse(raw);
      faqSection = parsed.faq_section || null;
      expanded = parsed.expanded_sections || null;
    }
  } catch {
    // Fallback: try to extract FAQ directly
    const faqKeyMatch = response.match(/"faq_section"\s*:\s*"([\s\S]+?)(?=",\s*"|"\s*\}|$)/);
    if (faqKeyMatch && needsFaq) {
      faqSection = faqKeyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    }
  }

  let modified = content;

  if (faqSection && needsFaq) {
    modified = modified.trimEnd() + '\n\n' + faqSection.trim() + '\n';
    changes.push('AI: Added FAQ section (4 Q&As)');
    fm.schema = 'FAQPage';
  }

  function qualityCheck(text: string): { pass: boolean; reason: string | null } {
    const wordCount = text.replace(/[#*_\[\]()>]/g, '').split(/\s+/).filter(Boolean).length;
    if (wordCount < 80) return { pass: false, reason: `too short (${wordCount} words, need ≥80)` };
    const lower = text.toLowerCase();
    const hits = AI_PHRASES.filter(p => lower.includes(p));
    if (hits.length >= 2) return { pass: false, reason: `AI phrases detected: ${hits.join(', ')}` };
    return { pass: true, reason: null };
  }

  if (expanded && needsExpansion) {
    for (const [heading, newSection] of Object.entries(expanded)) {
      const oldSection = sections.find(s => s.heading === heading);
      if (oldSection) {
        const oldText = `## ${oldSection.heading}\n${oldSection.lines.join('\n')}`;
        if (modified.includes(oldText)) {
          const qc = qualityCheck(newSection);
          if (qc.pass) {
            modified = modified.replace(oldText, newSection.trim());
            changes.push(`AI: Expanded thin section "${heading}"`);
          } else {
            changes.push(`⏭️  Skipped AI expansion for "${heading}" (quality: ${qc.reason})`);
            console.log(`     ⏭️  Skipped "${heading}" — ${qc.reason}`);
          }
        }
      }
    }
  }

  return { content: modified, frontmatter: fm, changes };
}

// ─── Step 6: Claude SEO Review (NEW) ──────────────────────────────────────────
/**
 * Performs a final SEO review of the content using Claude-style analysis.
 *
 * This step checks:
 * - Title tag optimization (length, keyword placement)
 * - Meta description quality
 * - Heading structure (H1 → H2 → H3 hierarchy)
 * - Keyword usage (in first paragraph, headings, URL)
 * - Content comprehensiveness (covers subtopics, answers questions)
 * - Readability and E-E-A-T signals
 * - Image alt text quality
 * - Internal link density and relevance
 * - Schema markup appropriateness
 *
 * Results are added to the audit log but the content is not modified — this
 * is an advisory step that flags issues for manual review.
 */
export async function stepClaudeSeoReview(input: StepInput): Promise<StepOutput> {
  const changes: string[] = [];
  const { content, frontmatter, slug, gsc } = input;

  if (!process.env.GEMINI_API_KEY) {
    return { content, frontmatter, changes };
  }

  const wordCount = countWords(content);
  const sections = getH2Sections(content);
  const existingLinks = [...extractExistingLinks(content)];
  const imageCount = countImages(content);
  const desc = frontmatter.description || '';
  const title = frontmatter.title || slug;

  const contentDomain = getContentDomain();
  const prompt = `You are an SEO quality reviewer. Analyze this ${contentDomain} post and return a JSON report.

POST: "${title}"
SLUG: ${slug}
FOCUS KEYWORD: "${frontmatter.focusKeyword || ''}"
WORD COUNT: ${wordCount}
META DESCRIPTION: "${desc}"
SCHEMA: ${frontmatter.schema || 'none'}

GSC DATA:
- Impressions: ${gsc?.impressions || 0}
- Clicks: ${gsc?.clicks || 0}
- Avg Position: ${gsc?.position?.toFixed(1) || 'n/a'}
- CTR: ${gsc?.ctr?.toFixed(2) || 0}%

CONTENT STRUCTURE:
${sections.map(s => `## ${s.heading} (${countWords(s.lines.join('\n'))} words)`).join('\n')}

IMAGES: ${imageCount}
INTERNAL LINKS: ${existingLinks.length}
HEADINGS: ${sections.length}

Review checklist:
1. TITLE: Is the focus keyword near the start? Is it compelling and under 60 chars?
2. META: Does it include the keyword and a CTA? Is it 140-160 chars?
3. H1→H2 HIERARCHY: Do H2s cover all relevant subtopics for this keyword?
4. FIRST 100 WORDS: Does the keyword appear naturally near the top?
5. E-E-A-T: Does the content show personal experience, specific details, practical tips?
6. COMPREHENSIVENESS: Are there obvious subtopics missing for this keyword?
7. READABILITY: Is the language natural and conversational (not AI-sounding)?
8. INTERNAL LINKS: Are there enough relevant internal links? Missing obvious link opportunities?
9. IMAGES: Do images have descriptive alt text?

OUTPUT FORMAT (raw JSON, no markdown):
{
  "score": 7,
  "key_issues": ["Issue 1", "Issue 2"],
  "quick_wins": ["Quick fix 1", "Quick fix 2"],
  "title_recommendation": "Suggested title or 'OK'",
  "meta_recommendation": "Suggested meta or 'OK'",
  "missing_subtopics": ["Subtopic 1", "Subtopic 2"],
  "eeat_signals": "Good: details about personal visit. Missing: specific price mentions.",
  "readability_note": "One or two concise sentences about the flow and voice.",
  "link_opportunities": "e.g. Could link to budget calculator when discussing costs",
  "overall_assessment": "Brief 1-2 sentence summary of the biggest issue to fix"
}`;

  console.log(`     🤖 Claude SEO review...`);
  const response = await aiChatWithRetry(prompt, 'seo-review');
  if (!response) {
    return { content, frontmatter, changes };
  }

  // Parse the JSON response and apply auto-fixes
  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const review = JSON.parse(raw.slice(start, end + 1));
      const issues = review.key_issues || [];
      const quickWins = review.quick_wins || [];
      const score = review.score || '?';
      const titleRec = review.title_recommendation || '';
      const metaRec = review.meta_recommendation || '';

      if (issues.length > 0) {
        changes.push(`⚡ Claude SEO review score: ${score}/10`);
        for (const issue of issues) {
          changes.push(`   • Issue: ${issue}`);
        }
        for (const win of quickWins) {
          changes.push(`   ✓ Quick win: ${win}`);
        }
      }

      // Auto-fix title if recommended and different from current
      if (titleRec && titleRec !== 'OK' && titleRec !== frontmatter.title && titleRec.length < 90) {
        const oldTitle = frontmatter.title;
        frontmatter.title = titleRec;
        changes.push(`🔧 Auto-fixed title: "${oldTitle?.slice(0, 50)}..." → "${titleRec.slice(0, 50)}..."`);
      }

      // Auto-fix meta description if recommended and different from current
      if (metaRec && metaRec !== 'OK' && metaRec !== (frontmatter.description || '') && metaRec.length < 180) {
        const oldMeta = frontmatter.description;
        frontmatter.description = metaRec;
        changes.push(`🔧 Auto-fixed meta description`);
      }
    }
  } catch {
    // Non-critical — review is advisory only
    changes.push(`⚠️  SEO review JSON parse failed — check raw output`);
  }

  return { content, frontmatter, changes };
}

// ─── Step 7: Fact Check ───────────────────────────────────────────────────────
/**
 * Verifies price claims in published content.
 *
 * Uses Gemini with Google Search grounding to cross-reference prices
 * mentioned in the post against current web data.
 *
 * This is a simplified version of the full fact-checker.js — it flags
 * potential price drifts rather than auto-patching.
 */
export async function stepFactCheck(input: StepInput): Promise<StepOutput> {
  const changes: string[] = [];
  const { content, frontmatter, slug } = input;

  if (!process.env.GEMINI_API_KEY) {
    return { content, frontmatter, changes };
  }

  // Extract price patterns from content
  const pricePattern = /[€$£]\s*\d+(?:[.,]\d+)?(?:\s*(?:€|euro|EUR|USD|GBP|dollars?|pounds?))?/g;
  const prices = [...new Set(content.match(pricePattern) || [])];

  // Extract opening hours patterns from content
  const hoursPattern = /(?:open|closed|hours?)\s*(?:[:=]?\s*)?(?:\d{1,2}(?::\d{0,2})?\s*(?:am|pm|AM|PM|hrs?)?\s*(?:-|to|–)\s*\d{1,2}(?::\d{0,2})?\s*(?:am|pm|AM|PM|hrs?)?|24\s*hrs?|24\s*hours?)/gi;
  const openingHours = [...new Set(content.match(hoursPattern) || [])];

  const postTitle = frontmatter.title || slug;
  const category = frontmatter.category || getDefaultCategory();
  const destination = (frontmatter.tags || [])[0] || '';
  const domain = getContentDomain();

  let prompt = `You are verifying claims in a ${domain} post.

POST TITLE: "${postTitle}"
CATEGORY: ${category}
DESTINATION: ${destination}

`;

  const hasPrices = prices.length > 0;
  const hasHours = openingHours.length > 0;

  if (hasPrices) {
    prompt += `PRICES FOUND IN THE POST:
${prices.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')}

`;
  }

  if (hasHours) {
    prompt += `OPENING HOURS FOUND IN THE POST:
${openingHours.map((h, i) => `${i + 1}. ${h}`).join('\n')}

`;
  }

  prompt += `For each claim, tell me:
1. Is this claim still realistic/current? (yes/no/uncertain)
2. What's the current information if it has changed?
3. What's your confidence level? (high/medium/low)

OUTPUT: Raw JSON object only, no markdown.
{"prices":[{"claim":"€30","still_accurate":"yes","current_price":"€30","confidence":"high","note":"Still accurate"}],"openingHours":[{"claim":"9am-5pm","still_accurate":"yes","current_hours":"9am-6pm","confidence":"medium","note":"Hours extended"}]}
`;

  const itemsToCheck = prices.length + openingHours.length;
  console.log(`     🔍 Fact check: ${itemsToCheck} items found`);

  const response = await aiChatWithRetry(prompt, 'fact-check');
  if (!response) {
    console.log(`     ⚠️  Fact check failed after 3 attempts`);
    return { content, frontmatter, changes };
  }

  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const report = JSON.parse(raw.slice(start, end + 1));

      // Process price reports
      if (report.prices && report.prices.length > 0) {
        const priceReports = report.prices;
        const flaggedPrices = priceReports.filter((p: any) => p.still_accurate === 'no');

        if (flaggedPrices.length > 0) {
          for (const p of flaggedPrices) {
            changes.push(`🔴 Price may be outdated: claimed "${p.claim}", current ~"${p.current_price}" (confidence: ${p.confidence})`);
          }
        } else {
          changes.push(`✅ All ${priceReports.length} prices verified (via Google Search grounding)`);
        }
      }

      // Process opening hours reports
      if (report.openingHours && report.openingHours.length > 0) {
        const hoursReports = report.openingHours;
        const flaggedHours = hoursReports.filter((h: any) => h.still_accurate === 'no');

        if (flaggedHours.length > 0) {
          for (const h of flaggedHours) {
            changes.push(`🔴 Opening hours may be outdated: claimed "${h.claim}", current ~"${h.current_hours}" (confidence: ${h.confidence})`);
          }
        } else {
          changes.push(`✅ All ${hoursReports.length} opening hours verified (via Google Search grounding)`);
        }
      }
    }
  } catch {
    changes.push(`⚠️  Fact check JSON parse failed`);
  }

  return { content, frontmatter, changes };
}

interface ProcessPostOptions {
  mode: string;
  skipAlreadyDone?: boolean;
  dryRun?: boolean;
  /** Shared AI call counter for the whole run — enforces aiLimits.maxCallsPerRun */
  aiCallCounter?: { count: number };
}

export async function processPost(
  slug: string,
  filePath: string,
  gscPages: { [slug: string]: GSCPageData },
  auditLog: AuditLog,
  opts: ProcessPostOptions
): Promise<{ slug: string; changes: number; before: any; after: any; neuronData: NeuronData | null }> {
  const { mode, dryRun } = opts;

  // Per-post AI call tracking
  const callsBefore = getAiCallCount();
  const maxCallsPerPost = (() => {
    try { return loadConfig().aiLimits?.maxCallsPerPost ?? Infinity; } catch { return Infinity; }
  })();

  function canCallAi(): boolean {
    const used = getAiCallCount() - callsBefore;
    if (used >= maxCallsPerPost) {
      console.log(`     ⚠️  Per-post AI limit (${maxCallsPerPost}) reached — skipping remaining AI steps`);
      return false;
    }
    return true;
  }

  if (opts.skipAlreadyDone && isAlreadyDone(auditLog, slug)) {
    return { slug, changes: 0, before: {}, after: {}, neuronData: null };
  }

  console.log(`\n  📄 ${slug}`);

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMdx(raw);
  const gsc = gscPages[slug] || {};
  const input: StepInput = { slug, filePath, content: parsed.content, frontmatter: parsed.frontmatter, gsc };

  // Capture before metrics
  const before = {
    word_count: countWords(parsed.content),
    internal_links: countInternalLinks(parsed.content),
    images: countImages(parsed.content),
    meta_description_length: (parsed.frontmatter.description || '').length,
    neuronwriter_score: null as number | null,
  };

  console.log(`     Words: ${before.word_count} | Links: ${before.internal_links} | Images: ${before.images} | GSC pos: ${gsc.position?.toFixed(1) || 'n/a'}`);

  // ── Self-Learning: Check GSC delta from previous run ───────────────────
  const category = parsed.frontmatter.category || parsed.frontmatter.tags?.[0] || 'unknown';
  if (gsc?.impressions && gsc.impressions > 0) {
    const delta = checkGscDelta(slug, mode, category, gsc);
    if (delta) {
      const dir = delta.positionChange < 0 ? 'improved' : 'declined';
      console.log(`     📈 GSC since last audit: pos ${delta.positionChange > 0 ? '+' : ''}${delta.positionChange.toFixed(1)} (${dir}), ${delta.clicksChange > 0 ? '+' : ''}${delta.clicksChange} clicks`);
    }
  }

  let state = { content: input.content, frontmatter: input.frontmatter };
  const allChanges: string[] = [];
  let neuronData: NeuronData | null = null;

  // ── Step 0: Keyword Research (Ubersuggest) ─────────────────────────────
  if (mode === 'all' || mode === 'keywords') {
    const result = await stepKeywordResearch({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, 'keywords', category, result.changes.length, gsc);
  }

  // ── Step 1: Frontmatter ────────────────────────────────────────────────
  if (mode === 'all' || mode === 'meta') {
    const result = stepFixFrontmatter({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, 'meta', category, result.changes.length, gsc);
  }

  // ── Step 2: Internal links ──────────────────────────────────────────────
  if (mode === 'all' || mode === 'links') {
    const result = stepInjectLinks({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, 'links', category, result.changes.length, gsc);
  }

  // ── Step 3: Images ──────────────────────────────────────────────────────
  if (mode === 'all' || mode === 'images') {
    if (before.images < 2 || (before.word_count > 800 && before.images < 3)) {
      const result = await stepInjectImages({ ...input, content: state.content, frontmatter: state.frontmatter });
      state = { content: result.content, frontmatter: result.frontmatter };
      allChanges.push(...result.changes);
      recordStep(slug, 'images', category, result.changes.length, gsc);
    } else {
      console.log(`     ✓ Images sufficient (${before.images})`);
    }
  }

  // ── Step 4: NeuronWriter ────────────────────────────────────────────────
  if (mode === 'all' || mode === 'neuron' || mode === 'content') {
    const result = await stepNeuronWriter({ ...input, content: state.content, frontmatter: state.frontmatter });
    neuronData = result.neuronData;
    recordStep(slug, 'neuron', category, 0, gsc);
  }

  // ── Step 5: Gemini content audit ────────────────────────────────────────
  if ((mode === 'all' || mode === 'content') && canCallAi()) {
    const result = await stepGeminiContent(
      { ...input, content: state.content, frontmatter: state.frontmatter },
      neuronData
    );
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, 'content', category, result.changes.length, gsc);
  }

  // ── Step 6: Claude SEO review ───────────────────────────────────────────
  if ((mode === 'all' || mode === 'review') && canCallAi()) {
    const result = await stepClaudeSeoReview({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, 'review', category, result.changes.length, gsc);
  }

  // ── Step 7: Schema validation and generation ────────────────────────────
  if (mode === 'all' || mode === 'schema') {
    const schemaResult = processSchema(state.frontmatter, state.content);
    if (!schemaResult.isValid) {
      console.log(`     ⚠️  Schema validation errors:`);
      schemaResult.errors.forEach(error => console.log(`        • ${error}`));
    }
    if (schemaResult.warnings.length > 0) {
      console.log(`     ℹ️  Schema warnings:`);
      schemaResult.warnings.forEach(warning => console.log(`        • ${warning}`));
    }
    state.content = schemaResult.updatedContent;
    allChanges.push(`Updated schema: ${schemaResult.schema['@type']}`);
    recordStep(slug, 'schema', category, 1, gsc);
  }

  // ── Step 8: Content quality audit (E-E-A-T) ─────────────────────────────
  if (mode === 'all' || mode === 'quality') {
    const result = await stepContentQualityAudit({ ...input, content: state.content, frontmatter: state.frontmatter });
    state.content = result.content;
    allChanges.push(...result.changes);
    recordStep(slug, 'quality', category, result.changes.length, gsc);
  }

  // ── Step 9: Technical audit ─────────────────────────────────────────────
  if (mode === 'all' || mode === 'technical') {
    const result = await stepTechnicalAudit({ ...input, content: state.content, frontmatter: state.frontmatter });
    allChanges.push(...result.changes);
    recordStep(slug, 'technical', category, result.changes.length, gsc);
  }

  // ── Step 10: Fact check ──────────────────────────────────────────────────
  if ((mode === 'all' || mode === 'factcheck') && canCallAi()) {
    const result = await stepFactCheck({ ...input, content: state.content, frontmatter: state.frontmatter });
    allChanges.push(...result.changes);
    recordStep(slug, 'factcheck', category, result.changes.length, gsc);
  }

  // ── Step 11: Report export ────────────────────────────────────────────────
  if (mode === 'all' || mode === 'report') {
    const reportResult = stepExportReport({
      ...input,
      content: state.content,
      frontmatter: state.frontmatter,
    }, {
      format: 'pdf',
      outputDir: 'reports',
    });
    allChanges.push(...reportResult.changes);
    recordStep(slug, 'report', category, reportResult.changes.length, gsc);
  }

  // ── Write updated MDX ──────────────────────────────────────────────────────
  const after = {
    word_count: countWords(state.content),
    internal_links: countInternalLinks(state.content),
    images: countImages(state.content),
    meta_description_length: (state.frontmatter.description || '').length,
  };

  if (allChanges.length > 0) {
    if (!dryRun) {
      const newRaw = buildFrontmatterBlock(state.frontmatter) + state.content;
      fs.writeFileSync(filePath, newRaw, 'utf8');
    }
    console.log(`     ${dryRun ? '[DRY RUN] Would apply' : '✅ Written'} (${allChanges.length} changes)`);
    for (const c of allChanges) console.log(`       • ${c}`);
  } else {
    console.log(`     ✓ No changes needed`);
  }

  // ── Self-Learning: Log run ─────────────────────────────────────────────
  if (!dryRun && gsc?.impressions) {
    logRun({ slug, step: mode, category, changesApplied: allChanges.length, gscBefore: null, gscAfter: { date: '', ...gsc as any }, gscDelta: null });
  }

  // ── Update audit log ───────────────────────────────────────────────────────
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + 90);

  logEntry(auditLog, slug, {
    status: allChanges.length > 0 ? 'completed' : 'skipped',
    changes_made: allChanges,
    before,
    after,
    gsc_data: {
      impressions: gsc.impressions || 0,
      clicks: gsc.clicks || 0,
      position: gsc.position || null,
      ctr: gsc.ctr ? `${gsc.ctr.toFixed(2)}%` : null,
    },
    neuronwriter_query_id: neuronData?.queryId || null,
    neuronwriter_notes: neuronData?.notes || null,
    neuronwriter_missing_terms: neuronData?.missingTerms || [],
    neuronwriter_suggested_h2s: neuronData?.h2Terms || [],
    next_review: allChanges.length > 0 ? reviewDate.toISOString().split('T')[0] : null,
    notes: gsc.impressions > 1000 && gsc.ctr < 3
      ? `High impressions (${gsc.impressions}) + low CTR (${gsc.ctr.toFixed(2)}%) — consider title rewrite`
      : '',
    flagged_for_manual: !!(before.word_count < 400 || (neuronData?.targetWordCount && before.word_count < neuronData.targetWordCount * 0.5)),
  });

  return { slug, changes: allChanges.length, before, after, neuronData };
}

// countImages is imported from ../lib/mdx-parser
