/**
 * SeoFlow — GSC data loader
 *
 * Source priority:
 *   1. Google Search Console API via Application Default Credentials (live)
 *   2. CSV exports in gsc_data/ (fallback if ADC not configured)
 *
 * ADC setup (one-time per machine):
 *   gcloud auth application-default login \
 *     --scopes=https://www.googleapis.com/auth/webmasters.readonly
 *
 * The active source is printed at pipeline startup.
 */

import fs from 'fs';
import type { GSCPageData, GSCQueryData } from './types';
import { loadConfig } from './config';
import { fetchGscPages, fetchGscQueries, isGscApiAvailable } from './gsc-client';

// ─── Source detection ─────────────────────────────────────────────────────────

let _sourceChecked = false;
let _usingApi = false;

export async function detectGscSource(): Promise<'api' | 'csv'> {
  if (_sourceChecked) return _usingApi ? 'api' : 'csv';
  _usingApi = await isGscApiAvailable();
  _sourceChecked = true;
  return _usingApi ? 'api' : 'csv';
}

export function gscSourceLabel(): string {
  if (!_sourceChecked) return 'unknown (not checked yet)';
  return _usingApi ? 'Google Search Console API (live)' : 'CSV export (gsc_data/)';
}

// ─── CSV column normalisation ─────────────────────────────────────────────────
// GSC exports column names in the UI language (German by default on this site).
// We detect by header content so any language works.

interface CsvColumnMap {
  url: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function detectColumns(header: string): CsvColumnMap | null {
  const cols = header.split(',').map((c) => c.trim().toLowerCase().replace(/"/g, ''));

  // English column names
  const englishMap: Record<string, string[]> = {
    url: ['top pages', 'page', 'url', 'landing page', 'top urls'],
    clicks: ['clicks'],
    impressions: ['impressions'],
    ctr: ['ctr'],
    position: ['position', 'average position'],
  };

  // German column names (GSC German UI)
  const germanMap: Record<string, string[]> = {
    url: ['häufigste seiten', 'häufigsten seiten', 'seite', 'url', 'landingpage'],
    clicks: ['klicks'],
    impressions: ['impressionen'],
    ctr: ['ctr'],
    position: ['position', 'durchschnittliche position'],
  };

  function findCol(maps: Record<string, string[]>[], key: string): number {
    for (const map of maps) {
      for (const alias of map[key] || []) {
        const idx = cols.findIndex((c) => c.startsWith(alias));
        if (idx !== -1) return idx;
      }
    }
    return -1;
  }

  const urlIdx = findCol([englishMap, germanMap], 'url');
  const clicksIdx = findCol([englishMap, germanMap], 'clicks');
  const impressionsIdx = findCol([englishMap, germanMap], 'impressions');
  const ctrIdx = findCol([englishMap, germanMap], 'ctr');
  const positionIdx = findCol([englishMap, germanMap], 'position');

  // url is required; everything else can fall back to positional
  if (urlIdx === -1) return null;

  return {
    url: urlIdx,
    clicks: clicksIdx !== -1 ? clicksIdx : 1,
    impressions: impressionsIdx !== -1 ? impressionsIdx : 2,
    ctr: ctrIdx !== -1 ? ctrIdx : 3,
    position: positionIdx !== -1 ? positionIdx : 4,
  };
}

function parseCtrValue(raw: string): number {
  // Handles "11.64%" or "0.1164" (both appear in different GSC exports)
  const s = raw.trim().replace('%', '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  // If the value is between 0 and 1 and has no %, it's a fraction → convert to %
  return n <= 1 && !raw.includes('%') ? n * 100 : n;
}

// ─── CSV loaders ──────────────────────────────────────────────────────────────

export function parseGscPagesFromCsv(): Record<string, GSCPageData> {
  const map: Record<string, GSCPageData> = {};
  const cfg = loadConfig();
  const p = cfg.gscPagesCsv;
  if (!fs.existsSync(p)) return map;

  const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
  if (lines.length < 2) return map;

  const cols = detectColumns(lines[0]);
  if (!cols) {
    console.error(`     ⚠️  GSC CSV: could not detect columns in ${p}`);
    return map;
  }

  const blogPrefix = cfg.blogPrefix || '/blog/';

  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const url = parts[cols.url].trim().replace(/"/g, '');
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const slug = path.replace(new RegExp(`^${blogPrefix}`), '').replace(/\/$/, '');
    map[slug] = {
      url,
      clicks: parseInt(parts[cols.clicks]) || 0,
      impressions: parseInt(parts[cols.impressions]) || 0,
      ctr: parseCtrValue(parts[cols.ctr] || '0'),
      position: parseFloat(parts[cols.position]) || 99,
    };
  }
  return map;
}

export function parseGscQueriesFromCsv(): Record<string, GSCQueryData> {
  const map: Record<string, GSCQueryData> = {};
  const p = loadConfig().gscQueriesCsv;
  if (!fs.existsSync(p)) return map;

  const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
  if (lines.length < 2) return map;

  // Queries CSV: query, clicks, impressions[, ctr, position]
  // First column is always the query string regardless of language
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const query = parts[0].trim().replace(/"/g, '');
    map[query] = {
      clicks: parseInt(parts[1]) || 0,
      impressions: parseInt(parts[2]) || 0,
    };
  }
  return map;
}

// ─── Public API (smart source-selector) ───────────────────────────────────────

/**
 * Load GSC page data from the best available source.
 *
 * Tries the live API first (requires `gcloud auth application-default login`),
 * falls back to CSV exports in gsc_data/ if ADC is unavailable.
 */
export async function parseGscPages(
  days = 28
): Promise<Record<string, GSCPageData>> {
  const source = await detectGscSource();

  if (source === 'api') {
    const data = await fetchGscPages(days);
    if (Object.keys(data).length > 0) return data;
    // API returned empty — fall back to CSV
    console.log('     ⚠️  GSC API returned no data, falling back to CSV');
  }

  return parseGscPagesFromCsv();
}

/**
 * Load GSC query data from the best available source.
 */
export async function parseGscQueries(
  days = 28
): Promise<Record<string, GSCQueryData>> {
  const source = await detectGscSource();

  if (source === 'api') {
    const data = await fetchGscQueries(days);
    if (Object.keys(data).length > 0) return data;
    console.log('     ⚠️  GSC API returned no data, falling back to CSV');
  }

  return parseGscQueriesFromCsv();
}

/**
 * Synchronous versions — CSV only.
 * Used by scripts that can't await (legacy compatibility).
 */
export { parseGscPagesFromCsv as parseGscPagesCsv };
export { parseGscQueriesFromCsv as parseGscQueriesCsv };
