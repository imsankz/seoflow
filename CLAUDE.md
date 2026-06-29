# SeoFlow — AI-Powered SEO Pipeline

## What is SeoFlow?

SeoFlow is a portable, AI-powered SEO pipeline for content sites. It lives in your repo, not a SaaS dashboard, and automates:

- Frontmatter fixes
- Internal link injection
- Image enrichment
- AI content audits
- Fact-checking
- Self-learning priority system

Works with any MDX/Markdown setup (Next.js, Hugo, Jekyll, Astro, 11ty, WordPress).

## Quick Start

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

## Hooks

SeoFlow uses hooks for local validation and automation. The default hook setup validates JSON files and can be extended.

## Development

```bash
npm run seoflow:init          # Interactive setup
npm run seoflow:status        # Pipeline state
npm run seoflow:audit         # Run pipeline on top 10 posts
npm run seoflow:test          # Run tests
```

## Architecture

| Directory | Purpose |
|-----------|---------|
| `agents/` | SEO-specific agents for tasks like audit, content, technical SEO |
| `bin/` | CLI entry point |
| `lib/` | Core library (config, parsers, generators, validators) |
| `pipeline/` | Pipeline steps (keywords, meta, links, images, content, review, factcheck) |
| `skills/` | Skill definitions for Claude Code |
| `extensions/` | Optional extensions (Ahrefs, Bing Webmaster, DataForSEO, etc.) |
| `hooks/` | PostToolUse hooks for validation and automation |

## License

MIT — free for personal and commercial use.
