/**
 * SeoFlow — Self-Learning System v2
 *
 * Tracks three layers of learning:
 * 1. Step effectiveness — which pipeline steps improve GSC metrics
 * 2. Content patterns — which title lengths, desc lengths, image densities correlate with success
 * 3. Predictive priority — uses learned patterns to score improvement potential per post
 */
import fs from 'fs';
import path from 'path';
import type { GSCPageData } from './types';
import { loadConfig } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepEffectiveness {
  runs: number;
  improved: number;
  avgCtrChange: number;
  avgPositionChange: number;
  bestForCategories: string[];
  worstForCategories: string[];
}

export interface GSCBaseline {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface ContentSnapshot {
  title: string;
  titleLength: number;
  descLength: number;
  wordCount: number;
  imageCount: number;
  imageDensity: number;
  linkCount: number;
  schema: string;
  category: string;
}

export interface PatternInsight {
  dimension: string;
  range: string;
  avgCtr: number;
  avgPosition: number;
  sampleSize: number;
  recommendation: string | null;
}

export interface LearningDB {
  version: string;
  updatedAt: string;
  steps: Record<string, StepEffectiveness>;
  contentSnapshots: Record<string, ContentSnapshot>;
  patterns: Record<string, PatternInsight[]>;
  categories: Record<string, number>;
}

export interface RunRecord {
  timestamp: string;
  slug: string;
  step: string;
  category: string;
  changesApplied: number;
  gscBefore: GSCBaseline | null;
  gscAfter: GSCBaseline | null;
  gscDelta: { impressionsChange: number; clicksChange: number; ctrChange: number; positionChange: number } | null;
}

// ─── Paths ────────────────────────────────────────────────────────────────────

function getDataDir(): string {
  const dir = path.dirname(loadConfig().auditLogPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLearningPath(): string {
  return path.join(getDataDir(), 'learning.json');
}

function getGscBaselinesPath(): string {
  return path.join(getDataDir(), 'gsc-baselines.json');
}

function getRunLogDir(): string {
  const dir = path.join(getDataDir(), 'run-log');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── DB Operations ────────────────────────────────────────────────────────────

function loadDB(): LearningDB {
  const fallback = (): LearningDB => ({
    version: '2.0',
    updatedAt: new Date().toISOString(),
    steps: {},
    contentSnapshots: {},
    patterns: {},
    categories: {},
  });
  const p = getLearningPath();
  if (fs.existsSync(p)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      return {
        ...fallback(),
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        steps: parsed?.steps && typeof parsed.steps === 'object' ? parsed.steps : {},
        contentSnapshots: parsed?.contentSnapshots && typeof parsed.contentSnapshots === 'object' ? parsed.contentSnapshots : {},
        patterns: parsed?.patterns && typeof parsed.patterns === 'object' ? parsed.patterns : {},
        categories: parsed?.categories && typeof parsed.categories === 'object' ? parsed.categories : {},
      };
    } catch {}
  }
  return fallback();
}

function saveDB(db: LearningDB): void {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(getLearningPath(), JSON.stringify(db, null, 2));
}

function loadGscBaselines(): Record<string, GSCBaseline> {
  const p = getGscBaselinesPath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  return {};
}

function saveGscBaselines(b: Record<string, GSCBaseline>): void {
  fs.writeFileSync(getGscBaselinesPath(), JSON.stringify(b, null, 2));
}

// ─── Content Snapshot ─────────────────────────────────────────────────────────

/**
 * Store a content snapshot for pattern analysis.
 * Call this after processing each post.
 */
export function recordContentSnapshot(slug: string, data: ContentSnapshot): void {
  const db = loadDB();
  db.contentSnapshots[slug] = data;
  saveDB(db);
  refreshPatterns(db);
}

function refreshPatterns(db: LearningDB): void {
  const baselines = loadGscBaselines();
  const snapshots = db.contentSnapshots;
  const byTitleLength: { len: number; ctr: number; pos: number }[] = [];
  const byDescLength: { len: number; ctr: number; pos: number }[] = [];
  const byImageDensity: { density: number; ctr: number; pos: number }[] = [];
  const byWordCount: { wc: number; ctr: number; pos: number }[] = [];

  for (const [slug, s] of Object.entries(snapshots)) {
    const gsc = baselines[slug];
    if (!gsc) continue;
    byTitleLength.push({ len: s.titleLength, ctr: gsc.ctr, pos: gsc.position });
    byDescLength.push({ len: s.descLength, ctr: gsc.ctr, pos: gsc.position });
    byImageDensity.push({ density: s.imageDensity, ctr: gsc.ctr, pos: gsc.position });
    byWordCount.push({ wc: s.wordCount, ctr: gsc.ctr, pos: gsc.position });
  }

  const patterns: Record<string, PatternInsight[]> = {};

  // Title length patterns
  patterns.title = bucketAndAnalyze(
    byTitleLength.map(d => ({ value: d.len, ctr: d.ctr, pos: d.pos })),
    [0, 40, 50, 60, 70, 1000],
    ['<40', '40-49', '50-59', '60-69', '70+'],
    'title length'
  );

  // Description length patterns
  patterns.description = bucketAndAnalyze(
    byDescLength.map(d => ({ value: d.len, ctr: d.ctr, pos: d.pos })),
    [0, 120, 140, 155, 165, 200, 1000],
    ['<120', '120-139', '140-154', '155-165', '166-200', '200+'],
    'meta description'
  );

  // Image density patterns (images per 1000 words)
  patterns.imageDensity = bucketAndAnalyze(
    byImageDensity.map(d => ({ value: d.density * 1000, ctr: d.ctr, pos: d.pos })),
    [0, 0.5, 1, 2, 4, 100],
    ['<0.5/1k', '0.5-1/1k', '1-2/1k', '2-4/1k', '4+/1k'],
    'images per 1000 words'
  );

  // Word count patterns
  patterns.wordCount = bucketAndAnalyze(
    byWordCount.map(d => ({ value: d.wc, ctr: d.ctr, pos: d.pos })),
    [0, 500, 1000, 1500, 2500, 100000],
    ['<500', '500-1000', '1000-1500', '1500-2500', '2500+'],
    'word count'
  );

  db.patterns = patterns;
  saveDB(db);
}

function bucketAndAnalyze(
  data: { value: number; ctr: number; pos: number }[],
  thresholds: number[],
  labels: string[],
  dimension: string
): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (let i = 0; i < thresholds.length - 1; i++) {
    const bucket = data.filter(d => d.value >= thresholds[i] && d.value < thresholds[i + 1]);
    if (bucket.length < 3) continue;
    const avgCtr = bucket.reduce((s, d) => s + d.ctr, 0) / bucket.length;
    const avgPos = bucket.reduce((s, d) => s + d.pos, 0) / bucket.length;

    // Generate recommendation if this is the best bucket
    const bestBucketCtr = insights.length > 0 ? Math.max(...insights.map(i => i.avgCtr)) : 0;
    const isBest = bucket.length >= 3 && (insights.length === 0 || avgCtr >= bestBucketCtr);
    const worstCtr = insights.length > 0 ? Math.min(...insights.map(i => i.avgCtr)) : avgCtr;

    insights.push({
      dimension,
      range: labels[i],
      avgCtr,
      avgPosition: avgPos,
      sampleSize: bucket.length,
      recommendation: isBest && bucket.length >= 5
        ? `Posts with ${labels[i]} ${dimension} avg ${avgCtr.toFixed(1)}% CTR (best range)`
        : null,
    });
  }

  // Sort by CTR descending
  insights.sort((a, b) => b.avgCtr - a.avgCtr);

  // Only keep top recommendation
  if (insights.length > 0 && insights[0].sampleSize >= 5) {
    insights[0].recommendation = `Posts with ${insights[0].range} ${dimension} perform best: ${insights[0].avgCtr.toFixed(1)}% CTR, pos ${insights[0].avgPosition.toFixed(1)}`;
  }

  return insights;
}

// ─── Step Effectiveness ───────────────────────────────────────────────────────

export function stepEffectiveness(step: string, category: string): number {
  const db = loadDB();
  const s = db.steps[step];
  if (!s || s.runs < 3) return 0;
  const successRate = s.improved / s.runs;
  const posImprovement = -s.avgPositionChange / 5;
  const base = successRate * 0.6 + Math.min(Math.max(posImprovement, -1), 1) * 0.4;
  const catBonus = s.bestForCategories.includes(category) ? 0.3 : s.worstForCategories.includes(category) ? -0.3 : s.bestForCategories.includes('*') ? 0.1 : 0;
  return Math.max(-1, Math.min(1, base + catBonus));
}

export function recordStep(slug: string, step: string, category: string, changesApplied: number, gscData: Partial<GSCPageData>): void {
  const db = loadDB();
  if (!db.steps[step]) {
    db.steps[step] = { runs: 0, improved: 0, avgCtrChange: 0, avgPositionChange: 0, bestForCategories: [], worstForCategories: [] };
  }
  db.steps[step].runs += changesApplied > 0 ? 1 : 0;
  if (category) {
    if (!db.categories[category]) db.categories[category] = 0;
    db.categories[category]++;
  }
  saveDB(db);

  if (gscData.impressions || gscData.clicks) {
    const baselines = loadGscBaselines();
    baselines[slug] = { date: new Date().toISOString(), impressions: gscData.impressions || 0, clicks: gscData.clicks || 0, ctr: gscData.ctr || 0, position: gscData.position || 0 };
    saveGscBaselines(baselines);
  }
}

export function checkGscDelta(slug: string, step: string, category: string, currentGsc: Partial<GSCPageData>): { impressionsChange: number; clicksChange: number; ctrChange: number; positionChange: number } | null {
  const baselines = loadGscBaselines();
  const before = baselines[slug];
  if (!before || !currentGsc.impressions) return null;
  const delta = {
    impressionsChange: currentGsc.impressions - before.impressions,
    clicksChange: (currentGsc.clicks || 0) - before.clicks,
    ctrChange: (currentGsc.ctr || 0) - before.ctr,
    positionChange: (currentGsc.position || 0) - before.position,
  };
  const improved = delta.clicksChange > 0 || (delta.positionChange < 0 && delta.impressionsChange > 0);
  const db = loadDB();
  const s = db.steps[step];
  if (s && s.runs > 0) {
    s.improved += improved ? 1 : 0;
    s.avgCtrChange = (s.avgCtrChange * (s.runs - 1) + delta.ctrChange) / s.runs;
    s.avgPositionChange = (s.avgPositionChange * (s.runs - 1) + delta.positionChange) / s.runs;
    const cat = category || 'unknown';
    if (improved) { if (!s.bestForCategories.includes(cat)) s.bestForCategories.push(cat); }
    else { if (!s.worstForCategories.includes(cat)) s.worstForCategories.push(cat); }
    s.bestForCategories = s.bestForCategories.slice(-10);
    s.worstForCategories = s.worstForCategories.slice(-10);
    saveDB(db);
  }
  return delta;
}

// ─── Predictive Priority ──────────────────────────────────────────────────────

export interface PredictiveScore {
  slug: string;
  totalScore: number;
  stepScores: Record<string, number>;
  patterns: string[];
}

/**
 * Score a post's improvement potential using learned patterns.
 * Higher score = more likely to benefit from pipeline steps.
 */
export function predictPriority(
  slug: string,
  gsc: Partial<GSCPageData>,
  content?: ContentSnapshot
): PredictiveScore {
  const db = loadDB();
  let totalScore = 0;
  const stepScores: Record<string, number> = {};
  const patterns: string[] = [];

  // GSC-based signals
  if (gsc.impressions && gsc.impressions > 5000) totalScore += 30;
  else if (gsc.impressions && gsc.impressions > 1000) totalScore += 20;
  else if (gsc.impressions && gsc.impressions > 500) totalScore += 10;

  if (gsc.position && gsc.position >= 5 && gsc.position <= 15) totalScore += 35;  // striking distance
  else if (gsc.position && gsc.position > 15 && gsc.position <= 30) totalScore += 20;

  if (gsc.impressions && gsc.impressions > 500 && gsc.ctr && gsc.ctr < 3) totalScore += 25;

  // Content-based signals
  if (content) {
    // Check title length against learned patterns
    const titlePatterns = db.patterns.title || [];
    if (titlePatterns.length > 0) {
      const bestRange = titlePatterns[0];
      const isOptimal = titlePatterns.some(p => {
        if (!p.range) return false;
        const [low, high] = p.range.split('-').map(s => parseInt(s));
        if (!isNaN(low) && !isNaN(high) && content.titleLength >= low && content.titleLength < high) return true;
        return false;
      });
      if (!isOptimal) {
        totalScore += 15;
        patterns.push(`Title length (${content.titleLength}) not in optimal range (${bestRange.range} = ${bestRange.avgCtr.toFixed(1)}% CTR)`);
      }
    }

    // Check image density against learned patterns
    const imgPatterns = db.patterns.imageDensity || [];
    if (imgPatterns.length > 0 && content.imageDensity < 1) {
      totalScore += 10;
      patterns.push(`Low image density (${(content.imageDensity * 1000).toFixed(1)}/1k words)`);
    }

    // Check word count against learned patterns
    const wcPatterns = db.patterns.wordCount || [];
    if (wcPatterns.length > 0) {
      const bestWcBucket = wcPatterns[0];
      if (content.wordCount < 1000 && bestWcBucket.sampleSize >= 5) {
        totalScore += 10;
        patterns.push(`Word count (${content.wordCount}) below optimal (${bestWcBucket.range} = ${bestWcBucket.avgCtr.toFixed(1)}% CTR)`);
      }
    }

    // Check description length
    const descPatterns = db.patterns.description || [];
    if (descPatterns.length > 0) {
      const bestDesc = descPatterns[0];
      if (content.descLength < 120 || content.descLength > 165) {
        totalScore += 10;
        patterns.push(`Meta description (${content.descLength} chars) outside optimal range (${bestDesc.range})`);
      }
    }
  }

  // Step-specific scores using learned effectiveness
  for (const [step, data] of Object.entries(db.steps)) {
    if (data.runs < 3) continue;
    const score = (data.improved / data.runs) * (-data.avgPositionChange);
    if (score > 0) {
      stepScores[step] = Math.round(score * 10);
    }
  }

  return { slug, totalScore, stepScores, patterns };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function getLearningSummary(): string[] {
  const db = loadDB();
  const lines: string[] = [];

  // Step effectiveness
  for (const [step, s] of Object.entries(db.steps)) {
    if (s.runs < 3) continue;
    const pct = Math.round((s.improved / s.runs) * 100);
    const pos = s.avgPositionChange.toFixed(1);
    const dir = s.avgPositionChange < 0 ? '↑' : '↓';
    lines.push(`  ${step}: ${pct}% success (${s.runs}x, pos ${dir}${Math.abs(parseFloat(pos))})`);
  }

  // Content pattern recommendations
  for (const [dim, insights] of Object.entries(db.patterns)) {
    if (insights.length > 0 && insights[0].sampleSize >= 5) {
      lines.push(`  📐 ${dim}: best = ${insights[0].range} (${insights[0].avgCtr.toFixed(1)}% CTR)`);
    }
  }

  return lines;
}

export function logRun(record: Omit<RunRecord, 'timestamp'>): void {
  const log: RunRecord = { ...record, timestamp: new Date().toISOString() };
  const dir = getRunLogDir();
  fs.appendFileSync(path.join(dir, `run-${new Date().toISOString().split('T')[0]}.jsonl`), JSON.stringify(log) + '\n');
}
