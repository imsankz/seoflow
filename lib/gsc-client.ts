/**
 * SeoFlow — Google Search Console API client (live data)
 *
 * Uses Google Application Default Credentials (ADC) — the same mechanism
 * as the project's existing scripts/gsc.js.
 *
 * One-time setup per machine:
 *   gcloud auth application-default login \
 *     --scopes=https://www.googleapis.com/auth/webmasters.readonly
 *
 * No service account or OAuth client JSON required — ADC handles auth
 * automatically from the gcloud credential cache.
 *
 * Config:
 *   seoflow.config.json → "siteUrl" is used as the GSC property URL.
 *   Set GSC_SITE_URL in env to override (useful for sc-domain: properties).
 *
 * Falls back to CSV gracefully if ADC is not available.
 */

import https from 'https';
import type { GSCPageData, GSCQueryData } from './types';
import { loadConfig } from './config';

// ─── Cache ────────────────────────────────────────────────────────────────────
// In-memory cache for the current process — avoids hitting the API twice
// per pipeline run (once for pages, once for queries).
let _pagesCache: Record<string, GSCPageData> | null = null;
let _queriesCache: Record<string, GSCQueryData> | null = null;
let _available: boolean | null = null;

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<{ token: string; projectId?: string } | null> {
  try {
    // Dynamic import so the pipeline doesn't break if googleapis isn't installed
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const client = await auth.getClient();
    const tokenResponse = await (client as any).getAccessToken();
    const token = tokenResponse?.token ?? tokenResponse?.access_token;
    if (!token) return null;

    // Get the quota project ID (needed for ADC user credentials)
    let projectId: string | undefined;
    try {
      projectId = (await auth.getProjectId()) ?? undefined;
    } catch {
      // optional — the API call may still work without it on some setups
    }

    return { token, projectId };
  } catch {
    return null;
  }
}

// ─── GSC API call ─────────────────────────────────────────────────────────────

function gscPost(path: string, body: object, token: string, quotaProject?: string): Promise<any> {
  const BASE = 'searchconsole.googleapis.com';
  const API = '/webmasters/v3';
  const payload = JSON.stringify(body);

  const headers: Record<string, string | number> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  };

  // The ADC user credential flow requires a quota project for billing attribution.
  // Without it, the API returns a 403 "requires a quota project" error.
  if (quotaProject) {
    headers['x-goog-user-project'] = quotaProject;
  }

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: BASE,
        path: API + path,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
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
    req.setTimeout(20000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ─── Site URL resolution ──────────────────────────────────────────────────────

function getSiteProperty(): string {
  // Allow env override for sc-domain: properties
  const envOverride = process.env.GSC_SITE_URL;
  if (envOverride) return envOverride.endsWith('/') ? envOverride : envOverride + '/';
  const cfg = loadConfig();
  const url = cfg.siteUrl.startsWith('http') ? cfg.siteUrl : `https://${cfg.siteUrl}`;
  return url.endsWith('/') ? url : url + '/';
}

// ─── Slug extraction ──────────────────────────────────────────────────────────

function urlToSlug(url: string): string {
  const cfg = loadConfig();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const blogPrefix = cfg.blogPrefix || '/blog/';
  return path.replace(new RegExp(`^${blogPrefix}`), '').replace(/\/$/, '');
}

// ─── Main fetch functions ─────────────────────────────────────────────────────

/**
 * Check if the GSC API is available (ADC configured + googleapis installed).
 * Caches the result for the current process.
 */
export async function isGscApiAvailable(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    const result = await getAccessToken();
    _available = !!result?.token;
  } catch {
    _available = false;
  }
  return _available;
}

/**
 * Fetch page-level GSC data (clicks, impressions, CTR, position) for all pages.
 *
 * @param days  Number of days to look back (default: 28, GSC has ~3-day lag)
 * @param rows  Max rows to fetch (default: 2000)
 */
export async function fetchGscPages(
  days = 28,
  rows = 2000
): Promise<Record<string, GSCPageData>> {
  if (_pagesCache) return _pagesCache;

  const auth = await getAccessToken();
  if (!auth) return {};

  const siteProperty = getSiteProperty();
  const siteEncoded = encodeURIComponent(siteProperty);

  const body = {
    startDate: dateStr(days + 3),
    endDate: dateStr(3),
    dimensions: ['page'],
    rowLimit: rows,
    startRow: 0,
  };

  const res = await gscPost(`/sites/${siteEncoded}/searchAnalytics/query`, body, auth.token, auth.projectId);
  if (!res || res.error) {
    if (res?.error) console.error(`     GSC API error: ${res.error.message}`);
    return {};
  }

  const map: Record<string, GSCPageData> = {};
  for (const row of res.rows || []) {
    const url = row.keys[0];
    const slug = urlToSlug(url);
    map[slug] = {
      url,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: (row.ctr || 0) * 100,          // GSC returns 0–1, we store 0–100
      position: row.position || 99,
    };
  }

  _pagesCache = map;
  return map;
}

/**
 * Fetch query-level GSC data (clicks, impressions per search query).
 *
 * @param days  Number of days to look back (default: 28)
 * @param rows  Max rows to fetch (default: 2000)
 */
export async function fetchGscQueries(
  days = 28,
  rows = 2000
): Promise<Record<string, GSCQueryData>> {
  if (_queriesCache) return _queriesCache;

  const auth = await getAccessToken();
  if (!auth) return {};

  const siteProperty = getSiteProperty();
  const siteEncoded = encodeURIComponent(siteProperty);

  const body = {
    startDate: dateStr(days + 3),
    endDate: dateStr(3),
    dimensions: ['query'],
    rowLimit: rows,
    startRow: 0,
  };

  const res = await gscPost(`/sites/${siteEncoded}/searchAnalytics/query`, body, auth.token, auth.projectId);
  if (!res || res.error) {
    if (res?.error) console.error(`     GSC API error: ${res.error.message}`);
    return {};
  }

  const map: Record<string, GSCQueryData> = {};
  for (const row of res.rows || []) {
    const query = row.keys[0];
    map[query] = {
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
    };
  }

  _queriesCache = map;
  return map;
}

/**
 * Fetch pages that are in "striking distance" (positions 5–20).
 * Useful for prioritization without running the full pipeline.
 */
export async function fetchStrikingDistancePages(
  days = 28,
  rows = 500
): Promise<Array<GSCPageData & { slug: string }>> {
  const pages = await fetchGscPages(days, rows);
  return Object.entries(pages)
    .filter(([, d]) => d.position >= 5 && d.position <= 20 && d.impressions > 200)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .map(([slug, d]) => ({ slug, ...d }));
}

/**
 * Fetch low-CTR pages (high impressions, low clicks).
 * These are title/meta optimization candidates.
 */
export async function fetchLowCtrPages(
  days = 28,
  rows = 500,
  minImpressions = 500,
  maxCtr = 3
): Promise<Array<GSCPageData & { slug: string }>> {
  const pages = await fetchGscPages(days, rows);
  return Object.entries(pages)
    .filter(([, d]) => d.impressions >= minImpressions && d.ctr < maxCtr)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .map(([slug, d]) => ({ slug, ...d }));
}

/**
 * Clear the in-memory cache (useful for tests or multi-run scenarios).
 */
export function clearGscCache(): void {
  _pagesCache = null;
  _queriesCache = null;
  _available = null;
}
