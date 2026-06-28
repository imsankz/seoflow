/**
 * Load environment variables from .env.local
 */
import fs from 'fs';
import path from 'path';

function findRoot(): string {
  let dir = path.resolve(__dirname);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'seoflow.config.json'))) return dir;
    if (fs.existsSync(path.join(dir, '.env.local'))) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return path.resolve(__dirname, '..', '..');
}

const ROOT = findRoot();
const ENV_FILE = path.join(ROOT, '.env.local');

export function loadEnv(): void {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const eq = l.indexOf('=');
    if (eq === -1) continue;
    const key = l.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = l.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}
