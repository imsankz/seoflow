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

### One-liner Install (Recommended)

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

### Manual Installation

```bash
git clone https://github.com/imsankz/seoflow.git .seoflow
cd .seoflow
npm install
npm run seoflow:init
```

## Hooks

SeoFlow uses hooks for local validation and automation. The default hook setup validates JSON files and seoflow.config.json. To install hooks:

```bash
npm run install:repo
```

## Commands

| Command | Description |
|---------|-------------|
| `seoflow init` | Interactive setup — generates `seoflow.config.json` |
| `seoflow status` | Pipeline state, GSC coverage, learning summary |
| `seoflow audit` | Run pipeline on top 10 priority posts |
| `seoflow audit <slug>` | Run pipeline on one post |
| `seoflow learn` | Show learning insights (step effectiveness, content patterns) |
| `seoflow learning export [file]` | Export `learning.json` + `gsc-baselines.json` |
| `seoflow learning import <file>` | Import a learning bundle (share across machines) |
| `seoflow generate` | Generate new posts from keywords |
| `seoflow publish` | Dry-run: preview unpublished posts |
| `seoflow publish --go` | Actually publish top candidates |
| `seoflow validate` | Check config + environment |
| `seoflow extensions` | List supported optional extensions |
| `seoflow extensions install <id>` | Install an optional extension |
| `seoflow extensions status` | Show installed extension state |

## Architecture

| Directory | Purpose |
|-----------|---------|
| `agents/` | SEO-specific agents for tasks like audit, content, technical SEO |
| `bin/` | CLI entry point |
| `lib/` | Core library (config, parsers, generators, validators) |
| `pipeline/` | Pipeline steps (keywords, meta, links, images, content, review, factcheck) |
| `skills/` | Skill definitions for Claude Code |
| `extensions/` | Optional extensions (Ahrefs, Bing Webmaster, DataForSEO, Firecrawl, etc.) |
| `hooks/` | PostToolUse hooks for validation and automation |
| `docs/` | Documentation |

## Configuration

SeoFlow uses a `seoflow.config.json` file for configuration. You can generate a default config using:

```bash
npx seoflow init
```

### Required Fields

- `siteName`: Your site name (e.g., "My Travel Blog")
- `siteUrl`: Your site URL (e.g., "https://example.com")
- `author`: Author name (e.g., "John Doe")
- `authorLocation`: Author location (e.g., "Berlin, Germany")
- `postsDir`: Directory containing your blog posts (e.g., "posts")

### Optional Fields

- `writingSample`: Single voice sample for AI content generation
- `writingSamples`: Per-content-type voice samples (e.g., { "guide": "...", "review": "..." })
- `contentFormat`: Content format ("mdx", "markdown", "wordpress")
- `imageSearchFallback`: Default image search term (e.g., "travel")
- `defaultCategory`: Default category for AI prompts (e.g., "travel")
- `contentDomain`: Content domain (e.g., "travel blog")

## Pipeline Steps

1. **Keywords**: SEMrush (if API key) or Ubersuggest MCP → focusKeyword + related terms
2. **Meta**: Schema, description length, focusKeyword, lastModified
3. **Links**: Inject internal links from your configured triggers
4. **Images**: Pexels/Unsplash fetch per H2 section (1 per section, max 2)
5. **Neuron**: NeuronWriter NLP: target word count, missing terms, People Also Ask
6. **Content**: Gemini 2.5 Flash: FAQ, thin section expansion, NLP term weaving
7. **Review**: Claude-style SEO review: score (1-10), quick wins, auto-fix title/meta
8. **Schema**: Validate and generate Schema.org structured data
9. **Quality**: Content quality audit (E-E-A-T signals, readability)
10. **Technical**: Technical SEO checks: broken links, redirect chains
11. **FactCheck**: Price/claim verification via Google Search grounding
12. **Report**: Export audit report (PDF format)

## Extensions

SeoFlow supports optional extensions for additional integrations:

- Ahrefs: Backlink analysis
- Bing Webmaster: Bing search data
- DataForSEO: Keyword and SERP data
- Firecrawl: Crawling and scraping
- Profound: Content analysis
- Seranking: Rank tracking
- Unlighthouse: Lighthouse audits
- Banana: Image generation

## Development

```bash
npm run seoflow:init          # Interactive setup
npm run seoflow:status        # Pipeline state
npm run seoflow:audit         # Run pipeline on top 10 posts
npm run seoflow:test          # Run tests
npm run build                 # Build the project
```

## Testing

```bash
npm run seoflow:test          # All tests (unit + integration)
npm run seoflow:test:unit     # Unit tests only (no file I/O)
```

## License

MIT — free for personal and commercial use.

