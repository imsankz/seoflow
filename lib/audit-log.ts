/**
 * Audit log persistence for the SEO pipeline.
 */
import fs from 'fs';
import type { AuditLog, AuditLogEntry } from './types';
import { getAuditLogPath } from './config';

export function loadAuditLog(): AuditLog {
  const p = getAuditLogPath();
  if (!fs.existsSync(p)) {
    return { version: '1.0', last_run: null, posts: { _template: {} as any } };
  }
  try {
    const log = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!log || typeof log !== 'object' || Array.isArray(log)) {
      return { version: '1.0', last_run: null, posts: { _template: {} as any } };
    }
    if (!log.posts || typeof log.posts !== 'object') {
      log.posts = { _template: {} as any };
    }
    return log;
  } catch {
    return { version: '1.0', last_run: null, posts: { _template: {} as any } };
  }
}

export function saveAuditLog(log: AuditLog, dryRun = false): void {
  if (!dryRun) {
    fs.writeFileSync(getAuditLogPath(), JSON.stringify(log, null, 2));
  }
}

export function isAlreadyDone(log: AuditLog, slug: string): boolean {
  if (!log || !log.posts) return false;
  const entry = log.posts[slug];
  if (!entry || entry.status !== 'completed') return false;
  if (!entry.next_review) return false;
  return new Date(entry.next_review) > new Date();
}

export function logEntry(log: AuditLog, slug: string, data: Partial<AuditLogEntry>): void {
  if (!log.posts) log.posts = {};
  log.posts[slug] = {
    ...(log.posts[slug] || ({} as AuditLogEntry)),
    ...data,
    audit_date: new Date().toISOString().split('T')[0],
    auditor: 'seoflow-agent',
  };
  log.last_run = new Date().toISOString();
}
