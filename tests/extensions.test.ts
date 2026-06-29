import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSupportedExtensions, getExtensionState, installExtension } from '../lib/extensions';

test('lists the supported optional extensions', () => {
  const extensions = getSupportedExtensions();
  assert.ok(extensions.length >= 8);
  assert.ok(extensions.some(ext => ext.id === 'dataforseo'));
  assert.ok(extensions.some(ext => ext.id === 'firecrawl'));
  assert.ok(extensions.some(ext => ext.id === 'banana'));
});

test('installs an extension and persists state', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-ext-'));
  const result = installExtension('dataforseo', { rootDir: tmpRoot });

  assert.equal(result.installed, true);
  assert.equal(result.extensionId, 'dataforseo');
  assert.equal(result.status, 'installed');

  const state = getExtensionState(tmpRoot);
  assert.equal(state['dataforseo']?.status, 'installed');
  assert.equal(state['dataforseo']?.installedAt?.length > 0, true);
});

test('installs extension assets into the local SeoFlow workspace', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seoflow-ext-'));
  const result = installExtension('dataforseo', { rootDir: tmpRoot });

  assert.equal(result.installed, true);
  const installedPath = path.join(tmpRoot, '.seoflow', 'extensions', 'dataforseo');
  assert.equal(fs.existsSync(installedPath), true);
  assert.equal(fs.existsSync(path.join(installedPath, 'README.md')), true);
});

test('reports an unknown extension as unavailable', () => {
  const state = getExtensionState(process.cwd(), 'does-not-exist');
  assert.equal(state.status, 'unavailable');
});
