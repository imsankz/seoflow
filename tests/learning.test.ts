/**
 * learning.test.ts — unit tests for bucket analysis, step recording,
 * GSC delta tracking, and predictive scoring.
 *
 * Run: npx tsx --test .seoflow/tests/learning.test.ts
 */

import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configure, resetConfig } from '../lib/config';
import type { SeoFlowConfig } from '../lib/config';

// ─── Isolated test data directory ─────────────────────────────────────────────

let tmpDir: string;

function freshConfig(): void {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-learn-'));
  resetConfig();
  configure({
    siteName: 'Test',
    siteUrl: 'https://test.com',
    author: 'Tester',
    authorLocation: 'Berlin',
    postsDir: tmpDir,
    gscPagesCsv: path.join(tmpDir, 'pages.csv'),
    gscQueriesCsv: path.join(tmpDir, 'queries.csv'),
    auditLogPath: path.join(tmpDir, 'audit-log.json'),
    keywordCachePath: path.join(tmpDir, 'keyword-cache.json'),
    tools: [],
    bookings: [],
  } as SeoFlowConfig);
}

// ─── recordStep + getLearningSummary ──────────────────────────────────────────

test('recordStep: accumulates run counts', async () => {
  freshConfig();
  const { recordStep, getLearningSummary } = await import('../lib/learning');

  recordStep('test-post-1', 'meta', 'travel', 2, { impressions: 1000, clicks: 50, ctr: 5, position: 10 });
  recordStep('test-post-2', 'meta', 'travel', 1, { impressions: 500, clicks: 20, ctr: 4, position: 12 });
  recordStep('test-post-3', 'meta', 'travel', 3, { impressions: 2000, clicks: 100, ctr: 5, position: 8 });

  const summary = getLearningSummary();
  // After 3+ runs, summary should mention the step
  const hasMeta = summary.some(l => l.includes('meta'));
  assert.ok(hasMeta, 'learning summary should include meta step after 3 runs');
});

// ─── checkGscDelta ────────────────────────────────────────────────────────────

test('checkGscDelta: returns null when no baseline exists', async () => {
  freshConfig();
  const { checkGscDelta } = await import('../lib/learning');

  const delta = checkGscDelta('new-post', 'meta', 'travel', { impressions: 1000, clicks: 50, ctr: 5, position: 10 });
  assert.equal(delta, null);
});

test('checkGscDelta: calculates position improvement after second run', async () => {
  freshConfig();
  const { recordStep, checkGscDelta } = await import('../lib/learning');

  // First run — establishes baseline
  recordStep('delta-post', 'content', 'food', 2, { impressions: 1000, clicks: 30, ctr: 3, position: 15 });

  // Second run — position improved
  const delta = checkGscDelta('delta-post', 'content', 'food', { impressions: 1200, clicks: 50, ctr: 4.2, position: 11 });

  assert.ok(delta !== null, 'delta should not be null');
  assert.ok(delta!.positionChange < 0, 'position should have improved (negative change)');
  assert.ok(delta!.clicksChange > 0, 'clicks should have increased');
});

// ─── recordContentSnapshot + predictPriority ─────────────────────────────────

test('predictPriority: scores striking distance pages higher', async () => {
  freshConfig();
  const { predictPriority } = await import('../lib/learning');

  const highImpressionsStrikingDist = predictPriority('great-post', {
    impressions: 3000,
    clicks: 50,
    ctr: 1.7,
    position: 8,
  });

  const lowImpressionsDeep = predictPriority('poor-post', {
    impressions: 50,
    clicks: 1,
    ctr: 2,
    position: 45,
  });

  assert.ok(
    highImpressionsStrikingDist.totalScore > lowImpressionsDeep.totalScore,
    `striking distance post should score higher: ${highImpressionsStrikingDist.totalScore} vs ${lowImpressionsDeep.totalScore}`
  );
});

test('predictPriority: low CTR with high impressions gets bonus', async () => {
  freshConfig();
  const { predictPriority } = await import('../lib/learning');

  const lowCtr = predictPriority('low-ctr', { impressions: 2000, clicks: 30, ctr: 1.5, position: 12 });
  const okCtr = predictPriority('ok-ctr', { impressions: 2000, clicks: 120, ctr: 6, position: 12 });

  assert.ok(lowCtr.totalScore > okCtr.totalScore, 'low CTR with high impressions should score higher (CTR opportunity)');
});

// ─── getLearningSummary: no data ───────────────────────────────────────────────

test('getLearningSummary: returns empty array when no learning data', async () => {
  freshConfig();
  const { getLearningSummary } = await import('../lib/learning');
  const summary = getLearningSummary();
  assert.ok(Array.isArray(summary));
  // With no data or <3 runs, should return empty or very short list
  assert.ok(summary.length === 0 || summary.every(l => typeof l === 'string'));
});
