# SeoFlow

**Portable, AI-powered SEO pipeline for any content site.** Drop it into any project, point it at your posts, and get automated frontmatter fixes, internal link injection, image enrichment, AI content audits, fact-checking, and a self-learning priority system.

> Built for content teams who want programmatic SEO without vendor lock-in. Works with Next.js, Hugo, Jekyll, Astro, 11ty, WordPress, or any MDX/Markdown setup.

---

## Quick Start

### One-liner install (recommended)

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

Creates `seoflow.config.json`, adds npm scripts, configures `.gitignore`.

### Via npm (after publish)

```bash
npm install -D @imsankz/seoflow
npx seoflow init
```

### Development install (this repo)

```bash
# Clone and use directly
git clone https://github.com/imsankz/seoflow.git .seoflow
npm install  # installs tsx for dev
npm run seoflow:init
```

### Hook workflow

SeoFlow ships a lightweight hook scaffold for local validation and automation:

```bash
npm run install:repo
```

This installs the repo-level plugin metadata and hook assets under [.claude-plugin](.claude-plugin) and [hooks](hooks), which can be used by Claude Code-style tooling for post-edit validation.

---

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
| `seoflow cluster <seed-keyword>` | Generate semantic topic cluster plan |
| `seoflow brief <keyword>` | Generate SEO content brief |
| `seoflow extensions` | List supported optional extensions |
| `seoflow extensions install <id>` | Install an optional extension |
| `seoflow extensions status` | Show installed extension state |

### Global Flags

```bash
--dry-run           Preview changes without writing
--limit <n>         Max posts to process (default: 10)
--slug <slug>       Target one specific post
--reset-slug        Re-audit a previously completed post
--mode <step>       Run only one step: meta|links|images|keywords|neuron|content|review|factcheck|schema|technical|quality|report
```

---

## What It Does (11 Pipeline Steps)

```
seoflow audit
  │
  ├─► 0. Keywords  — SEMrush (if API key) or Ubersuggest MCP → focusKeyword + related terms
  ├─► 1. Meta      — Schema, description length, focusKeyword, lastModified
  ├─► 2. Links     — Inject internal links from your configured triggers
  ├─► 3. Images    — Pexels/Unsplash fetch per H2 section (1 per section, max 2)
  ├─► 4. Neuron    — NeuronWriter NLP: target word count, missing terms, People Also Ask
  ├─► 5. Content   — Gemini 2.5 Flash: FAQ, thin section expansion, NLP term weaving
  ├─► 6. Review    — Claude-style SEO review: score (1-10), quick wins, auto-fix title/meta
  ├─► 7. Schema    — Validate and generate Schema.org structured data
  ├─► 8. Quality   — Content quality audit (E-E-A-T signals, readability)
  ├─► 9. Technical — Technical SEO checks: broken links, redirect chains
  ├─►10. FactCheck — Price/claim verification via Google Search grounding
  └─►11. Report    — Export audit report (PDF format)
```

---

## GSC Data (Live + CSV Fallback)

SeoFlow reads **live GSC data** via Google ADC, falls back to CSV exports in `gsc_data/`.

**One-time ADC setup:**
```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/webmasters.readonly
```

- CSV auto-detects English (`Page, Clicks, Impressions...`) and German (`Häufigste Seiten, Klicks...`)
- Set `GSC_SITE_URL=sc-domain:yourdomain.com` in `.env.local` for domain properties
- Config: `gscDays` (default 28, auto-adds 3-day GSC lag)

---

## Content Format Support

| Value | Description |
|-------|-------------|
| `mdx` | YAML frontmatter + MDX body (Next.js, Astro) — **default** |
| `markdown` | YAML frontmatter + plain Markdown (Hugo, Jekyll, 11ty) |
| `wordpress` | Reserved for future REST API adapter |

Set in `seoflow.config.json`:
```json
{ "contentFormat": "markdown" }
```

---

## Voice & Domain — Make It Yours

### Single voice sample (all content types)
```json
{ "writingSample": "I've tested this for months. Here's what actually works: specific prices, real transit times, no fluff." }
```

### Per-type voice samples (recommended)
```json
{
  "writingSamples": {
    "guide": "Your destination guide voice...",
    "review": "Your review voice...",
    "itinerary": "Your itinerary voice...",
    "default": "Fallback voice..."
  }
}
```

### Domain context for AI prompts
```json
{
  "contentDomain": "food blog",
  "defaultCategory": "recipes",
  "imageSearchFallback": "food"
}
```

---

## AI Cost Guardrails

Prevent runaway costs on bulk runs:

```json
{
  "aiLimits": {
    "maxCallsPerRun": 50,
    "maxCallsPerPost": 3,
    "enabledSteps": ["keywords", "content", "review"]
  }
}
```

Pipeline prints an estimate:
```
AI budget: max 50 calls/run (~16 posts with AI, 3 calls each)
```

---

## Non-Travel Sites — Zero Code Changes

Just configure `seoflow.config.json`:

```json
{
  "publishPriority": [
    { "pattern": "review",  "score": 100 },
    { "pattern": "how-to",  "score": 80 },
    { "pattern": "guide",   "score": 60 }
  ],
  "imageSearchFallback": "tech",
  "defaultCategory": "engineering",
  "contentDomain": "developer blog",
  "contentTypes": {
    "tutorial": {
      "schema": "HowTo",
      "instructions": "Write a step-by-step tutorial with prerequisites, code samples, and troubleshooting."
    },
    "comparison": {
      "schema": "Article",
      "instructions": "Compare options in a table. Include pricing, pros/cons, and a verdict."
    }
  }
}
```

Built-in travel types (`guide`, `itinerary`, `things-to-do`, `city-pass-review`, `article`) are defaults — override or extend.

---

## Learning Data Portability

The self-learning system stores data locally in `.seoflow/data/`. Share across machines/team:

```bash
# Export from machine A
seoflow learning export team-learning.json

# Import on machine B
seoflow learning import team-learning.json
```

Files (`learning.json`, `gsc-baselines.json`) are gitignored by default. Use export/import to sync.

---

## Testing

```bash
npm run seoflow:test          # All tests (unit + integration)
npm run seoflow:test:unit     # Unit tests only (no file I/O)
```

Covers:
- `mdx-parser.ts` — parse/build roundtrip, word/image/link counting, H2 extraction
- `gsc-parser.ts` — English/German CSV detection, CTR normalisation, `blogPrefix` stripping
- `learning.ts` — step recording, GSC delta tracking, predictive scoring
- Integration — fixture MDX mutation safety, link injection idempotency

---

## Architecture — What Belongs Where

| In **SeoFlow** (this package) | In **Your Site** (site-specific) |
|-------------------------------|----------------------------------|
| GSC live data via ADC (or CSV fallback) | `seoflow.config.json` |
| MDX/Markdown frontmatter + body analysis | `.env.local` secrets |
| SEO priority scoring (GSC + learning) | Site-specific writing sample & author context |
| Internal link injection from triggers | Internal tool/link/booking triggers |
| Image enrichment (Pexels/Unsplash) | Content type defaults |
| AI content review & generation | Publishing branch, base URL, git identity |
| Fact-check & manual-review flags | |
| Audit logs, learning data, dry-run | |
| Optional publish workflow | |

---

## Requirements

- Node 18+
- `GEMINI_API_KEY` or `OPENROUTER_API_KEY` (at least one)
- Optional: `SEMRUSH_API_KEY` (for keyword research)
- Optional: `NEURONWRITER_API_KEY`, `NEURONWRITER_PROJECT_ID`
- Optional: `PEXELS_API_KEY` or `UNSPLASH_API_KEY`
- Optional: Ubersuggest MCP (for keyword research)

---

## Contributing

PRs welcome. Run tests before submitting:

```bash
npm test
```

---

## License

MIT — free for personal and commercial use.

---

## Star / Share

If SeoFlow helps you ship better SEO content, ⭐ the repo and share it:

> **SeoFlow** — AI SEO pipeline that lives in your repo, not a SaaS dashboard. `npx seoflow init` → audit → learn → grow. Works with any stack. https://github.com/imsankz/seoflow