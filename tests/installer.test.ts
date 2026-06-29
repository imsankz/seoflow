import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getInstallerArtifacts } from '../lib/installer';

test('reports the local install and uninstall scripts', () => {
  const artifacts = getInstallerArtifacts(process.cwd());

  assert.equal(path.basename(artifacts.installSh), 'install.sh');
  assert.equal(path.basename(artifacts.installPs1), 'install.ps1');
  assert.equal(path.basename(artifacts.uninstallSh), 'uninstall.sh');
  assert.equal(path.basename(artifacts.uninstallPs1), 'uninstall.ps1');
});

test('ships Claude Code plugin metadata for local install', () => {
  const rootDir = process.cwd();
  const pluginPath = path.join(rootDir, '.claude-plugin', 'plugin.json');
  const marketplacePath = path.join(rootDir, '.claude-plugin', 'marketplace.json');

  assert.equal(fs.existsSync(pluginPath), true);
  assert.equal(fs.existsSync(marketplacePath), true);

  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));

  assert.equal(plugin.name, 'seoflow');
  assert.equal(marketplace.plugins[0].name, 'seoflow');
});

test('ships the local hook scaffold used for validation', () => {
  const rootDir = process.cwd();
  const hooksJsonPath = path.join(rootDir, 'hooks', 'hooks.json');
  const hookScriptPath = path.join(rootDir, 'hooks', 'run-python-hook.js');
  const validatorPath = path.join(rootDir, 'hooks', 'validate-schema.py');

  assert.equal(fs.existsSync(hooksJsonPath), true);
  assert.equal(fs.existsSync(hookScriptPath), true);
  assert.equal(fs.existsSync(validatorPath), true);

  const hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  assert.equal(hooksConfig.hooks.PostToolUse[0].matcher, 'Edit|Write');
});
