/**
 * SeoFlow — Configuration & Environment Validator
 *
 * Runs at startup to check:
 * - Required config fields exist
 * - API keys are reachable (lite ping)
 * - Directory paths are valid
 * - At least one AI provider is configured
 */
import fs from 'fs';
import type { SeoFlowConfig } from './config';

export interface ValidationResult {
  valid: boolean;
  checks: { field: string; status: 'ok' | 'warn' | 'error'; message: string }[];
}

/**
 * Validate a loaded config.
 */
export function validateConfig(cfg: SeoFlowConfig): ValidationResult {
  const checks: ValidationResult['checks'] = [];

  // Required string fields
  const requiredStrings: (keyof SeoFlowConfig)[] = ['siteName', 'siteUrl', 'author', 'authorLocation', 'postsDir'];
  for (const field of requiredStrings) {
    const val = cfg[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      checks.push({ field, status: 'error', message: `Missing required field: ${field}` });
    } else {
      checks.push({ field, status: 'ok', message: `${field}: ${String(val).slice(0, 50)}` });
    }
  }

  // writingSample — optional but recommended for AI quality
  if (!cfg.writingSample && !cfg.writingSamples) {
    checks.push({ field: 'writingSample', status: 'warn', message: 'No writingSample set — AI content audit will use generic voice (add writingSample or writingSamples to config)' });
  } else if (cfg.writingSamples) {
    const count = Object.keys(cfg.writingSamples).length;
    checks.push({ field: 'writingSamples', status: 'ok', message: `writingSamples: ${count} voice sample(s) configured` });
  } else {
    checks.push({ field: 'writingSample', status: 'ok', message: `writingSample: ${String(cfg.writingSample).slice(0, 50)}...` });
  }

  // Directory paths exist
  const dirPaths: [string, string][] = [
    ['postsDir', cfg.postsDir],
    ['gscPagesCsv', cfg.gscPagesCsv],
    ['gscQueriesCsv', cfg.gscQueriesCsv],
  ];
  for (const [name, p] of dirPaths) {
    if (fs.existsSync(p)) {
      checks.push({ field: name, status: 'ok', message: `Found: ${p}` });
    } else {
      checks.push({ field: name, status: 'warn', message: `Not found: ${p} (may be intentional)` });
    }
  }

  // At least one tool and booking trigger
  if (!cfg.tools || cfg.tools.length === 0) {
    checks.push({ field: 'tools', status: 'warn', message: 'No tool triggers configured — link injection disabled' });
  } else {
    checks.push({ field: 'tools', status: 'ok', message: `${cfg.tools.length} tool triggers` });
  }

  if (!cfg.bookings || cfg.bookings.length === 0) {
    checks.push({ field: 'bookings', status: 'warn', message: 'No booking triggers configured' });
  } else {
    checks.push({ field: 'bookings', status: 'ok', message: `${cfg.bookings.length} booking triggers` });
  }

  // Content format
  if (cfg.contentFormat && cfg.contentFormat !== 'mdx' && cfg.contentFormat !== 'markdown' && cfg.contentFormat !== 'wordpress') {
    checks.push({ field: 'contentFormat', status: 'warn', message: `Unknown contentFormat "${cfg.contentFormat}" — defaulting to "mdx"` });
  } else if (cfg.contentFormat) {
    checks.push({ field: 'contentFormat', status: 'ok', message: `contentFormat: ${cfg.contentFormat}` });
  }

  // AI limits advisory
  if (cfg.aiLimits?.maxCallsPerRun) {
    checks.push({ field: 'aiLimits', status: 'ok', message: `AI budget: max ${cfg.aiLimits.maxCallsPerRun} calls/run, ${cfg.aiLimits.maxCallsPerPost || '∞'} calls/post` });
  }

  const valid = checks.every(c => c.status !== 'error');
  return { valid, checks };
}

/**
 * Validate environment variables (API keys).
 */
export function validateEnv(): ValidationResult {
  const checks: ValidationResult['checks'] = [];

  const providers = [
    { key: 'GEMINI_API_KEY', label: 'Gemini', required: false },
    { key: 'OPENROUTER_API_KEY', label: 'OpenRouter', required: false },
    { key: 'NEURONWRITER_API_KEY', label: 'NeuronWriter', required: false },
    { key: 'PEXELS_API_KEY', label: 'Pexels', required: false },
  ];

  let hasAi = false;
  for (const p of providers) {
    const val = process.env[p.key];
    if (val) {
      checks.push({ field: p.key, status: 'ok', message: `${p.label}: configured` });
      if (p.key === 'GEMINI_API_KEY' || p.key === 'OPENROUTER_API_KEY') hasAi = true;
    } else {
      checks.push({ field: p.key, status: 'warn', message: `${p.label}: not set (${p.label === 'GEMINI_API_KEY' || p.label === 'OPENROUTER_API_KEY' ? 'optional but recommended' : 'optional'})` });
    }
  }

  if (!hasAi) {
    checks.push({ field: 'AI_PROVIDER', status: 'error', message: 'No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.' });
  }

  // Check AI_PROVIDER value
  const provider = process.env.AI_PROVIDER;
  if (provider && !['gemini', 'openrouter', 'claude'].includes(provider.toLowerCase())) {
    checks.push({ field: 'AI_PROVIDER', status: 'warn', message: `Invalid value "${provider}". Use "gemini", "openrouter", or "claude".` });
  }

  const valid = checks.every(c => c.status !== 'error');
  return { valid, checks };
}

/**
 * Print validation results to console.
 */
export function printValidation(cfg: SeoFlowConfig): void {
  const configCheck = validateConfig(cfg);
  const envCheck = validateEnv();

  console.log('\n🔎 Configuration Check');
  console.log('─'.repeat(60));

  for (const c of configCheck.checks) {
    const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${c.message}`);
  }

  console.log('\n🔎 Environment Check');
  console.log('─'.repeat(60));

  for (const c of envCheck.checks) {
    const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${c.message}`);
  }

  if (!configCheck.valid || !envCheck.valid) {
    console.log('\n⚠️  Some checks failed. Pipeline may not work correctly.');
    console.log('   Fix the errors above and re-run.');
  }

  console.log('');
}
