/**
 * Unified AI provider — abstracts Gemini, OpenRouter, and Anthropic Claude behind one API.
 *
 * Usage:
 *   import { aiChat, aiChatWithRetry } from '../lib/ai-provider';
 *   const response = await aiChatWithRetry(prompt, 'content-audit');
 *
 * Provider selection (first available wins):
 *   1. AI_PROVIDER=claude → Anthropic Claude (requires ANTHROPIC_API_KEY)
 *   2. AI_PROVIDER=openrouter → OpenRouter (requires OPENROUTER_API_KEY)
 *   3. AI_PROVIDER=gemini (or unset) → Gemini 2.5 Flash (requires GEMINI_API_KEY)
 *   4. If preferred provider fails, falls back to the other available providers
 *
 * Task-specific model routing:
 *   content-audit: Claude 3.5 Sonnet (direct) or Gemini 2.5 Flash (free, large context)
 *   seo-review:    Claude 3.5 Haiku (direct or OpenRouter)
 *   fact-check:    Claude 3.5 Haiku (direct or OpenRouter)
 */
import { geminiChat, geminiChatWithRetry } from './gemini-client';
import { openrouterChatWithRetry, getModelConfig as getOpenRouterModelConfig, hasOpenRouterKey } from './openrouter-client';
import { claudeChatWithRetry, getModelConfig as getClaudeModelConfig, hasClaudeKey } from './claude-client';
import { loadConfig } from './config';

type ProviderName = 'gemini' | 'openrouter' | 'claude';

// ─── Per-run call counter ─────────────────────────────────────────────────────
// Shared across all aiChat calls in a single pipeline run.
const _runCounter = { count: 0 };

/** Reset the run-level call counter (call at the start of each pipeline run). */
export function resetAiCallCounter(): void {
  _runCounter.count = 0;
}

/** Current call count for the run. */
export function getAiCallCount(): number {
  return _runCounter.count;
}

/** Check if the run-level budget is exceeded. Returns true if the call should proceed. */
function checkBudget(task: string): boolean {
  try {
    const cfg = loadConfig();
    const max = cfg.aiLimits?.maxCallsPerRun;
    if (max && _runCounter.count >= max) {
      console.log(`     ⚠️  AI budget: ${_runCounter.count}/${max} calls used — skipping ${task}`);
      return false;
    }
  } catch {
    // config not loaded yet — allow
  }
  _runCounter.count++;
  return true;
}

function getPreferredProvider(): ProviderName {
  const env = process.env.AI_PROVIDER?.toLowerCase().trim();
  if (env === 'claude' && hasClaudeKey()) return 'claude';
  if (env === 'openrouter' && hasOpenRouterKey()) return 'openrouter';
  if (env === 'gemini' && hasGemini()) return 'gemini';

  // Auto-detect: try Claude first, then OpenRouter, then Gemini
  if (hasClaudeKey()) return 'claude';
  if (hasOpenRouterKey()) return 'openrouter';
  return 'gemini';
}

const hasGemini = (): boolean => !!process.env.GEMINI_API_KEY;

/**
 * Log available AI providers and current config.
 */
export function logAiStatus(): void {
  if (hasClaudeKey()) console.log('   Claude AI: connected (Claude 3.5 Haiku/Sonnet)');
  else console.log('   ⚠️  ANTHROPIC_API_KEY not set — Claude disabled');

  if (hasOpenRouterKey()) {
    console.log(`   OpenRouter: connected (300+ models available)`);
  } else {
    console.log('   ⚠️  OPENROUTER_API_KEY not set — OpenRouter disabled');
  }

  if (hasGemini()) console.log('   Gemini AI: connected (gemini-2.5-flash)');
  else console.log('   ⚠️  GEMINI_API_KEY not set — Gemini disabled');

  const preferred = getPreferredProvider();
  if (preferred === 'claude') console.log(`   → Primary provider: Claude (set AI_PROVIDER=claude)`);
  else if (preferred === 'openrouter') console.log(`   → Primary provider: OpenRouter (set AI_PROVIDER=openrouter)`);
  else console.log(`   → Primary provider: Gemini (set AI_PROVIDER=gemini or unset)`);
}

/**
 * Send a prompt to the best available AI provider.
 *
 * Tries preferred provider → fallback provider → null.
 *
 * @param prompt - The prompt text
 * @param task - Task identifier for model routing ('content-audit', 'seo-review', 'fact-check')
 * @returns Response text or null
 */
export async function aiChat(
  prompt: string,
  task = 'content-audit'
): Promise<string | null> {
  if (!checkBudget(task)) return null;
  const preferred = getPreferredProvider();

  // Try preferred provider
  if (preferred === 'claude' && hasClaudeKey()) {
    const config = getClaudeModelConfig(task);
    const result = await claudeChatWithRetry(prompt, config, 1);
    if (result) return result;
  } else if (preferred === 'openrouter' && hasOpenRouterKey()) {
    const config = getOpenRouterModelConfig(task);
    const result = await openrouterChatWithRetry(prompt, config, 1);
    if (result) return result;
  } else if (preferred === 'gemini' && hasGemini()) {
    const result = await geminiChat(prompt);
    if (result) return result;
  }

  // Fallback to other providers
  const availableProviders = [];
  if (preferred !== 'claude' && hasClaudeKey()) availableProviders.push('claude');
  if (preferred !== 'openrouter' && hasOpenRouterKey()) availableProviders.push('openrouter');
  if (preferred !== 'gemini' && hasGemini()) availableProviders.push('gemini');

  for (const provider of availableProviders) {
    console.log(`     Falling back to ${provider}...`);
    if (provider === 'claude') {
      const result = await claudeChatWithRetry(prompt, getClaudeModelConfig(task), 1);
      if (result) return result;
    } else if (provider === 'openrouter') {
      const result = await openrouterChatWithRetry(prompt, getOpenRouterModelConfig(task), 1);
      if (result) return result;
    } else if (provider === 'gemini') {
      const result = await geminiChat(prompt);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Send a prompt with automatic retries across providers.
 *
 * Retries up to maxRetries times on the preferred provider, then
 * falls back to the other provider once, then gives up.
 *
 * @param prompt - The prompt text
 * @param task - Task identifier for model routing
 * @param maxRetries - Number of retries on primary provider (default: 3)
 * @returns Response text or null
 */
export async function aiChatWithRetry(
  prompt: string,
  task = 'content-audit',
  maxRetries = 3
): Promise<string | null> {
  if (!checkBudget(task)) return null;
  const preferred = getPreferredProvider();

  // Try preferred provider with retries
  if (preferred === 'claude' && hasClaudeKey()) {
    const config = getClaudeModelConfig(task);
    const result = await claudeChatWithRetry(prompt, config, maxRetries);
    if (result) return result;
  } else if (preferred === 'openrouter' && hasOpenRouterKey()) {
    const config = getOpenRouterModelConfig(task);
    const result = await openrouterChatWithRetry(prompt, config, maxRetries);
    if (result) return result;
  } else if (preferred === 'gemini' && hasGemini()) {
    const result = await geminiChatWithRetry(prompt, maxRetries);
    if (result) return result;
  }

  // Fallback to other providers (no retries — we already retried above)
  const availableProviders = [];
  if (preferred !== 'claude' && hasClaudeKey()) availableProviders.push('claude');
  if (preferred !== 'openrouter' && hasOpenRouterKey()) availableProviders.push('openrouter');
  if (preferred !== 'gemini' && hasGemini()) availableProviders.push('gemini');

  for (const provider of availableProviders) {
    console.log(`     ${preferred} failed, falling back to ${provider}...`);
    if (provider === 'claude') {
      const result = await claudeChatWithRetry(prompt, getClaudeModelConfig(task), 1);
      if (result) return result;
    } else if (provider === 'openrouter') {
      const result = await openrouterChatWithRetry(prompt, getOpenRouterModelConfig(task), 1);
      if (result) return result;
    } else if (provider === 'gemini') {
      const result = await geminiChat(prompt);
      if (result) return result;
    }
  }

  return null;
}
