#!/usr/bin/env node
/**
 * SeoFlow — SEO Pipeline Orchestrator
 *
 * Usage:
 *   npx tsx scripts/agents/seo-audit-agent.ts                    # Process top 10
 *   npx tsx scripts/agents/seo-audit-agent.ts --mode review      # Claude SEO review
 *   npx tsx scripts/agents/seo-audit-agent.ts --mode factcheck   # Fact check
 *   npx tsx scripts/agents/seo-audit-agent.ts --mode content     # NeuronWriter + Gemini
 *   npx tsx scripts/agents/seo-audit-agent.ts --slug <slug>      # One post, all steps
 *   npx tsx scripts/agents/seo-audit-agent.ts --dry-run          # Preview only
 *   npx tsx scripts/agents/seo-audit-agent.ts --limit 5          # Process N posts
 *
 * Modes: meta, links, images, keywords, neuron, content, review, factcheck, all
 */

import fs from 'fs';
import path from 'path';
import { loadEnv } from './lib/env-loader';
import { loadConfig, getPostsDir, getAuditLogPath, getSiteUrl } from './lib/config';
import { parseGscPages, parseGscQueries } from './lib/gsc-parser';
import { loadAuditLog, saveAuditLog, isAlreadyDone } from './lib/audit-log';
import { scorePriority } from './lib/mdx-parser';
import { logAiStatus } from './lib/ai-provider';
import { hasNeuronKey, getNeuronProjectId } from './lib/neuronwriter';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) || 10 : 10; })();
const SLUG_FILTER = (() => { const i = args.indexOf('--slug'); return i !== -1 ? args[i + 1] : null; })();
const RESET_SLUG = (() => { const i = args.indexOf('--reset-slug'); return i !== -1 ? args[i + 1] : null; })();
const MODE = (() => { const i = args.indexOf('--mode'); return i !== -1 ? args[i + 1] : 'all'; })();

async function main(): Promise<void> {
  loadEnv();
  const cfg = loadConfig();

  console.log(`\n🔍 ${cfg.siteName} — SeoFlow Pipeline`);
  console.log(`   Mode: ${MODE} | Limit: ${SLUG_FILTER ? 1 : LIMIT} | Dry run: ${DRY_RUN}\n`);

  const auditLog = loadAuditLog();
  const gscPages = parseGscPages();
  const gscQueries = parseGscQueries();
  const postsDir = getPostsDir();
  const auditLogPath = getAuditLogPath();

  console.log(`📊 GSC data: ${Object.keys(gscPages).length} pages, ${Object.keys(gscQueries).length} queries`);

  if (RESET_SLUG) {
    if (auditLog.posts[RESET_SLUG]) {
      auditLog.posts[RESET_SLUG].status = 'pending';
      auditLog.posts[RESET_SLUG].next_review = null;
      saveAuditLog(auditLog, DRY_RUN);
      console.log(`✅ Reset ${RESET_SLUG}`);
    } else {
      console.log(`⚠️  "${RESET_SLUG}" not found in audit log`);
    }
    return;
  }

  if (hasNeuronKey()) console.log(`📡 NeuronWriter: ${getNeuronProjectId()}`);
  else console.log('⚠️  NEURONWRITER_API_KEY not set');
  logAiStatus();

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
  console.log(`📁 ${files.length} posts\n`);

  let candidates = files.map(f => ({
    slug: f.replace('.mdx', ''),
    filePath: path.join(postsDir, f),
    priority: scorePriority(f.replace('.mdx', ''), gscPages),
    gsc: gscPages[f.replace('.mdx', '')] || {},
  }));

  if (SLUG_FILTER) {
    candidates = candidates.filter(c => c.slug === SLUG_FILTER);
    if (!candidates.length) { console.error(`❌ No post: ${SLUG_FILTER}`); process.exit(1); }
  } else {
    candidates = candidates
      .filter(c => MODE === 'review' || MODE === 'factcheck' || !isAlreadyDone(auditLog, c.slug))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, LIMIT);
  }

  console.log(`🎯 ${candidates.length} posts\n${'─'.repeat(60)}`);

  const results: any[] = [];
  const { processPost } = await import('./pipeline/steps');
  for (const c of candidates) {
    const r = await processPost(c.slug, c.filePath, gscPages, auditLog, { mode: MODE, skipAlreadyDone: !SLUG_FILTER && MODE === 'all', dryRun: DRY_RUN });
    results.push(r);
    saveAuditLog(auditLog, DRY_RUN);
  }

  const total = results.reduce((s: number, r: any) => s + r.changes, 0);
  const improved = results.filter((r: any) => r.changes > 0);
  const completed = Object.values(auditLog.posts).filter(e => e.status === 'completed').length;
  console.log(`\n${'═'.repeat(60)}\n📋 SUMMARY\n${'═'.repeat(60)}`);
  console.log(`  Processed: ${results.length} | Improved: ${improved.length} | Changes: ${total}`);
  console.log(`  Pending: ${files.length - completed}`);

  const flagged = Object.entries(auditLog.posts).filter(([, v]) => v.flagged_for_manual);
  if (flagged.length) {
    console.log(`\n⚠️  Manual review (${flagged.length}):`);
    for (const [s] of flagged.slice(0, 10)) console.log(`    • ${s}`);
  }

  const lowCtr = Object.entries(gscPages).filter(([, d]) => d.impressions > 2000 && d.ctr < 3).sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 5);
  if (lowCtr.length) {
    console.log(`\n🎯 CTR opportunities:`);
    for (const [s, d] of lowCtr) console.log(`    ${auditLog.posts[s]?.status === 'completed' ? '✅' : '⏳'} ${s} — ${d.impressions.toLocaleString()} impressions, ${d.ctr.toFixed(2)}% CTR`);
  }

  console.log();
  if (!DRY_RUN) console.log(`✅ Log: ${auditLogPath}`);
}

main().catch((e: Error) => { console.error('Fatal:', e.message); process.exit(1); });
