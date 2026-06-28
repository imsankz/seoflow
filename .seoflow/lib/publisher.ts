/**
 * SeoFlow — Batch Publisher
 *
 * Publishes posts by setting published: true, committing with git,
 * pushing to remote, and optionally pinging IndexNow.
 *
 * Site config drives all site-specific values.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { loadConfig, getPostsDir } from './config';
import { parseMdx, buildFrontmatterBlock } from './mdx-parser';

export interface PublishCandidate {
  slug: string;
  filePath: string;
  title: string;
  priority: number;
}

/**
 * Score a post's publish priority.
 *
 * Uses publishPriority from config when provided (domain-agnostic).
 * Falls back to built-in travel slug patterns when not configured.
 */
function scorePriority(slug: string, majorCities: string[], cfg: ReturnType<typeof loadConfig>): number {
  const s = slug.toLowerCase();

  // Config-driven priority rules (domain-agnostic)
  if (cfg.publishPriority && cfg.publishPriority.length > 0) {
    for (const rule of cfg.publishPriority) {
      try {
        if (new RegExp(rule.pattern, 'i').test(s)) return rule.score;
      } catch {
        if (s.includes(rule.pattern.toLowerCase())) return rule.score;
      }
    }
    return 40;
  }

  // Built-in travel patterns (used when publishPriority not configured)
  if (s.includes('pass-review')) {
    const hasMajorCity = majorCities.some(c => s.includes(c.toLowerCase().replace(/\s+/g, '-')));
    return hasMajorCity ? 100 : 90;
  }
  if (/3-days?-(?:in|itinerary)/.test(s)) return 80;
  if (/3-days?/.test(s)) return 75;
  if (/1-week|one-week|7-days?/.test(s)) return 75;
  if (/weekend/.test(s)) return 70;
  if (s.includes('things-to-do') || s.includes('top-things')) return 68;
  if (s.includes('guide') || s.includes('travel-guide')) return 60;
  return 40;
}

/**
 * Scan for unpublished posts and return candidates sorted by priority.
 */
export function scanCandidates(options: {
  slug?: string;
  type?: string;
  country?: string;
  limit?: number;
}): PublishCandidate[] {
  const cfg = loadConfig();
  const postsDir = getPostsDir();
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
  const majorCities = cfg.publishing?.majorCities || [];

  let candidates: PublishCandidate[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { frontmatter } = parseMdx(raw);

    // Skip already published
    if (frontmatter.published === true) continue;

    const slug = file.replace('.mdx', '');

    // Apply filters
    if (options.slug && slug !== options.slug) continue;
    if (options.type) {
      const typeMatch = {
        'pass': slug.includes('pass-review'),
        'guide': slug.includes('guide'),
        'itinerary': slug.includes('itinerary') || slug.includes('days-in'),
        'things-to-do': slug.includes('things-to-do') || slug.includes('top-things'),
      }[options.type];
      if (!typeMatch) continue;
    }
    if (options.country && !slug.toLowerCase().includes(options.country.toLowerCase())) continue;

    const priority = scorePriority(slug, majorCities, cfg);
    candidates.push({
      slug,
      filePath: path.join(postsDir, file),
      title: frontmatter.title || slug,
      priority,
    });
  }

  // Sort: high priority first, then alphabetical
  candidates.sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug));
  if (options.limit) candidates = candidates.slice(0, options.limit);

  return candidates;
}

/**
 * Publish a batch of posts.
 * Sets published: true, commits, pushes, and optionally pings IndexNow.
 */
export function publishBatch(candidates: PublishCandidate[], dryRun = false): { published: number; errors: string[] } {
  const cfg = loadConfig();
  const today = new Date().toISOString().split('T')[0];
  const errors: string[] = [];
  let published = 0;
  const publishedCandidates: PublishCandidate[] = [];

  for (const c of candidates) {
    try {
      const raw = fs.readFileSync(c.filePath, 'utf8');
      const { frontmatter, content } = parseMdx(raw);

      // Don't re-publish
      if (frontmatter.published === true) {
        console.log(`     ⏭️  "${c.slug}" already published`);
        continue;
      }

      // Update frontmatter
      frontmatter.published = true;
      frontmatter.lastModified = today;
      if (!frontmatter.date) frontmatter.date = today;

      const newRaw = buildFrontmatterBlock(frontmatter) + content;

      if (!dryRun) {
        fs.writeFileSync(c.filePath, newRaw, 'utf8');
        console.log(`     ✅ Published: ${c.slug}`);
      } else {
        console.log(`     [DRY RUN] Would publish: ${c.slug}`);
      }
      published++;
      publishedCandidates.push(c);

      // IndexNow ping
      if (!dryRun && cfg.publishing?.indexnowHost) {
        pingIndexNow(cfg.publishing.baseUrl, c.slug, cfg.publishing.indexnowHost);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`${c.slug}: ${msg}`);
      console.error(`     ❌ ${c.slug}: ${msg}`);
    }
  }

  // Git commit + push
  if (published > 0 && !dryRun) {
    try {
      gitCommit(published, publishedCandidates, cfg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`git: ${msg}`);
      console.error(`     ❌ Git error: ${msg}`);
    }
  }

  return { published, errors };
}

function gitCommit(count: number, candidates: PublishCandidate[], cfg: ReturnType<typeof loadConfig>): void {
  const files = candidates.map(c => c.filePath);
  const msg = count === 1
    ? `content: publish 1 post`
    : `content: publish ${count} posts (${candidates[0].slug}${count > 1 ? `, +${count - 1} more` : ''})`;

  const email = cfg.publishing?.gitEmail || 'noreply@seoflow.dev';
  const name = cfg.publishing?.gitName || 'SeoFlow Publisher';
  const branch = cfg.publishing?.branch || 'main';

  // Configure git user if not set
  try {
    execFileSync('git', ['config', 'user.email', email], { stdio: 'ignore' });
  } catch {}
  try {
    execFileSync('git', ['config', 'user.name', name], { stdio: 'ignore' });
  } catch {}

  execFileSync('git', ['add', ...files], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', msg], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', branch], { stdio: 'inherit' });
  console.log(`     📤 Pushed to ${branch}`);
}

function pingIndexNow(baseUrl: string, slug: string, key: string): void {
  const blogPrefix = loadConfig().blogPrefix || '/blog/';
  const url = `${baseUrl.replace(/\/$/, '')}${blogPrefix}${slug}/`;
  const body = JSON.stringify({
    host: baseUrl.replace(/^https?:\/\//, ''),
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: [url],
  });

  try {
    execFileSync('curl', [
      '-s',
      '-X',
      'POST',
      'https://api.indexnow.org/indexnow',
      '-H',
      'Content-Type: application/json',
      '-d',
      body,
    ], { stdio: 'ignore', timeout: 10000 });
    console.log(`     📡 IndexNow pinged: ${url}`);
  } catch {
    // Non-critical — search engines will find it eventually
    console.log(`     ⚠️  IndexNow ping failed (non-critical)`);
  }
}
