/**
 * Parse Google Search Console CSV exports.
 */
import fs from 'fs';
import type { GSCPageData, GSCQueryData } from './types';
import { loadConfig } from './config';

export function parseGscPages(): { [slug: string]: GSCPageData } {
  const map: { [slug: string]: GSCPageData } = {};
  const p = loadConfig().gscPagesCsv;
  if (!fs.existsSync(p)) return map;
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const url = parts[0].trim().replace(/^https?:\/\/[^/]+/, '');
    const slug = url.replace(/^\/blog\//, '').replace(/\/$/, '');
    map[slug] = {
      url, clicks: parseInt(parts[1]) || 0, impressions: parseInt(parts[2]) || 0,
      ctr: parseFloat(parts[3]) || 0, position: parseFloat(parts[4]) || 99,
    };
  }
  return map;
}

export function parseGscQueries(): { [query: string]: GSCQueryData } {
  const map: { [query: string]: GSCQueryData } = {};
  const p = loadConfig().gscQueriesCsv;
  if (!fs.existsSync(p)) return map;
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    map[parts[0].trim()] = { clicks: parseInt(parts[1]) || 0, impressions: parseInt(parts[2]) || 0 };
  }
  return map;
}
