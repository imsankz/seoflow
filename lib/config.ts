/**
 * SeoFlow — Site configuration.
 *
 * Each project provides a seoflow.config.json at the root.
 * This loader reads it and provides typed access to all site-specific values.
 */
import fs from 'fs';
import path from 'path';

export interface SeoFlowConfig {
  siteName: string;
  siteUrl: string;
  author: string;
  authorLocation: string;
  /** Single voice sample string, or per-category map. Optional — omit for non-blog use cases. */
  writingSample?: string;
  /** Per content-type voice samples: { "guide": "...", "review": "...", "itinerary": "..." } */
  writingSamples?: Record<string, string>;
  postsDir: string;
  gscPagesCsv: string;
  gscQueriesCsv: string;
  auditLogPath: string;
  keywordCachePath: string;
  destinationPattern?: string;

  /**
   * Content format adapter: "mdx" | "markdown" | "wordpress"
   * Default: "mdx" — YAML frontmatter + MDX body.
   * "markdown" — same parsing, no JSX-specific patterns.
   * "wordpress" — future: REST API adapter.
   */
  contentFormat?: 'mdx' | 'markdown' | 'wordpress';

  /**
   * Default image search context when no tag/category is available.
   * Set to a domain-relevant term (e.g. "travel", "food", "tech").
   * Default: "travel"
   */
  imageSearchFallback?: string;

  /**
   * Default category label used in AI prompts when frontmatter has none.
   * Default: "travel"
   */
  defaultCategory?: string;

  /**
   * Verb/domain for AI prompts — e.g. "travel blog", "food blog", "SaaS product".
   * Injected into step prompts so AI knows the content domain.
   * Default: "blog"
   */
  contentDomain?: string;

  /**
   * URL path prefix where blog posts live (default: "/blog/").
   * Used to strip the prefix when converting page URLs to slugs.
   * Example: "/posts/" for Hugo sites, "/" for root-level blogs.
   */
  blogPrefix?: string;

  /**
   * Number of days to look back when fetching live GSC data (default: 28).
   * GSC has a ~3-day lag; this value adds 3 days automatically.
   */
  gscDays?: number;

  /**
   * AI usage limits — protect against runaway costs in bulk runs.
   */
  aiLimits?: {
    /** Max total AI calls per pipeline run. Default: unlimited. */
    maxCallsPerRun?: number;
    /** Max AI calls per post. Default: 3 (content + review + factcheck). */
    maxCallsPerPost?: number;
    /** Which AI-powered steps to enable. Omit to enable all. */
    enabledSteps?: Array<'keywords' | 'content' | 'review' | 'factcheck'>;
  };

  /**
   * Slug-pattern → priority score map for the publish step.
   * Each entry: { "pattern": "regex or substring", "score": number }
   * Replaces the built-in travel-specific scoring when provided.
   * Example: [{ "pattern": "review", "score": 90 }, { "pattern": "guide", "score": 60 }]
   */
  publishPriority?: Array<{ pattern: string; score: number }>;

  /**
   * Content types for generation.
   * Each key is a type name (e.g. "guide", "review", "article").
   * Defaults to built-in travel types if not provided.
   */
  contentTypes?: Record<string, { schema: string; instructions: string }>;

  tools: Array<{ keywords: string[]; path: string; anchor: string }>;
  bookings: Array<{ keywords: string[]; path: string; anchor: string }>;

  /** Content generation settings */
  generation?: {
    defaultSchema: string;
    defaultCategory: string;
    wordCountMin: number;
    wordCountMax: number;
  };

  /** Publishing settings */
  publishing?: {
    gitEmail: string;
    gitName: string;
    branch: string;
    indexnowHost?: string;
    majorCities: string[];
    baseUrl: string;
  };
}

const CONFIG_FILE = 'seoflow.config.json';

let _config: SeoFlowConfig | null = null;

function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, CONFIG_FILE))) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}

export function loadConfig(): SeoFlowConfig {
  if (_config) return _config;
  const root = findRoot();
  const p = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(p)) {
    throw new Error(`No ${CONFIG_FILE} found. Run \`npx seoflow init\` first.`);
  }
  let raw: SeoFlowConfig;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}: ${e instanceof Error ? e.message : e}`);
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${CONFIG_FILE} must be a JSON object.`);
  }
  const r = (s: string) => path.resolve(root, s);
  _config = {
    ...raw,
    postsDir: r(raw.postsDir),
    gscPagesCsv: r(raw.gscPagesCsv),
    gscQueriesCsv: r(raw.gscQueriesCsv),
    auditLogPath: r(raw.auditLogPath),
    keywordCachePath: r(raw.keywordCachePath),
  };
  return _config;
}

export function getPostsDir() { return loadConfig().postsDir; }
export function getAuditLogPath() { return loadConfig().auditLogPath; }
export function getKeywordCachePath() { return loadConfig().keywordCachePath; }
export function getSiteUrl() { return loadConfig().siteUrl; }
export function getToolTriggers() { return loadConfig().tools; }
export function getBookingTriggers() { return loadConfig().bookings; }

/**
 * Get the most relevant writing sample for a given content type.
 * Falls back: writingSamples[type] → writingSamples.default → writingSample → undefined.
 */
export function getWritingSample(contentType?: string): string | undefined {
  const c = loadConfig();
  if (c.writingSamples && contentType && c.writingSamples[contentType]) {
    return c.writingSamples[contentType];
  }
  if (c.writingSamples?.default) return c.writingSamples.default;
  return c.writingSample;
}

export function getContentDomain(): string {
  return loadConfig().contentDomain || 'blog';
}

export function getImageSearchFallback(): string {
  return loadConfig().imageSearchFallback || 'travel';
}

export function getDefaultCategory(): string {
  return loadConfig().defaultCategory || loadConfig().generation?.defaultCategory || 'travel';
}

/**
 * Default content types (travel-focused). Users can override via config.
 */
export const DEFAULT_CONTENT_TYPES: Record<string, { schema: string; instructions: string }> = {
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

export function getContentTypes(): Record<string, { schema: string; instructions: string }> {
  return loadConfig().contentTypes || DEFAULT_CONTENT_TYPES;
}

export function getAiContext() {
  const c = loadConfig();
  return {
    siteName: c.siteName,
    siteUrl: c.siteUrl,
    author: c.author,
    authorLocation: c.authorLocation,
    writingSample: c.writingSample,
    contentDomain: c.contentDomain || 'blog',
  };
}

/**
 * Programmatic config — for library/API usage and testing.
 * Call before any other seoflow functions when not using seoflow.config.json.
 */
export function configure(config: SeoFlowConfig): void {
  _config = config;
}

/**
 * Reset config cache — useful in tests with multiple configs.
 */
export function resetConfig(): void {
  _config = null;
}
