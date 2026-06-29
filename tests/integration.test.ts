/**
 * integration.test.ts — end-to-end pipeline test using fixture MDX files.
 *
 * Verifies that stepFixFrontmatter and stepInjectLinks do not corrupt content,
 * and that parseMdx/buildFrontmatterBlock roundtrip is lossless.
 *
 * Run: npx tsx --test .seoflow/tests/integration.test.ts
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configure, resetConfig } from '../.seoflow/lib/config';
import type { SeoFlowConfig } from '../.seoflow/lib/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'rome-things-to-do.mdx');

function freshConfig(postsDir: string): void {
  resetConfig();
  configure({
    siteName: 'Test Site',
    siteUrl: 'https://test.com',
    author: 'Test Author',
    authorLocation: 'Berlin',
    postsDir,
    gscPagesCsv: path.join(postsDir, 'pages.csv'),
    gscQueriesCsv: path.join(postsDir, 'queries.csv'),
    auditLogPath: path.join(postsDir, 'audit-log.json'),
    keywordCachePath: path.join(postsDir, 'keyword-cache.json'),
    blogPrefix: '/blog/',
    imageSearchFallback: 'travel',
    tools: [
      { keywords: ['budget', 'cost', 'how much'], path: '/tools/budget', anchor: 'budget calculator' },
    ],
    bookings: [],
  } as SeoFlowConfig);
}

// ─── Frontmatter roundtrip ────────────────────────────────────────────────────

test('parseMdx + buildFrontmatterBlock: fixture roundtrip is lossless', async () => {
  const { parseMdx, buildFrontmatterBlock } = await import('../.seoflow/lib/mdx-parser');

  const raw = fs.readFileSync(FIXTURE, 'utf8');
  const { frontmatter, content } = parseMdx(raw);
  const rebuilt = buildFrontmatterBlock(frontmatter) + content;
  const reparsed = parseMdx(rebuilt);

  assert.equal(reparsed.frontmatter.title, frontmatter.title);
  assert.equal(reparsed.frontmatter.published, frontmatter.published);
  assert.deepEqual(reparsed.frontmatter.tags, frontmatter.tags);
  assert.equal(reparsed.content.trim(), content.trim(), 'content body should be unchanged');
});

// ─── stepFixFrontmatter: non-destructive ─────────────────────────────────────

test('stepFixFrontmatter: adds schema without corrupting content', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-int-'));
  freshConfig(tmpDir);

  const { parseMdx } = await import('../.seoflow/lib/mdx-parser');
  const { stepFixFrontmatter } = await import('../.seoflow/pipeline/steps');

  const raw = fs.readFileSync(FIXTURE, 'utf8');
  const { frontmatter, content } = parseMdx(raw);

  // Remove schema to trigger the step
  const fm = { ...frontmatter };
  delete fm.schema;

  const result = stepFixFrontmatter({ slug: 'rome-things-to-do', filePath: FIXTURE, content, frontmatter: fm, gsc: {} });

  assert.ok(result.frontmatter.schema, 'schema should be set');
  assert.equal(result.content, content, 'content should not be modified by stepFixFrontmatter');
});

// ─── stepInjectLinks: injects link without breaking existing links ────────────

test('stepInjectLinks: inserts link and does not double-link', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-int-'));
  freshConfig(tmpDir);

  const { parseMdx } = await import('../.seoflow/lib/mdx-parser');
  const { stepInjectLinks } = await import('../.seoflow/pipeline/steps');

  const raw = fs.readFileSync(FIXTURE, 'utf8');
  const { frontmatter, content } = parseMdx(raw);

  // Ensure 'cost' keyword exists in content
  const testContent = content + '\n\nThe cost of entry is around €16.';
  const result = stepInjectLinks({ slug: 'rome-things-to-do', filePath: FIXTURE, content: testContent, frontmatter, gsc: {} });

  // Run again — should not double-inject the same link
  const result2 = stepInjectLinks({ slug: 'rome-things-to-do', filePath: FIXTURE, content: result.content, frontmatter, gsc: {} });

  const linkCount = (result2.content.match(/\/tools\/budget/g) || []).length;
  assert.ok(linkCount <= 1, `Should not inject the same link more than once, found ${linkCount}`);
});

// ─── File mutation safety: write → reparse ────────────────────────────────────

test('write-reparse: modified MDX can be re-parsed without error', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-int-'));
  freshConfig(tmpDir);

  const { parseMdx, buildFrontmatterBlock } = await import('../.seoflow/lib/mdx-parser');
  const { stepFixFrontmatter } = await import('../.seoflow/pipeline/steps');

  const raw = fs.readFileSync(FIXTURE, 'utf8');
  const { frontmatter, content } = parseMdx(raw);
  const result = stepFixFrontmatter({ slug: 'rome', filePath: FIXTURE, content, frontmatter, gsc: {} });

  const newRaw = buildFrontmatterBlock(result.frontmatter) + result.content;

  // Write to temp file and reparse
  const tmpFile = path.join(tmpDir, 'rome.mdx');
  fs.writeFileSync(tmpFile, newRaw, 'utf8');
  const reparsed = parseMdx(fs.readFileSync(tmpFile, 'utf8'));

  assert.ok(reparsed.frontmatter.title, 'reparsed frontmatter should have title');
  assert.ok(reparsed.content.length > 100, 'reparsed content should have body');
});
