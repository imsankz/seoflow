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
  writingSample: string;
  postsDir: string;
  gscPagesCsv: string;
  gscQueriesCsv: string;
  auditLogPath: string;
  keywordCachePath: string;
  destinationPattern?: string;
  tools: Array<{ keywords: string[]; path: string; anchor: string }>;
  bookings: Array<{ keywords: string[]; path: string; anchor: string }>;
}

const CONFIG_FILE = 'seoflow.config.json';

let _config: SeoFlowConfig | null = null;

function findRoot(): string {
  let dir = path.resolve(__dirname);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, CONFIG_FILE))) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return path.resolve(__dirname, '..', '..');
}

export function loadConfig(): SeoFlowConfig {
  if (_config) return _config;
  const root = findRoot();
  const p = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(p)) {
    throw new Error(`No ${CONFIG_FILE} found. Run \`npx seoflow init\` first.`);
  }
  const raw: SeoFlowConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
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
export function getAiContext() {
  const c = loadConfig();
  return { siteName: c.siteName, siteUrl: c.siteUrl, author: c.author, authorLocation: c.authorLocation, writingSample: c.writingSample };
}
