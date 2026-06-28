/**
 * SeoFlow — interactive init (seoflow init)
 *
 * Walks the user through setup, generates seoflow.config.json,
 * adds npm scripts, and configures .gitignore.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';

function ask(query: string, def = ''): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    const prompt = def ? `  ${query} (${def}): ` : `  ${query}: `;
    rl.question(prompt, ans => { rl.close(); resolve(ans.trim() || def); });
  });
}

export async function interactiveInit(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'seoflow.config.json');

  if (fs.existsSync(configPath)) {
    console.log('\n  ⚠️  seoflow.config.json already exists. Delete it first to reconfigure.\n');
    return;
  }

  console.log('\n  ╔═══════════════════════════════════════════╗');
  console.log('  ║       SeoFlow — Project Setup             ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('  Press Enter to accept defaults in (parentheses)\n');

  const siteName = await ask('Site name', 'My Site');
  const siteUrl = await ask('Site URL (no https://)', 'example.com');
  const author = await ask('Author name', 'Author');
  const authorLoc = await ask('Author location', 'Your City');
  const postsDir = await ask('Posts directory', 'src/content/posts');
  const branch = await ask('Git branch for publishing', 'main');
  const contentDomain = await ask('Content domain (e.g. travel, food, tech)', 'blog');
  const contentFormat = await ask('Content format (mdx / markdown)', 'mdx');

  const config = {
    siteName,
    siteUrl,
    author,
    authorLocation: authorLoc,
    writingSample: '',
    postsDir,
    gscPagesCsv: 'gsc_data/Seiten.csv',
    gscQueriesCsv: 'gsc_data/Suchanfragen.csv',
    auditLogPath: '.seoflow/data/audit-log.json',
    keywordCachePath: '.seoflow/data/keyword-cache.json',
    destinationPattern: '/destinations/{country}',
    contentFormat: contentFormat === 'markdown' ? 'markdown' : 'mdx',
    contentDomain,
    tools: [
      { keywords: ['budget', 'cost', 'how much', 'cheap', 'per day', 'price'], path: '/tools/budget-calculator', anchor: 'budget calculator' },
      { keywords: ['packing', 'what to bring', 'luggage', 'essentials'], path: '/tools/packing-checklist', anchor: 'packing checklist' },
    ],
    bookings: [],
    generation: {
      defaultSchema: 'Article',
      defaultCategory: contentDomain,
      wordCountMin: 1500,
      wordCountMax: 2500,
    },
    publishing: {
      gitEmail: 'noreply@seoflow.dev',
      gitName: `${siteName} Publisher`,
      branch,
      baseUrl: `https://${siteUrl}`,
      majorCities: [],
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`\n  ✅ seoflow.config.json created`);

  // Create data directory
  const dataDir = path.join(cwd, '.seoflow', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('  ✅ .seoflow/data/ created');
  }

  // Add npm scripts
  try {
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.scripts = {
        ...pkg.scripts,
        seoflow: 'npx tsx .seoflow/run.ts',
        'seoflow:dry': 'npx tsx .seoflow/run.ts --dry-run',
        'seoflow:audit': 'npx tsx .seoflow/run.ts audit',
        'seoflow:generate': 'npx tsx .seoflow/run.ts generate',
        'seoflow:publish': 'npx tsx .seoflow/run.ts publish',
      };
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('  ✅ npm scripts added to package.json');
    }
  } catch { /* non-critical */ }

  // Add to .gitignore
  try {
    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.seoflow/data/')) {
        fs.appendFileSync(gitignorePath, '\n# SeoFlow generated data\n.seoflow/data/\n');
        console.log('  ✅ Added .seoflow/data/ to .gitignore');
      }
    }
  } catch { /* non-critical */ }

  console.log('\n  ─────────────────────────────────────────────');
  console.log('  Next steps:');
  console.log('  1. Add API keys to .env.local (GEMINI_API_KEY, etc.)');
  console.log('  2. Edit seoflow.config.json to configure your tools and triggers');
  console.log('  3. Run: npm run seoflow:dry');
  console.log('  4. Run: npx seoflow audit');
  console.log('');
}
