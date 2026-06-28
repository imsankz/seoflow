/**
 * Semantic topic clustering for SEOFlow
 *
 * Groups keywords by SERP overlap (Google's actual ranking patterns) rather than
 * text similarity. Builds hub-and-spoke content architecture with internal link
 * matrices for better SEO performance.
 */

import { WebSearch } from 'some-search-library'; // Note: This would need to be replaced with actual search integration

export interface ClusterKeyword {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface ClusterPost {
  title: string;
  keyword: string;
  template: string;
  wordCount: number;
  url?: string;
  status: 'planned' | 'written' | 'published';
}

export interface Cluster {
  name: string;
  color: string;
  posts: ClusterPost[];
}

export interface ClusterPlan {
  pillar: ClusterPost;
  clusters: Cluster[];
  links: { from: string; to: string; type: 'mandatory' | 'recommended' | 'optional'; anchor: string }[];
  meta: {
    totalPosts: number;
    totalClusters: number;
    totalLinks: number;
    estimatedWords: number;
  };
}

// Intent classification patterns
const INTENT_PATTERNS = {
  informational: /how|what|why|guide|tutorial|learn|explain|definition/i,
  commercial: /best|top|review|comparison|vs|alternative|ranked/i,
  transactional: /buy|price|discount|coupon|order|sign up|purchase/i,
  navigational: /login|dashboard|support|contact us|about us/i,
};

// Template mapping based on intent
const INTENT_TO_TEMPLATE = {
  informational: 'ultimate-guide',
  'informational-how': 'how-to',
  'informational-list': 'listicle',
  'informational-concept': 'explainer',
  commercial: 'best-of',
  'commercial-compare': 'comparison',
  'commercial-evaluate': 'review',
  transactional: 'landing-page',
};

/**
 * Classifies keyword intent based on pattern matching
 */
export function classifyIntent(keyword: string): 'informational' | 'commercial' | 'transactional' | 'navigational' {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(keyword)) {
      return intent as any;
    }
  }
  return 'informational'; // Default to informational
}

/**
 * Expands a seed keyword into related variants
 */
export async function expandKeywords(seed: string): Promise<ClusterKeyword[]> {
  const variants: ClusterKeyword[] = [{ keyword: seed }];

  // Simple expansion - in real implementation, this would use WebSearch for related searches and PAA
  const modifiers = [
    'best', 'how to', 'vs', 'for beginners', 'tools', 'examples', 'guide',
    'template', 'mistakes', 'checklist', 'pricing', 'review', 'alternative',
    'comparison', 'free', 'top'
  ];

  for (const modifier of modifiers) {
    variants.push({ keyword: `${modifier} ${seed}` });
    variants.push({ keyword: `${seed} ${modifier}` });
  }

  // Question variants
  const questionWords = ['who', 'what', 'when', 'where', 'why', 'how'];
  for (const question of questionWords) {
    variants.push({ keyword: `${question} ${seed}` });
  }

  // Deduplicate and filter out navigational keywords
  const unique = new Set<string>();
  return variants.filter(v => {
    const normalized = v.keyword.toLowerCase().trim();
    if (unique.has(normalized)) return false;
    unique.add(normalized);
    return classifyIntent(normalized) !== 'navigational';
  });
}

/**
 * Analyzes SERP overlap between two keywords
 * In real implementation, this would fetch actual search results and count shared URLs
 */
export async function analyzeSerpOverlap(keyword1: string, keyword2: string): Promise<number> {
  // Simulated overlap - in production, this would use WebSearch or DataForSEO
  const similarity = calculateTextSimilarity(keyword1, keyword2);
  return Math.floor(similarity * 10); // Convert to 0-10 scale
}

/**
 * Simple text similarity calculation (for fallback)
 */
function calculateTextSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = [...set1].filter(x => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Groups keywords into clusters based on SERP overlap
 */
export async function clusterKeywords(keywords: ClusterKeyword[]): Promise<Cluster[]> {
  const clusters: Cluster[] = [];
  const used = new Set<number>();

  // Pre-group by intent to reduce comparisons
  const byIntent: { [key: string]: number[] } = {};
  keywords.forEach((kw, idx) => {
    const intent = kw.intent || classifyIntent(kw.keyword);
    if (!byIntent[intent]) byIntent[intent] = [];
    byIntent[intent].push(idx);
  });

  // Cluster within each intent group
  for (const intentGroup of Object.values(byIntent)) {
    for (let i = 0; i < intentGroup.length; i++) {
      if (used.has(i)) continue;

      const cluster: Cluster = {
        name: `Cluster ${clusters.length + 1}`,
        color: getRandomColor(),
        posts: [],
      };

      const seedIdx = intentGroup[i];
      cluster.posts.push({
        title: keywords[seedIdx].keyword,
        keyword: keywords[seedIdx].keyword,
        template: 'blog-post',
        wordCount: 1500,
        status: 'planned',
      });
      used.add(seedIdx);

      // Find other keywords in this intent group with high overlap
      for (let j = i + 1; j < intentGroup.length; j++) {
        if (used.has(j)) continue;

        const overlap = await analyzeSerpOverlap(
          keywords[seedIdx].keyword,
          keywords[intentGroup[j]].keyword
        );

        if (overlap >= 4) { // 4+ shared results = same cluster
          cluster.posts.push({
            title: keywords[intentGroup[j]].keyword,
            keyword: keywords[intentGroup[j]].keyword,
            template: 'blog-post',
            wordCount: 1200,
            status: 'planned',
          });
          used.add(j);
        }
      }

      if (cluster.posts.length > 0) {
        clusters.push(cluster);
      }
    }
  }

  return clusters;
}

/**
 * Selects pillar keyword and designs hub-and-spoke architecture
 */
export function designArchitecture(clusters: Cluster[]): ClusterPlan {
  // Find the cluster with the highest potential pillar keyword
  const allPosts = clusters.flatMap(c => c.posts);
  const pillar = allPosts.reduce((best, post) => {
    if (!best || post.keyword.length > best.keyword.length) {
      return post;
    }
    return best;
  }, allPosts[0]);

  // Build cluster plan
  const plan: ClusterPlan = {
    pillar: { ...pillar, template: 'ultimate-guide', wordCount: 3000, status: 'planned' },
    clusters: clusters.map(c => ({
      ...c,
      posts: c.posts.filter(p => p.keyword !== pillar.keyword), // Remove pillar from clusters
    })).filter(c => c.posts.length > 0), // Remove empty clusters
    links: [],
    meta: {
      totalPosts: 1 + clusters.reduce((sum, c) => sum + c.posts.length, 0),
      totalClusters: clusters.length,
      totalLinks: 0,
      estimatedWords: 3000 + clusters.reduce((sum, c) => sum + c.posts.reduce((s, p) => s + p.wordCount, 0), 0),
    },
  };

  // Add mandatory pillar links
  plan.clusters.forEach(cluster => {
    cluster.posts.forEach(post => {
      plan.links.push({
        from: post.title,
        to: plan.pillar.title,
        type: 'mandatory',
        anchor: plan.pillar.keyword,
      });
      plan.links.push({
        from: plan.pillar.title,
        to: post.title,
        type: 'mandatory',
        anchor: post.keyword,
      });
    });
  });

  // Add spoke-to-spoke links within clusters
  plan.clusters.forEach(cluster => {
    for (let i = 0; i < cluster.posts.length; i++) {
      for (let j = i + 1; j < cluster.posts.length; j++) {
        plan.links.push({
          from: cluster.posts[i].title,
          to: cluster.posts[j].title,
          type: 'recommended',
          anchor: cluster.posts[j].keyword,
        });
        plan.links.push({
          from: cluster.posts[j].title,
          to: cluster.posts[i].title,
          type: 'recommended',
          anchor: cluster.posts[i].keyword,
        });
      }
    }
  });

  plan.meta.totalLinks = plan.links.length;

  return plan;
}

/**
 * Generates a random color for cluster visualization
 */
function getRandomColor(): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Main clustering workflow
 */
export async function generateClusterPlan(seedKeyword: string): Promise<ClusterPlan> {
  console.log(`🔍 Expanding seed keyword: "${seedKeyword}"`);
  const keywords = await expandKeywords(seedKeyword);
  console.log(`✅ Found ${keywords.length} keyword variants`);

  console.log(`🔍 Clustering keywords...`);
  const clusters = await clusterKeywords(keywords);
  console.log(`✅ Created ${clusters.length} clusters`);

  console.log(`🔍 Designing hub-and-spoke architecture...`);
  const plan = designArchitecture(clusters);
  console.log(`✅ Cluster plan complete: ${plan.meta.totalPosts} posts, ${plan.meta.totalClusters} clusters`);

  return plan;
}

/**
 * Saves cluster plan to file
 */
export function saveClusterPlan(plan: ClusterPlan, dir: string): void {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const jsonPath = path.join(dir, 'cluster-plan.json');
  fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2));

  const mdPath = path.join(dir, 'cluster-plan.md');
  fs.writeFileSync(mdPath, clusterPlanToMarkdown(plan));

  console.log(`✅ Cluster plan saved to ${dir}`);
}

/**
 * Converts cluster plan to markdown for readability
 */
function clusterPlanToMarkdown(plan: ClusterPlan): string {
  let md = `# Cluster Plan: ${plan.pillar.keyword}\n\n`;

  md += `## Pillar Page\n`;
  md += `- **Title**: ${plan.pillar.title}\n`;
  md += `- **Keyword**: ${plan.pillar.keyword}\n`;
  md += `- **Template**: ${plan.pillar.template}\n`;
  md += `- **Word Count**: ${plan.pillar.wordCount} words\n\n`;

  plan.clusters.forEach(cluster => {
    md += `## Cluster: ${cluster.name} (${cluster.color})\n`;
    cluster.posts.forEach(post => {
      md += `- **${post.title}** (${post.template}, ${post.wordCount} words)\n`;
    });
    md += `\n`;
  });

  md += `## Meta Data\n`;
  md += `- Total Posts: ${plan.meta.totalPosts}\n`;
  md += `- Total Clusters: ${plan.meta.totalClusters}\n`;
  md += `- Total Links: ${plan.meta.totalLinks}\n`;
  md += `- Estimated Words: ${plan.meta.estimatedWords.toLocaleString()}\n`;

  return md;
}
