# SeoFlow — Agent Guide

SeoFlow installs into `.seoflow/` in any repo. It provides two things:

1. **Pipeline** — automated content audit, keyword research, internal links, images, AI content improvements, publishing
2. **SEO Agents** — 18 specialist agents (technical, content, schema, local, GEO, drift, etc.) deployed to whichever AI coding tool you use

## Install

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

This detects your AI coding tool (Kiro, Claude Code, Cursor, Copilot, Windsurf, OpenCode, Codex, Cline, Lingma, Zed, Amp) and copies agents to the right folder automatically.

## Re-sync agents after updating

```bash
bash .seoflow/update.sh
```

## Pipeline CLI

```bash
npm run seoflow audit           # audit top 10 posts by GSC priority
npm run seoflow audit <slug>    # audit one specific post
npm run seoflow status          # pipeline state + learning summary
npm run seoflow:dry             # preview without writing any files
npm run seoflow generate        # generate new posts from keywords
npm run seoflow publish         # dry-run publish candidates
npm run seoflow:publish -- --go # actually publish
npm run seoflow cluster <seed>  # semantic topic cluster plan
npm run seoflow brief <keyword> # SEO content brief
npm run seoflow learn           # show learning insights
```

## SEO Agents (interactive)

After install, agents are available in your AI tool. Example commands:

```
/seo audit https://yoursite.com
/seo technical https://yoursite.com
/seo content https://yoursite.com/blog/post
/seo schema https://yoursite.com
/seo local https://yoursite.com
/seo geo https://yoursite.com
/seo cluster "best coffee in berlin"
/seo drift baseline https://yoursite.com
```

## Structure

```
.seoflow/
  run.ts                    # Pipeline CLI entry point
  agents/                   # Canonical agent definitions (source of truth)
  skills/                   # Canonical skill definitions
  scripts/                  # Python scripts (PSI, CrUX, GSC, reports, drift...)
  lib/                      # Pipeline TypeScript utilities
    config.ts               # Site config loader
    types.ts                # Shared interfaces
    env-loader.ts           # .env.local parser
    mdx-parser.ts           # MDX/Markdown parsing
    gsc-parser.ts           # GSC CSV + live API parser
    gsc-client.ts           # Live GSC API client
    gemini-client.ts        # Gemini client
    openrouter-client.ts    # OpenRouter client
    ai-provider.ts          # Unified AI (Gemini + OpenRouter fallback)
    pexels-client.ts        # Image search (Pexels + Unsplash)
    neuronwriter.ts         # NeuronWriter client
    audit-log.ts            # Audit log
    ubersuggest-client.ts   # Keyword research (cached MCP)
    learning.ts             # Self-learning system
    schema.ts               # Schema.org generation + validation
    cluster.ts              # Semantic topic clustering
    content-brief.ts        # SEO content brief generator
    generator.ts            # Content generation
    publisher.ts            # Publishing workflow
    technical/psi.ts        # PageSpeed Insights + CrUX wrapper
    content-quality/        # E-E-A-T + humanizer + claim verify
    reports/                # PDF report generation
    drift/                  # SEO drift monitoring
    backlinks/              # Backlink analysis
  pipeline/
    steps.ts                # All pipeline steps
    technical.ts            # Technical audit step
    content-quality.ts      # Content quality audit step
    report-export.ts        # Report export step
  install.sh                # Smart installer (run once)
  update.sh                 # Re-download + re-sync agents
  data/                     # Generated data (gitignored)
    audit-log.json
    learning.json
    keyword-cache.json
```

## Adding a New Site

1. `bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)`
2. Edit `seoflow.config.json`
3. Add API keys to `.env.local`
4. `npm run seoflow:dry`

## Configuration Keys

| Key | Purpose |
|-----|---------|
| `siteName` | Used in AI prompts and reports |
| `siteUrl` | GSC property, OpenRouter referer |
| `postsDir` | Where your MDX/Markdown files live |
| `blogPrefix` | URL prefix to strip when matching slugs |
| `writingSample` | Voice sample injected into AI prompts |
| `contentDomain` | e.g. "travel blog", "SaaS product" |
| `aiLimits` | Cost guardrails for bulk runs |
| `tools` / `bookings` | Internal link injection triggers |

## Ubersuggest MCP

The keyword research step uses OAuth MCP. Run in your AI session:

```
mcp__ubersuggest__keyword_ideas on "<your keyword>"
```

Save results to `seoflow.config.json` → `keywordCachePath` for the pipeline to pick up.
