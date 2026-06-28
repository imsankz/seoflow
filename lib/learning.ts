/**
 * SeoFlow — Self-Learning System
 *
 * Tracks which pipeline steps actually improve GSC metrics and adapts
 * prioritization accordingly.
 *
 * Data stored in .seoflow/data/learning.json
 */
import fs from 'fs';
import path from 'path';
import type { GSCPageData } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StepEffectiveness {
  /** Number of times this step was applied */
  runs: number;
  /** How many of those runs showed GSC improvement */
  improved: number;
  /** Average CTR percentage point change after this step */
  avgCtrChange: number;
  /** Average position change (negative = better) */
  avgPositionChange: number;
  /** Categories where this step performs best */
  bestForCategories: string[];
  /** Categories where this step performs worst */
  worstForCategories: string[];
}

export interface GSCBaseline {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface LearningDB {
  version: string;
  updatedAt: string;
  steps: Record<string, StepEffectiveness>;
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
  gscDelta: {
    impressionsChange: number;
    clicksChange: number;
    ctrChange: number;
    positionChange: number;
  } | null;
}

// ─── Paths ────────────────────────────────────────────────────────────────────
function getDataDir(): string {
  const dir = path.resolve(__dirname, '..', 'data');
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

// ─── Learning DB ──────────────────────────────────────────────────────────────
function loadLearningDB(): LearningDB {
  const p = getLearningPath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    steps: {},
    categories: {},
  };
}

function saveLearningDB(db: LearningDB): void {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(getLearningPath(), JSON.stringify(db, null, 2));
}

// ─── GSC Baselines ────────────────────────────────────────────────────────────
function loadGscBaselines(): Record<string, GSCBaseline> {
  const p = getGscBaselinesPath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  return {};
}

function saveGscBaselines(baselines: Record<string, GSCBaseline>): void {
  fs.writeFileSync(getGscBaselinesPath(), JSON.stringify(baselines, null, 2));
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Get the effectiveness score for a step given a category.
 * Returns a value from -1 (hurtful) to 1 (very effective).
 * Steps with fewer than 3 data points return 0 (unknown).
 */
export function stepEffectiveness(step: string, category: string): number {
  const db = loadLearningDB();
  const s = db.steps[step];
  if (!s || s.runs < 3) return 0;

  // Base effectiveness: improved / runs ratio, adjusted by avg position change
  const successRate = s.improved / s.runs;
  const posImprovement = -s.avgPositionChange / 5; // normalize: -5 pos = 1.0
  const base = successRate * 0.6 + Math.min(Math.max(posImprovement, -1), 1) * 0.4;

  // Category bonus/penalty
  const catEffect = (() => {
    if (s.bestForCategories.includes(category)) return 0.3;
    if (s.worstForCategories.includes(category)) return -0.3;
    if (s.bestForCategories.includes('*')) return 0.1;
    return 0;
  })();

  return Math.max(-1, Math.min(1, base + catEffect));
}

/**
 * Record that a step was applied to a post, along with the GSC data at the time.
 */
export function recordStep(
  slug: string,
  step: string,
  category: string,
  changesApplied: number,
  gscData: Partial<GSCPageData>
): void {
  const db = loadLearningDB();

  if (!db.steps[step]) {
    db.steps[step] = {
      runs: 0, improved: 0, avgCtrChange: 0, avgPositionChange: 0,
      bestForCategories: [], worstForCategories: [],
    };
  }

  db.steps[step].runs += changesApplied > 0 ? 1 : 0;

  // Track category for this step
  if (category) {
    if (!db.categories[category]) db.categories[category] = 0;
    db.categories[category]++;
  }

  saveLearningDB(db);

  // Store GSC baseline for this slug (to diff on next run)
  if (gscData.impressions || gscData.clicks) {
    const baselines = loadGscBaselines();
    baselines[slug] = {
      date: new Date().toISOString(),
      impressions: gscData.impressions || 0,
      clicks: gscData.clicks || 0,
      ctr: gscData.ctr || 0,
      position: gscData.position || 0,
    };
    saveGscBaselines(baselines);
  }
}

/**
 * Check if a slug has a GSC baseline from a previous run.
 * If it does, calculate the delta from current data and update learning scores.
 * Returns the delta if available, or null.
 */
export function checkGscDelta(
  slug: string,
  step: string,
  category: string,
  currentGsc: Partial<GSCPageData>
): { impressionsChange: number; clicksChange: number; ctrChange: number; positionChange: number } | null {
  const baselines = loadGscBaselines();
  const before = baselines[slug];
  if (!before || !currentGsc.impressions) return null;

  const delta = {
    impressionsChange: currentGsc.impressions - before.impressions,
    clicksChange: (currentGsc.clicks || 0) - before.clicks,
    ctrChange: (currentGsc.ctr || 0) - before.ctr,
    positionChange: (currentGsc.position || 0) - before.position,
  };

  // Update learning: did the post improve?
  const improved = delta.clicksChange > 0 || (delta.positionChange < 0 && delta.impressionsChange > 0);

  const db = loadLearningDB();
  const s = db.steps[step];
  if (s) {
    s.improved += improved ? 1 : 0;
    s.avgCtrChange = (s.avgCtrChange * (s.runs - 1) + delta.ctrChange) / s.runs;
    s.avgPositionChange = (s.avgPositionChange * (s.runs - 1) + delta.positionChange) / s.runs;

    // Update best/worst categories
    const cat = category || 'unknown';
    if (improved) {
      if (!s.bestForCategories.includes(cat)) s.bestForCategories.push(cat);
    } else {
      if (!s.worstForCategories.includes(cat)) s.worstForCategories.push(cat);
    }
    // Trim to keep relevant
    s.bestForCategories = s.bestForCategories.slice(-10);
    s.worstForCategories = s.worstForCategories.slice(-10);

    saveLearningDB(db);
  }

  return delta;
}

/**
 * Get step effectiveness for display in session summary.
 */
export function getLearningSummary(): string[] {
  const db = loadLearningDB();
  const lines: string[] = [];
  for (const [step, s] of Object.entries(db.steps)) {
    if (s.runs < 3) continue;
    const pct = Math.round((s.improved / s.runs) * 100);
    const pos = s.avgPositionChange.toFixed(1);
    const dir = s.avgPositionChange < 0 ? '↑' : '↓';
    lines.push(`  ${step}: ${pct}% success (${s.runs} runs, avg pos ${dir}${Math.abs(parseFloat(pos))})`);
  }
  return lines;
}

/**
 * Log a per-run record for detailed analysis.
 */
export function logRun(record: Omit<RunRecord, 'timestamp'>): void {
  const log: RunRecord = { ...record, timestamp: new Date().toISOString() };
  const dir = getRunLogDir();
  const filename = `run-${new Date().toISOString().split('T')[0]}.jsonl`;
  const filepath = path.join(dir, filename);
  fs.appendFileSync(filepath, JSON.stringify(log) + '\n');
}
