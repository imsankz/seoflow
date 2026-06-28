/**
 * Unified AI provider — abstracts Gemini and OpenRouter behind one API.
 *
 * Usage:
 *   import { aiChat, aiChatWithRetry } from '../lib/ai-provider';
 *   const response = await aiChatWithRetry(prompt, 'content-audit');
 *
 * Provider selection (first available wins):
 *   1. AI_PROVIDER=openrouter → OpenRouter (requires OPENROUTER_API_KEY)
 *   2. AI_PROVIDER=gemini (or unset) → Gemini 2.5 Flash (requires GEMINI_API_KEY)
 *   3. If preferred provider fails, falls back to the other
 *
 * Task-specific model routing:
 *   content-audit: Gemini 2.5 Flash (free, large context) or matching OpenRouter model
 *   seo-review:    Claude 3.5 Haiku via OpenRouter (cheap, structured) or Gemini
 *   fact-check:    Claude 3.5 Haiku via OpenRouter or Gemini
 */
import { geminiChat, geminiChatWithRetry } from './gemini-client';
import { openrouterChatWithRetry, getModelConfig, hasOpenRouterKey } from './openrouter-client';

type ProviderName = 'gemini' | 'openrouter';

function getPreferredProvider(): ProviderName {
  const env = process.env.AI_PROVIDER?.toLowerCase().trim();
  if (env === 'openrouter' && hasOpenRouterKey()) return 'openrouter';
  return 'gemini';
}

const hasGemini = (): boolean => !!process.env.GEMINI_API_KEY;

/**
 * Log available AI providers and current config.
 */
export function logAiStatus(): void {
  if (hasGemini()) console.log('   Gemini AI: connected (gemini-2.5-flash)');
  else console.log('   ⚠️  GEMINI_API_KEY not set — Gemini disabled');

  if (hasOpenRouterKey()) {
    console.log(`   OpenRouter: connected (300+ models available)`);
  } else {
    console.log('   ⚠️  OPENROUTER_API_KEY not set — OpenRouter disabled');
  }

  const preferred = getPreferredProvider();
  if (preferred === 'openrouter') console.log(`   → Primary provider: OpenRouter (set AI_PROVIDER=openrouter)`);
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
  const preferred = getPreferredProvider();

  // Try preferred provider
  if (preferred === 'openrouter' && hasOpenRouterKey()) {
    const config = getModelConfig(task);
    const result = await openrouterChatWithRetry(prompt, config, 1);
    if (result) return result;
  } else if (preferred === 'gemini' && hasGemini()) {
    const result = await geminiChat(prompt);
    if (result) return result;
  }

  // Fallback to the other provider
  if (preferred === 'openrouter' && hasGemini()) {
    console.log('     Falling back to Gemini...');
    return geminiChat(prompt);
  } else if (preferred === 'gemini' && hasOpenRouterKey()) {
    console.log('     Falling back to OpenRouter...');
    const config = getModelConfig(task);
    return openrouterChatWithRetry(prompt, config, 1);
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
  const preferred = getPreferredProvider();

  // Try preferred provider with retries
  if (preferred === 'openrouter' && hasOpenRouterKey()) {
    const config = getModelConfig(task);
    const result = await openrouterChatWithRetry(prompt, config, maxRetries);
    if (result) return result;
  } else if (preferred === 'gemini' && hasGemini()) {
    const result = await geminiChatWithRetry(prompt, maxRetries);
    if (result) return result;
  }

  // Fallback to the other provider (no retries — we already retried above)
  if (preferred === 'openrouter' && hasGemini()) {
    console.log('     OpenRouter failed, falling back to Gemini...');
    return geminiChat(prompt);
  } else if (preferred === 'gemini' && hasOpenRouterKey()) {
    console.log('     Gemini failed, falling back to OpenRouter...');
    const config = getModelConfig(task);
    return openrouterChatWithRetry(prompt, config, 1);
  }

  return null;
}
