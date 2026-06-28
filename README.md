# SeoFlow

Multi-site SEO pipeline for travel content sites. Automates keyword research, content optimization, internal linking, image injection, fact-checking, and SEO auditing.

## Quick Start

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

Edit `seoflow.config.json` and add API keys to `.env.local`.

## Usage

```bash
npm run seo:audit       # Full pipeline
npm run seo:keywords    # Ubersuggest keyword research
npm run seo:links       # Internal links
npm run seo:images      # Image injection
npm run seo:neuron      # NeuronWriter NLP
npm run seo:content     # AI content audit
npm run seo:review      # Claude SEO review
npm run seo:factcheck   # Price verification
npm run seo:audit:dry   # Preview without writing
```

## Pipeline

| Step | Mode | What it does |
|------|------|-------------|
| 0 | keywords | Ubersuggest keyword research |
| 1 | meta | Fix frontmatter (schema, desc, keyword) |
| 2 | links | Inject contextual internal links |
| 3 | images | Pexels/Unsplash images |
| 4 | neuron | NeuronWriter NLP analysis |
| 5 | content | Gemini: FAQ, thin expansion, NLP |
| 6 | review | Claude SEO review + auto-fixes |
| 7 | factcheck | Price verification |

## Sites

- [Chasing Whereabouts](https://chasingwhereabouts.com)
