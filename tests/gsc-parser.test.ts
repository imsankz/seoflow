/**
 * gsc-parser.test.ts — unit tests for CSV column auto-detection
 * across English and German GSC export formats.
 *
 * Run: npx tsx --test .seoflow/tests/gsc-parser.test.ts
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configure, resetConfig } from '../lib/config';
import type { SeoFlowConfig } from '../lib/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCsv(header: string, rows: string[]): string {
  return [header, ...rows].join('\n');
}

function writeTempCsv(content: string): string {
  const file = path.join(os.tmpdir(), `seoflow-test-${Date.now()}.csv`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function makeTestConfig(pagesCsv: string, queriesCsv: string): SeoFlowConfig {
  return {
    siteName: 'Test',
    siteUrl: 'https://test.com',
    author: 'Test Author',
    authorLocation: 'Berlin',
    postsDir: os.tmpdir(),
    gscPagesCsv: pagesCsv,
    gscQueriesCsv: queriesCsv,
    auditLogPath: path.join(os.tmpdir(), 'audit-log.json'),
    keywordCachePath: path.join(os.tmpdir(), 'keyword-cache.json'),
    blogPrefix: '/blog/',
    tools: [],
    bookings: [],
  };
}

// ─── English CSV format ───────────────────────────────────────────────────────

test('parseGscPagesFromCsv: English column names', async () => {
  const csv = makeCsv(
    'Page,Clicks,Impressions,CTR,Position',
    [
      'https://test.com/blog/my-post/,100,2000,5.00%,8.5',
      'https://test.com/blog/other-post/,50,500,10.00%,3.2',
    ]
  );
  const file = writeTempCsv(csv);

  resetConfig();
  configure(makeTestConfig(file, file));

  const { parseGscPagesFromCsv } = await import('../lib/gsc-parser');
  const result = parseGscPagesFromCsv();

  assert.ok(result['my-post'], 'should find my-post');
  assert.equal(result['my-post'].clicks, 100);
  assert.equal(result['my-post'].impressions, 2000);
  assert.equal(result['my-post'].position, 8.5);
  assert.ok(result['my-post'].ctr > 4 && result['my-post'].ctr < 6, 'CTR should be ~5%');
});

// ─── German CSV format ────────────────────────────────────────────────────────

test('parseGscPagesFromCsv: German column names (Klicks, Impressionen)', async () => {
  const csv = makeCsv(
    'Häufigste Seiten,Klicks,Impressionen,CTR,Position',
    [
      'https://test.com/blog/berlin-guide/,200,3000,6.67%,5.1',
    ]
  );
  const file = writeTempCsv(csv);

  resetConfig();
  configure(makeTestConfig(file, file));

  const { parseGscPagesFromCsv } = await import('../lib/gsc-parser');
  const result = parseGscPagesFromCsv();

  assert.ok(result['berlin-guide'], 'should find berlin-guide');
  assert.equal(result['berlin-guide'].clicks, 200);
  assert.equal(result['berlin-guide'].impressions, 3000);
});

// ─── CTR normalisation ────────────────────────────────────────────────────────

test('parseGscPagesFromCsv: normalises fractional CTR (0.1164 → 11.64)', async () => {
  const csv = makeCsv(
    'Page,Clicks,Impressions,CTR,Position',
    ['https://test.com/blog/test-post/,50,430,0.1164,12']
  );
  const file = writeTempCsv(csv);

  resetConfig();
  configure(makeTestConfig(file, file));

  const { parseGscPagesFromCsv } = await import('../lib/gsc-parser');
  const result = parseGscPagesFromCsv();

  assert.ok(result['test-post'], 'should find test-post');
  assert.ok(result['test-post'].ctr > 11 && result['test-post'].ctr < 12, `CTR should be ~11.64, got ${result['test-post'].ctr}`);
});

// ─── Missing file graceful fallback ──────────────────────────────────────────

test('parseGscPagesFromCsv: returns empty object when file missing', async () => {
  resetConfig();
  configure(makeTestConfig('/tmp/nonexistent-pages.csv', '/tmp/nonexistent-queries.csv'));

  const { parseGscPagesFromCsv } = await import('../lib/gsc-parser');
  const result = parseGscPagesFromCsv();
  assert.deepEqual(result, {});
});

// ─── blogPrefix stripping ────────────────────────────────────────────────────

test('parseGscPagesFromCsv: respects custom blogPrefix', async () => {
  const csv = makeCsv(
    'Page,Clicks,Impressions,CTR,Position',
    ['https://test.com/posts/my-article/,10,100,10%,15']
  );
  const file = writeTempCsv(csv);

  resetConfig();
  const cfg = makeTestConfig(file, file);
  cfg.blogPrefix = '/posts/';
  configure(cfg);

  const { parseGscPagesFromCsv } = await import('../lib/gsc-parser');
  const result = parseGscPagesFromCsv();
  assert.ok(result['my-article'], 'should strip /posts/ prefix');
});
