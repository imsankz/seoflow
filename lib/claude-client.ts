/**
 * Anthropic Claude AI client — direct API access to Claude models.
 *
 * Requires ANTHROPIC_API_KEY in env. Falls back gracefully if not set.
 *
 * Endpoint: https://api.anthropic.com/v1/messages
 * Docs: https://docs.anthropic.com/en/api/messages
 */
import { getSiteUrl, loadConfig } from './config';

const BASE_URL = 'https://api.anthropic.com/v1/messages';

export type ClaudeModel =
  | 'claude-3-5-haiku-20241022'    // Fast, cheap, good for SEO review
  | 'claude-3-5-sonnet-20241022'    // Best quality for complex tasks
  | 'claude-3-opus-20240229'        // Most capable, but expensive
  | 'claude-3-sonnet-20240229'      // Balanced
  | 'claude-3-haiku-20240307';      // Fastest

export interface ClaudeConfig {
  model: ClaudeModel;
  temperature?: number;
  maxTokens?: number;
  label?: string;
}

const DEFAULT_CONFIGS: Record<string, ClaudeConfig> = {
  'seo-review': {
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.3,
    maxTokens: 2048,
    label: 'Claude 3.5 Haiku',
  },
  'content-audit': {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.5,
    maxTokens: 8192,
    label: 'Claude 3.5 Sonnet',
  },
  'fact-check': {
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.2,
    maxTokens: 1024,
    label: 'Claude 3.5 Haiku',
  },
};

let _apiKey: string | null = null;

function getApiKey(): string | null {
  if (_apiKey !== null) return _apiKey;
  _apiKey = process.env.ANTHROPIC_API_KEY || null;
  return _apiKey;
}

/**
 * Check if Anthropic API key is configured.
 */
export function hasClaudeKey(): boolean {
  return !!getApiKey();
}

/**
 * Get the model config for a specific task.
 */
export function getModelConfig(task: string): ClaudeConfig {
  return DEFAULT_CONFIGS[task] || DEFAULT_CONFIGS['content-audit'];
}

/**
 * Send a message to Anthropic Claude.
 * Returns the response text or null on failure.
 */
export async function claudeChat(
  prompt: string,
  config?: Partial<ClaudeConfig>
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const taskConfig: ClaudeConfig = {
    ...DEFAULT_CONFIGS['content-audit'],
    ...config,
  };

  try {
    let siteName = '';
    let siteUrl = '';
    try { siteName = loadConfig().siteName; siteUrl = getSiteUrl(); } catch { /* config not loaded */ }
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-metadata': JSON.stringify({
          'user-agent': siteName ? `${siteName} SeoFlow` : 'SeoFlow',
          'origin': siteUrl ? `https://${siteUrl}` : 'https://seoflow',
        }),
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
      console.error(`     Claude HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`     Claude error: ${msg}`);
    return null;
  }
}

/**
 * Send a message with automatic retries (up to 3, 10s backoff).
 */
export async function claudeChatWithRetry(
  prompt: string,
  config?: Partial<ClaudeConfig>,
  maxRetries = 3
): Promise<string | null> {
  const label = config?.label || getModelConfig('content-audit').label;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`     🤖 ${label}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ''}...`);
    const result = await claudeChat(prompt, config);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 10000;
      console.log(`     Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}
