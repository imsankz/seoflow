/**
 * mdx-parser.test.ts — unit tests for MDX parse/build roundtrip,
 * link injection detection, word/image/link counting.
 *
 * Run: npx tsx --test .seoflow/tests/mdx-parser.test.ts
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseMdx,
  buildFrontmatterBlock,
  countWords,
  countImages,
  countInternalLinks,
  getH2Sections,
  sectionNeedsImage,
} from '../lib/mdx-parser';

// ─── parse / build roundtrip ──────────────────────────────────────────────────

test('parseMdx: extracts string, boolean, number, array fields', () => {
  const raw = `---
title: Hello World
published: true
views: 42
tags:
  - travel
  - europe
---
Body content here.
`;
  const { frontmatter, content } = parseMdx(raw);
  assert.equal(frontmatter.title, 'Hello World');
  assert.equal(frontmatter.published, true);
  assert.equal(frontmatter.views, 42);
  assert.deepEqual(frontmatter.tags, ['travel', 'europe']);
  assert.equal(content.trim(), 'Body content here.');
});

test('parseMdx: handles missing frontmatter', () => {
  const raw = 'Just body content.';
  const { frontmatter, content } = parseMdx(raw);
  assert.deepEqual(frontmatter, {});
  assert.equal(content, raw);
});

test('parseMdx: strips surrounding quotes from string values', () => {
  const raw = `---
title: "Quoted Title"
slug: 'single-quoted'
---
`;
  const { frontmatter } = parseMdx(raw);
  assert.equal(frontmatter.title, 'Quoted Title');
  assert.equal(frontmatter.slug, 'single-quoted');
});

test('buildFrontmatterBlock: roundtrip preserves all fields', () => {
  const fm = {
    title: 'Test Post',
    published: false,
    tags: ['a', 'b'],
    views: 100,
  };
  const block = buildFrontmatterBlock(fm);
  const { frontmatter } = parseMdx(block + '\nBody');
  assert.equal(frontmatter.title, 'Test Post');
  assert.equal(frontmatter.published, false);
  assert.deepEqual(frontmatter.tags, ['a', 'b']);
  assert.equal(frontmatter.views, 100);
});

test('buildFrontmatterBlock: wraps values with colons in quotes', () => {
  const fm = { description: 'Guide: 10 tips' };
  const block = buildFrontmatterBlock(fm);
  assert.match(block, /description: "/);
});

// ─── countWords ───────────────────────────────────────────────────────────────

test('countWords: counts plain words', () => {
  assert.equal(countWords('one two three'), 3);
});

test('countWords: excludes code blocks', () => {
  const content = 'Before\n```js\nconst x = 1;\n```\nAfter';
  assert.equal(countWords(content), 2);
});

test('countWords: excludes HTML tags', () => {
  assert.equal(countWords('<p>hello world</p>'), 2);
});

// ─── countImages ──────────────────────────────────────────────────────────────

test('countImages: counts markdown image syntax', () => {
  const content = '![alt](url1.jpg)\n\nSome text\n\n![alt2](url2.jpg)';
  assert.equal(countImages(content), 2);
});

test('countImages: counts <Image> JSX components', () => {
  const content = '<Image src="/photo.jpg" alt="test" />';
  assert.equal(countImages(content), 1);
});

test('countImages: returns 0 when no images', () => {
  assert.equal(countImages('No images here.'), 0);
});

// ─── countInternalLinks ───────────────────────────────────────────────────────

test('countInternalLinks: counts relative links', () => {
  const content = '[About](/about)\n[Blog](/blog/post-1)';
  assert.equal(countInternalLinks(content), 2);
});

test('countInternalLinks: excludes external links', () => {
  const content = '[External](https://google.com)\n[Internal](/about)';
  assert.equal(countInternalLinks(content), 1);
});

// ─── getH2Sections ────────────────────────────────────────────────────────────

test('getH2Sections: extracts sections with lines', () => {
  const content = `
## Section One
Line 1
Line 2

## Section Two
Line 3
`;
  const sections = getH2Sections(content);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, 'Section One');
  assert.ok(sections[0].lines.some(l => l.includes('Line 1')));
  assert.equal(sections[1].heading, 'Section Two');
});

test('getH2Sections: returns empty array when no H2s', () => {
  assert.deepEqual(getH2Sections('# H1\n\nSome text'), []);
});

// ─── sectionNeedsImage ────────────────────────────────────────────────────────

test('sectionNeedsImage: true when no image and enough words', () => {
  const lines = Array(40).fill('word word word word word'); // 200 words > 150 threshold
  assert.equal(sectionNeedsImage(lines), true);
});

test('sectionNeedsImage: false when image already present', () => {
  const lines = ['![alt](photo.jpg)', ...Array(30).fill('word word word word word')];
  assert.equal(sectionNeedsImage(lines), false);
});

test('sectionNeedsImage: false when section is too short', () => {
  const lines = ['Short section', 'Only a few words'];
  assert.equal(sectionNeedsImage(lines), false);
});
