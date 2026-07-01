/**
 * OpenRouter AI client — access Claude, GPT, Llama, and 300+ models
 * through a single OpenAI-compatible API.
 *
 * Requires OPENROUTER_API_KEY in env. Falls back gracefully if not set.
 *
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 * Docs: https://openrouter.ai/docs
 */
import { getSiteUrl, loadConfig } from './config';

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type OpenRouterModel =
  | 'anthropic/claude-3.5-haiku'      // Fast, cheap, good for SEO review
  | 'anthropic/claude-3.5-sonnet'      // Best quality for complex tasks
  | 'google/gemini-2.0-flash-001'      // Free tier fallback
  | 'google/gemini-2.5-flash-001'      // Current Gemini model
  | 'meta-llama/llama-3.3-70b-instruct' // Good open-source alternative
  | 'openai/gpt-4o-mini'               // Cheap OpenAI fallback
  | 'mistralai/mistral-small-3.1-24b-instruct' // Fast, capable
  | 'qwen/qwen-2.5-72b-instruct';      // Strong open model

export interface OpenRouterConfig {
  model: OpenRouterModel;
  temperature?: number;
  maxTokens?: number;
  label?: string;
}

const DEFAULT_CONFIGS: Record<string, OpenRouterConfig> = {
  'seo-review': {
    model: 'anthropic/claude-3.5-haiku',
    temperature: 0.3,
    maxTokens: 2048,
    label: 'Claude 3.5 Haiku',
  },
  'content-audit': {
    model: 'google/gemini-2.5-flash-001',
    temperature: 0.5,
    maxTokens: 8192,
    label: 'Gemini 2.5 Flash',
  },
  'fact-check': {
    model: 'anthropic/claude-3.5-haiku',
    temperature: 0.2,
    maxTokens: 1024,
    label: 'Claude 3.5 Haiku',
  },
};

let _apiKey: string | null = null;

function getApiKey(): string | null {
  if (_apiKey !== null) return _apiKey;
  _apiKey = process.env.OPENROUTER_API_KEY || null;
  return _apiKey;
}

/**
 * Check if OpenRouter API key is configured.
 */
export function hasOpenRouterKey(): boolean {
  return !!getApiKey();
}

/**
 * Get the model config for a specific task.
 */
export function getModelConfig(task: string): OpenRouterConfig {
  return DEFAULT_CONFIGS[task] || DEFAULT_CONFIGS['content-audit'];
}

/**
 * Send a chat completion prompt to OpenRouter.
 * Returns the response text or null on failure.
 */
export async function openrouterChat(
  prompt: string,
  config?: Partial<OpenRouterConfig>
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const taskConfig: OpenRouterConfig = {
    ...DEFAULT_CONFIGS['content-audit'],
    ...config,
  };

  try {
    let siteUrl = '';
    let siteName = '';
    try { siteUrl = getSiteUrl(); siteName = loadConfig().siteName; } catch { /* config not loaded */ }
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl ? `https://${siteUrl}` : 'https://seoflow',
        'X-Title': siteName ? `${siteName} SeoFlow` : 'SeoFlow',
      },
      body: JSON.stringify({
        model: taskConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: taskConfig.temperature ?? 0.5,
        max_tokens: taskConfig.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`     OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`     OpenRouter error: ${msg}`);
    return null;
  }
}

/**
 * Send a chat prompt with automatic retries (up to 3, 10s backoff).
 */
export async function openrouterChatWithRetry(
  prompt: string,
  config?: Partial<OpenRouterConfig>,
  maxRetries = 3
): Promise<string | null> {
  const label = config?.label || getModelConfig('content-audit').label;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`     🤖 ${label}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ''}...`);
    const result = await openrouterChat(prompt, config);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 10000;
      console.log(`     Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}
