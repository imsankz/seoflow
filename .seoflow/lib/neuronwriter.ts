/**
 * Shared NeuronWriter API client.
 *
 * Used by the SEO audit pipeline, the admin post-generator route,
 * and tools-seo-optimizer. Import this instead of duplicating the logic.
 */
import https from 'https';
import type { NeuronData } from './types';

const NEURON_BASE = 'https://app.neuronwriter.com/neuron-api/0.5/writer';

function neuronKey(): string | null {
  return process.env.NEURONWRITER_API_KEY || process.env.NEURONWRITE_API_KEY || null;
}

function neuronProjectId(): string {
  return process.env.NEURONWRITE_PROJECT_ID || process.env.NEURONWRITER_PROJECT_ID || '';
}

async function neuronPost(method: string, payload: any): Promise<any> {
  const apiKey = neuronKey();
  if (!apiKey) return null;
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      `${NEURON_BASE}/${method}`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function pickStrings(list: any[], limit = 15): string[] {
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(
      list
        .map((x) => {
          if (typeof x === 'string') return x.trim();
          if (x?.q) return String(x.q).trim();
          if (x?.t) return String(x.t).trim();
          return '';
        })
        .filter(Boolean)
    ),
  ].slice(0, limit);
}

/**
 * Fetch NeuronWriter data for a keyword.
 *
 * Flow: list-queries → new-query (if not found) → poll get-query (up to 2 min).
 * Returns a NeuronData object with missing terms, target word count, suggested H2s, etc.
 */
export async function fetchNeuronData(keyword: string): Promise<NeuronData> {
  if (!neuronKey()) {
    return {
      queryId: null,
      targetWordCount: null,
      missingTerms: [],
      h2Terms: [],
      peopleAlsoAsk: [],
      contentQuestions: [],
      notes: 'NeuronWriter API key not set',
    };
  }
  const project = neuronProjectId();

  // 1. Find existing ready query
  const listResp = await neuronPost('list-queries', { project, keyword, status: 'ready' });
  const list = Array.isArray(listResp) ? listResp : [];
  let queryId = list.find((q: any) => q.keyword?.toLowerCase() === keyword.toLowerCase())?.query || '';

  // 2. Create new query if not found
  if (!queryId) {
    const created = await neuronPost('new-query', {
      project,
      keyword,
      engine: 'google.co.uk',
      language: 'English',
    });
    if (!created?.query) {
      return {
        queryId: null,
        targetWordCount: null,
        missingTerms: [],
        h2Terms: [],
        peopleAlsoAsk: [],
        contentQuestions: [],
        notes: `NW: could not create query for "${keyword}" (check NEURONWRITE_PROJECT_ID and API credits)`,
      };
    }
    queryId = created.query;
  }

  // 3. Poll until ready (max 2 min)
  const start = Date.now();
  let data = null;
  while (Date.now() - start < 120000) {
    data = await neuronPost('get-query', { query: queryId });
    if (data?.status === 'ready') break;
    if (data?.status === 'not found') {
      return {
        queryId,
        targetWordCount: null,
        missingTerms: [],
        h2Terms: [],
        peopleAlsoAsk: [],
        contentQuestions: [],
        notes: 'NW: query not found',
      };
    }
    await new Promise((r) => setTimeout(r, 6000));
  }

  if (!data || data.status !== 'ready') {
    return {
      queryId,
      targetWordCount: null,
      missingTerms: [],
      h2Terms: [],
      peopleAlsoAsk: [],
      contentQuestions: [],
      notes: 'NW: query not ready in time',
    };
  }

  return {
    queryId,
    targetWordCount: Number(data?.metrics?.word_count?.target || 0) || null,
    missingTerms: pickStrings(
      data?.terms_txt?.content_basic_w_ranges?.split('\n') || data?.terms_txt?.content_basic?.split('\n') || []
    ),
    h2Terms: pickStrings(data?.terms?.h2 || data?.terms_txt?.h2?.split('\n') || []),
    peopleAlsoAsk: pickStrings(data?.ideas?.people_also_ask || []),
    contentQuestions: pickStrings(data?.ideas?.content_questions || []),
    notes: null,
  };
}

/**
 * Check if the NeuronWriter API key is configured.
 */
export function hasNeuronKey(): boolean {
  return !!neuronKey();
}

/**
 * Get the configured NeuronWriter project ID (for logging / display).
 */
export function getNeuronProjectId(): string {
  const pid = neuronProjectId();
  return pid || 'default';
}
