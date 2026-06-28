#!/usr/bin/env node
/**
 * SeoFlow — SEO Pipeline Orchestrator
 *
 * Verb-based commands (preferred):
 *   seoflow init                           Interactive setup
 *   seoflow status                         Show pipeline state, GSC coverage, learning summary
 *   seoflow audit [slug]                   Run the full pipeline (or just one post)
 *   seoflow learn                          Show learning insights in a readable table
 *   seoflow learning export [file]         Export learning.json + gsc-baselines.json
 *   seoflow learning import <file>         Import a previously exported learning bundle
 *   seoflow generate                       Generate new posts from keywords
 *   seoflow publish [--go]                 Publish unpublished posts
 *   seoflow cluster <seed-keyword>         Generate semantic topic cluster plan
 *   seoflow brief <keyword>                Generate SEO content brief
 *
 * Legacy flag-based syntax (still supported):
 *   --mode <meta|links|images|keywords|neuron|content|review|factcheck|schema|technical|quality|report|all>
 *   --slug <slug>            Process only this post
 *   --dry-run                Preview without writing
 *   --limit <n>              Max posts to process (default 10)
 *   --reset-slug <slug>      Re-audit a previously completed post
 */

import fs from 'fs';
import path from 'path';
import { loadEnv } from './lib/env-loader';
import { loadConfig, getPostsDir, getAuditLogPath } from './lib/config';
import { parseGscPages, parseGscQueries, detectGscSource, gscSourceLabel } from './lib/gsc-parser';
import { loadAuditLog, saveAuditLog, isAlreadyDone } from './lib/audit-log';
import { logAiStatus, resetAiCallCounter, getAiCallCount } from './lib/ai-provider';
import { hasNeuronKey, getNeuronProjectId } from './lib/neuronwriter';
import { getLearningSummary, predictPriority, recordContentSnapshot } from './lib/learning';
import { generateBatch, ContentGap } from './lib/generator';
import { scanCandidates, publishBatch } from './lib/publisher';
import { printValidation } from './lib/validator';
import type { NeuronData } from './lib/types';

// ─── Args ────────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

// Verb-based: first arg is a word without leading '--'
const VERB = rawArgs[0] && !rawArgs[0].startsWith('--') ? rawArgs[0] : null;
const VERB_ARG = rawArgs[1] && !rawArgs[1].startsWith('--') ? rawArgs[1] : null;

const DRY_RUN = rawArgs.includes('--dry-run');
const LIMIT = (() => { const i = rawArgs.indexOf('--limit'); return i !== -1 ? parseInt(rawArgs[i + 1]) || 10 : 10; })();
const SLUG_FILTER = (() => {
  // Support: seoflow audit <slug>  OR  --slug <slug>
  if (VERB === 'audit' && VERB_ARG) return VERB_ARG;
  const i = rawArgs.indexOf('--slug');
  return i !== -1 ? rawArgs[i + 1] : null;
})();
const RESET_SLUG = (() => { const i = rawArgs.indexOf('--reset-slug'); return i !== -1 ? rawArgs[i + 1] : null; })();
const MODE = (() => {
  // Verb → mode mapping
  if (VERB === 'audit') return 'all';
  if (VERB === 'generate') return 'generate';
  if (VERB === 'publish') return 'publish';
  if (VERB === 'cluster') return 'cluster';
  if (VERB === 'brief') return 'brief';
  const i = rawArgs.indexOf('--mode');
  const modeArg = i !== -1 ? rawArgs[i + 1] : 'all';

  // Validate mode
  const validModes = ['all', 'meta', 'links', 'images', 'keywords', 'neuron', 'content', 'review', 'factcheck', 'schema', 'technical', 'quality', 'report'];
  return validModes.includes(modeArg) ? modeArg : 'all';
})();

// ─── Verb: cluster ────────────────────────────────────────────────────────────
async function cmdCluster(): Promise<void> {
  loadEnv();
  loadConfig();

  const seed = VERB_ARG || rawArgs.find(arg => !arg.startsWith('--'));
  if (!seed) {
    console.log('\n❌ No seed keyword provided');
    console.log('Usage: seoflow cluster <seed-keyword>\n');
    process.exit(1);
  }

  console.log(`\n🎯 Semantic Clustering: "${seed}"`);

  const { generateClusterPlan, saveClusterPlan } = await import('./lib/cluster');
  const plan = await generateClusterPlan(seed);

  const outputDir = 'cluster-plan';
  saveClusterPlan(plan, outputDir);

  console.log(`\n✅ Cluster plan generated!`);
  console.log(`   View: cat ${outputDir}/cluster-plan.md`);
  console.log(`   File: ${outputDir}/cluster-plan.json`);
  console.log(`   Total posts: ${plan.meta.totalPosts}`);
  console.log(`   Estimated words: ${plan.meta.estimatedWords.toLocaleString()}`);
  console.log('');
}

// ─── Verb: brief ──────────────────────────────────────────────────────────────
async function cmdBrief(): Promise<void> {
  loadEnv();
  loadConfig();

  const keyword = VERB_ARG || rawArgs.find(arg => !arg.startsWith('--'));
  if (!keyword) {
    console.log('\n❌ No keyword provided');
    console.log('Usage: seoflow brief <keyword>\n');
    process.exit(1);
  }

  console.log(`\n📝 Generating Content Brief: "${keyword}"`);

  const { generateContentBrief, saveContentBrief } = await import('./lib/content-brief');
  const brief = await generateContentBrief(keyword);

  saveContentBrief(brief);

  console.log(`\n✅ Content brief generated!`);
  const slug = keyword.toLowerCase().replace(/\s+/g, '-');
  console.log(`   View: cat content-briefs/${slug}-brief.md`);
  console.log(`   File: content-briefs/${slug}-brief.json`);
  console.log(`   Target word count: ${brief.targetWordCount.toLocaleString()} words`);
  console.log(`   Sections: ${brief.outline.length}`);
  console.log('');
}

// ─── Verb: init ───────────────────────────────────────────────────────────────

async function cmdInit(): Promise<void> {
  const configPath = path.join(process.cwd(), 'seoflow.config.json');
  if (fs.existsSync(configPath)) {
    console.log('✓ seoflow.config.json already exists');
    console.log('  Delete it and re-run to reconfigure, or edit it directly.');
    return;
  }
  console.log('\n  Run the interactive installer:\n');
  console.log('  bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)\n');
  console.log('  Or copy the template and fill it in:');
    const templatePath = path.join(process.cwd(), '.seoflow', 'seoflow.config.template.json');
  if (fs.existsSync(templatePath)) {
    console.log(`  cp ${templatePath} seoflow.config.json\n`);
  }
}

// ─── Verb: status ─────────────────────────────────────────────────────────────

async function cmdStatus(): Promise<void> {
  loadEnv();
  const cfg = loadConfig();
  const auditLog = loadAuditLog();
  await detectGscSource();

  const postsDir = getPostsDir();
  const allFiles = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx')) : [];
  const posts = auditLog.posts || {};
  const completed = Object.values(posts).filter(p => p.status === 'completed').length;
  const pending = allFiles.length - completed;
  const flagged = Object.entries(posts).filter(([, p]) => p.flagged_for_manual);
  const gscPages = await parseGscPages(cfg.gscDays || 28);

  const lines: string[] = [
    `\n📊 SeoFlow Status — ${cfg.siteName}`,
    '─'.repeat(50),
    `  Posts total:    ${allFiles.length}`,
    `  Completed:      ${completed}`,
    `  Pending:        ${pending}`,
    `  Flagged:        ${flagged.length}`,
    `  GSC pages:      ${Object.keys(gscPages).length}`,
    `  GSC source:     ${gscSourceLabel()}`,
    `  Last run:       ${auditLog.last_run || 'never'}`,
  ];

  if (cfg.aiLimits?.maxCallsPerRun) {
    lines.push(`  AI budget:      ${cfg.aiLimits.maxCallsPerRun} calls/run, ${cfg.aiLimits.maxCallsPerPost || '∞'} calls/post`);
  }

  // Enabled steps
  if (cfg.aiLimits?.enabledSteps) {
    lines.push(`  AI steps:       ${cfg.aiLimits.enabledSteps.join(', ')}`);
  }

  console.log(lines.join('\n'));

  if (flagged.length > 0) {
    console.log('\n⚠️  Flagged for manual review:');
    for (const [slug] of flagged.slice(0, 10)) console.log(`    • ${slug}`);
  }

  // Learning summary
  const lessons = getLearningSummary();
  if (lessons.length > 0) {
    console.log('\n🧠 Learning summary:');
    for (const l of lessons) console.log(l);
  }

  console.log('');
}

// ─── Verb: learn ─────────────────────────────────────────────────────────────

function cmdLearn(): void {
  loadEnv();
  loadConfig(); // ensure config is loaded for paths

  const learningPath = path.join(
    path.dirname(getAuditLogPath()),
    'learning.json'
  );

  if (!fs.existsSync(learningPath)) {
    console.log('\n⚠️  No learning data yet. Run the pipeline on some posts first.\n');
    return;
  }

  const db = JSON.parse(fs.readFileSync(learningPath, 'utf8'));

  console.log('\n🧠 SeoFlow Learning Insights');
  console.log('─'.repeat(60));

  // Step effectiveness table
  const steps = Object.entries(db.steps || {}) as [string, any][];
  if (steps.length > 0) {
    console.log('\nStep Effectiveness:');
    console.log('  Step          Runs  Success  Avg Pos Change  Best Categories');
    console.log('  ' + '─'.repeat(70));
    for (const [name, s] of steps) {
      if (s.runs < 1) continue;
      const pct = s.runs > 0 ? Math.round((s.improved / s.runs) * 100) : 0;
      const pos = s.avgPositionChange?.toFixed(1) ?? '0.0';
      const dir = (s.avgPositionChange ?? 0) < 0 ? '↑' : '↓';
      const cats = (s.bestForCategories || []).slice(0, 3).join(', ') || '—';
      console.log(`  ${name.padEnd(14)}${String(s.runs).padEnd(6)}${String(pct + '%').padEnd(9)}${(dir + Math.abs(parseFloat(pos))).padEnd(16)}${cats}`);
    }
  }

  // Content pattern insights
  const patterns = Object.entries(db.patterns || {}) as [string, any[]][];
  if (patterns.length > 0) {
    console.log('\nContent Patterns (what correlates with higher CTR):');
    console.log('  ' + '─'.repeat(60));
    for (const [dim, insights] of patterns) {
      const best = insights?.[0];
      if (!best || best.sampleSize < 3) continue;
      console.log(`  ${dim.padEnd(18)} best range: ${best.range.padEnd(12)} → ${best.avgCtr.toFixed(1)}% CTR, pos ${best.avgPosition.toFixed(1)} (n=${best.sampleSize})`);
    }
  }

  console.log(`\n  Data file: ${learningPath}`);
  console.log('  Tip: seoflow learning export  →  share with teammates or other sites\n');
}

// ─── Verb: learning export/import ────────────────────────────────────────────

function cmdLearningExport(outFile?: string): void {
  loadEnv();
  loadConfig();

  const dataDir = path.dirname(getAuditLogPath());
  const learningPath = path.join(dataDir, 'learning.json');
  const baselinesPath = path.join(dataDir, 'gsc-baselines.json');

  const bundle: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
  };

  if (fs.existsSync(learningPath)) {
    bundle.learning = JSON.parse(fs.readFileSync(learningPath, 'utf8'));
  }
  if (fs.existsSync(baselinesPath)) {
    bundle.gscBaselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf8'));
  }

  const dest = outFile || `seoflow-learning-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(dest, JSON.stringify(bundle, null, 2));
  console.log(`\n✅ Learning data exported to: ${dest}`);
  console.log('   Import on another machine: seoflow learning import ' + dest + '\n');
}

function cmdLearningImport(inFile: string): void {
  loadEnv();
  loadConfig();

  if (!inFile || !fs.existsSync(inFile)) {
    console.error(`\n❌ File not found: ${inFile || '(no file specified)'}`);
    console.error('   Usage: seoflow learning import <file.json>\n');
    process.exit(1);
  }

  const bundle = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const dataDir = path.dirname(getAuditLogPath());

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (bundle.learning) {
    fs.writeFileSync(path.join(dataDir, 'learning.json'), JSON.stringify(bundle.learning, null, 2));
    console.log('  ✅ Imported learning.json');
  }
  if (bundle.gscBaselines) {
    fs.writeFileSync(path.join(dataDir, 'gsc-baselines.json'), JSON.stringify(bundle.gscBaselines, null, 2));
    console.log('  ✅ Imported gsc-baselines.json');
  }
  console.log(`\n✅ Learning data imported from: ${inFile}\n`);
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function runPipeline(): Promise<void> {

  // Verb-based dispatch (no config required for init)
  if (VERB === 'init') { await cmdInit(); return; }

  loadEnv();

  if (VERB === 'status') { await cmdStatus(); return; }
  if (VERB === 'learn') { cmdLearn(); return; }
  if (VERB === 'learning') {
    const sub = rawArgs[1];
    if (sub === 'export') { cmdLearningExport(rawArgs[2]); return; }
    if (sub === 'import') { cmdLearningImport(rawArgs[2]); return; }
    console.error('Usage: seoflow learning export [file]  |  seoflow learning import <file>');
    process.exit(1);
  }

  if (VERB === 'cluster') { await cmdCluster(); return; }
  if (VERB === 'brief') { await cmdBrief(); return; }

  const cfg = loadConfig();

  console.log(`\n🔍 ${cfg.siteName} — SeoFlow Pipeline`);
  console.log(`   Mode: ${MODE} | Limit: ${SLUG_FILTER ? 1 : LIMIT} | Dry run: ${DRY_RUN}`);

  // AI cost guardrail banner
  if (cfg.aiLimits?.maxCallsPerRun) {
    const limit = cfg.aiLimits.maxCallsPerRun;
    const perPost = cfg.aiLimits.maxCallsPerPost || 3;
    const estPosts = Math.min(SLUG_FILTER ? 1 : LIMIT, Math.floor(limit / perPost));
    console.log(`   AI budget: max ${limit} calls/run (~${estPosts} posts with AI, ${perPost} calls each)`);
  }
  console.log('');

  resetAiCallCounter();

  const auditLog = loadAuditLog();

  await detectGscSource();
  console.log(`📊 GSC source: ${gscSourceLabel()}`);

  const gscPages = await parseGscPages(cfg.gscDays || 28);
  const gscQueries = await parseGscQueries(cfg.gscDays || 28);
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

  // ── Validation ─────────────────────────────────────────────────────────
  printValidation(cfg);

  if (hasNeuronKey()) console.log(`📡 NeuronWriter: ${getNeuronProjectId()}`);
  else console.log('⚠️  NEURONWRITER_API_KEY not set');
  logAiStatus();

  // ── Generate mode ──────────────────────────────────────────────────────
  if (MODE === 'generate') {
    const country = (() => { const i = rawArgs.indexOf('--country'); return i !== -1 ? rawArgs[i + 1] : null; })();
    if (!SLUG_FILTER && !country) {
      console.log('   Provide --slug <keyword> or --country <name> to generate content');
      console.log('   Example: seoflow generate --slug "best restaurants in prague" --country "Czech Republic"');
      console.log('');
      return;
    }
    const gaps: ContentGap[] = [
      { keyword: SLUG_FILTER || 'top things to do', type: 'things-to-do', destination: country || '', country: country || '' },
    ];
    const results = await generateBatch(gaps, LIMIT);
    console.log(`\n✅ Generated ${results.length} posts in ${postsDir}`);
    console.log(`   Run \`seoflow audit <slug>\` to optimize them.`);
    return;
  }

  // ── Publish mode ───────────────────────────────────────────────────────
  if (MODE === 'publish') {
    const goFlag = rawArgs.includes('--go');
    if (!goFlag) {
      console.log('⚠️  Dry run mode. Use --go to actually publish.');
      console.log('');
    }
    const candidates = scanCandidates({ slug: SLUG_FILTER || undefined, limit: LIMIT });
    if (candidates.length === 0) {
      console.log('📭 No unpublished posts found');
      console.log('');
      return;
    }
    console.log(`📋 ${candidates.length} unpublished posts found:\n`);
    for (const c of candidates) console.log(`   ${c.priority} ${c.slug}`);
    console.log('');
    const result = publishBatch(candidates, !goFlag);
    console.log(`\n✅ Published ${result.published} posts (${result.errors.length} errors)`);
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      for (const e of result.errors) console.log(`   • ${e}`);
    }
    return;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
  console.log(`📁 ${files.length} posts\n`);

  let candidates = files.map(f => {
    const slug = f.replace('.mdx', '');
    const gsc = gscPages[slug] || {};
    const prediction = predictPriority(slug, gsc);
    return {
      slug,
      filePath: path.join(postsDir, f),
      priority: prediction.totalScore || 0,
      gsc,
      patterns: prediction.patterns,
    };
  });

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

  const withPatterns = candidates.filter(c => c.patterns && c.patterns.length > 0);
  if (withPatterns.length > 0 && MODE === 'all') {
    console.log('\n🧠 Predictive insights:');
    for (const c of withPatterns.slice(0, 3)) {
      for (const p of c.patterns) console.log(`   ${c.slug}: ${p}`);
    }
    console.log('');
  }

  type ProcessResult = {
    slug: string;
    changes: number;
    before: Record<string, unknown>;
    after: {
      word_count?: number;
      internal_links?: number;
      images?: number;
      meta_description_length?: number;
    };
    neuronData: NeuronData | null;
  };

  const results: ProcessResult[] = [];
  const { processPost } = await import('./pipeline/steps');
  for (const c of candidates) {
    const r = await processPost(c.slug, c.filePath, gscPages, auditLog, { mode: MODE, skipAlreadyDone: !SLUG_FILTER && MODE === 'all', dryRun: DRY_RUN });
    results.push(r);

    if (!DRY_RUN && r.after) {
      try {
        const raw = fs.readFileSync(c.filePath, 'utf8');
        const parsed = await import('./lib/mdx-parser');
        const fm = parsed.parseMdx(raw).frontmatter;
        recordContentSnapshot(c.slug, {
          title: fm.title || c.slug,
          titleLength: (fm.title || '').length,
          descLength: (fm.description || '').length,
          wordCount: r.after.word_count || 0,
          imageCount: r.after.images || 0,
          imageDensity: r.after.word_count > 0 ? (r.after.images || 0) / (r.after.word_count / 1000) : 0,
          linkCount: r.after.internal_links || 0,
          schema: fm.schema || '',
          category: fm.category || '',
        });
      } catch {}
    }

    saveAuditLog(auditLog, DRY_RUN);
  }

  let total = 0;
  let completed = 0;
  let improved = 0;
  try {
    total = results.reduce((s, r) => s + (r?.changes || 0), 0);
    improved = results.filter((r) => r.changes > 0).length;
    completed = auditLog?.posts ? Object.values(auditLog.posts).filter(e => e?.status === 'completed').length : 0;
  } catch {}

  console.log(`\n${'═'.repeat(60)}\n📋 SUMMARY\n${'═'.repeat(60)}`);
  console.log(`  Processed: ${results.length} | Improved: ${improved} | Changes: ${total}`);
  console.log(`  Pending: ${files.length - completed}`);

  // AI call usage summary
  const aiCalls = getAiCallCount();
  if (aiCalls > 0) {
    const budget = cfg.aiLimits?.maxCallsPerRun;
    console.log(`  AI calls: ${aiCalls}${budget ? `/${budget}` : ''}`);
  }

  const flagged = auditLog?.posts ? Object.entries(auditLog.posts).filter(([, v]) => v.flagged_for_manual) : [];
  if (flagged.length) {
    console.log(`\n⚠️  Manual review (${flagged.length}):`);
    for (const [s] of flagged.slice(0, 10)) console.log(`    • ${s}`);
  }

  const lessons = getLearningSummary();
  if (lessons.length > 0) {
    console.log(`\n🧠 Learning (step effectiveness):`);
    for (const l of lessons) console.log(l);
  }

  const lowCtr = Object.entries(gscPages).filter(([, d]) => d.impressions > 2000 && d.ctr < 3).sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 5);
  if (lowCtr.length) {
    console.log(`\n🎯 CTR opportunities:`);
    for (const [s, d] of lowCtr) console.log(`    ${auditLog.posts[s]?.status === 'completed' ? '✅' : '⏳'} ${s} — ${d.impressions.toLocaleString()} impressions, ${d.ctr.toFixed(2)}% CTR`);
  }

  console.log();
  if (!DRY_RUN) console.log(`✅ Log: ${auditLogPath}`);
}

runPipeline().catch((e: Error) => { console.error('Fatal:', e?.message || e, e?.stack?.split('\n').slice(0,3).join('\n') || ''); process.exit(1); });
