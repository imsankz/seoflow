#!/usr/bin/env node
/**
 * SeoFlow CLI — entry point for the npm package.
 *
 * Usage:
 *   seoflow init              Interactive config setup
 *   seoflow run [flags]       Run pipeline (same flags as run.ts)
 *   seoflow generate [flags]  Generate content from keywords
 *   seoflow publish [flags]   Publish unpublished posts
 *   seoflow validate          Validate config + env
 *   seoflow --help            Show help
 */

const [node, script, command, ...rest] = process.argv;

const HELP = `
  SeoFlow — AI-powered SEO pipeline

  USAGE
    seoflow <command> [flags]

  COMMANDS
    init                 Interactive config setup
    run [--mode M]       Run pipeline (modes: all, meta, links, images,
                         keywords, content, review, factcheck)
    generate             Generate content from keywords/gaps
    publish              Publish unpublished posts
    validate             Check config + environment
    extensions           List supported optional extensions
    extensions install <id>  Install an optional extension
    extensions status    Show installed extension state

  FLAGS (run, generate, publish)
    --slug <slug>        Process only this post
    --dry-run            Preview without writing
    --limit <n>          Max posts to process (default 10)
    --mode <name>        Pipeline mode (run only)
    --country <name>     Filter by country (generate only)
    --go                 Actually publish (publish only)

  EXAMPLES
    seoflow init
    seoflow run
    seoflow run --mode keywords --slug my-post
    seoflow run --dry-run --limit 5
    seoflow generate --country germany --limit 3
    seoflow publish --go
    seoflow validate
`;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'run':
      const { runPipeline } = await import('../run');
      // run.ts reads from process.argv, which includes the full original args
      // We need to strip the leading node/script and 'run' but keep flags
      process.argv = [node, script, ...rest];
      await runPipeline();
      break;
    case 'generate':
      await runGenerate(rest);
      break;
    case 'publish':
      await runPublish(rest);
      break;
    case 'validate':
      await runValidate();
      break;
    case 'extensions':
      await runExtensions(rest);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

async function runInit() {
  const { interactiveInit } = await import('../lib/init');
  await interactiveInit();
}

async function runGenerate(args: string[]) {
  const { loadEnv } = await import('../lib/env-loader');
  const { loadConfig, getPostsDir } = await import('../lib/config');
  loadEnv();
  const cfg = loadConfig();
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) || 5 : 5;
  const countryIdx = args.indexOf('--country');
  const country = countryIdx !== -1 ? args[countryIdx + 1] : null;
  const slugIdx = args.indexOf('--slug');
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;

  const gaps = [
    { keyword: slug || 'top things to do', type: 'things-to-do' as const, destination: country || '', country: country || '' },
  ];
  const { generateBatch } = await import('../lib/generator');
  const results = await generateBatch(gaps, limit);
  console.log(`\nGenerated ${results.length} posts in ${getPostsDir()}`);
}

async function runPublish(args: string[]) {
  const { loadEnv } = await import('../lib/env-loader');
  const { loadConfig } = await import('../lib/config');
  loadEnv();
  const cfg = loadConfig();
  const goFlag = args.includes('--go');
  if (!goFlag) console.log('⚠️  Dry run mode. Use --go to publish.');
  const { scanCandidates, publishBatch } = await import('../lib/publisher');
  const slugIdx = args.indexOf('--slug');
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : undefined;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) || 10 : 10;
  const candidates = scanCandidates({ slug, limit });
  if (candidates.length === 0) { console.log('No unpublished posts'); return; }
  console.log(`Found ${candidates.length} unpublished posts`);
  for (const c of candidates) console.log(`  ${c.slug}`);
  const result = publishBatch(candidates, !goFlag);
  console.log(`Published: ${result.published}, Errors: ${result.errors.length}`);
}

async function runValidate() {
  const { loadEnv } = await import('../lib/env-loader');
  const { loadConfig } = await import('../lib/config');
  const { printValidation } = await import('../lib/validator');
  loadEnv();
  const cfg = loadConfig();
  printValidation(cfg);
}

async function runExtensions(args: string[]) {
  const { formatExtensionStatus, getSupportedExtensions, installExtension, getExtensionState } = await import('../lib/extensions');
  const subcommand = args[0];
  const extensionId = args[1];

  if (subcommand === 'install') {
    const result = installExtension(extensionId || '', { rootDir: process.cwd() });
    if (result.status === 'unavailable') {
      console.error(`Unknown extension: ${extensionId}`);
      process.exit(1);
    }
    console.log(`Installed extension: ${result.extensionId}`);
    return;
  }

  if (subcommand === 'status') {
    const state = getExtensionState(process.cwd());
    const entries = Object.entries(state as Record<string, any>);
    if (entries.length === 0) {
      console.log('No extensions installed yet.');
      return;
    }
    for (const [id, extState] of entries) {
      console.log(`${id}: ${(extState as any).status}`);
    }
    return;
  }

  const supported = getSupportedExtensions();
  console.log('Supported optional extensions:');
  for (const ext of supported) {
    console.log(`- ${ext.id}: ${ext.name} — ${ext.description}`);
  }
  console.log('\nInstalled state:');
  for (const line of formatExtensionStatus(process.cwd())) {
    console.log(line);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
