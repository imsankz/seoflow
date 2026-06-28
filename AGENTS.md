# SeoFlow — Agent Guide

`.seoflow/run.ts` is the CLI entry point. It reads `seoflow.config.json` from the project root, loads `.env.local`, and runs the pipeline steps.

## Adding a New Site

1. Run `bash .seoflow/install.sh`
2. Edit `seoflow.config.json`
3. Add API keys to `.env.local`
4. Run `npm run seo:audit:dry`

## Structure

```
.seoflow/
  run.ts              # CLI entry point
  lib/                # Shared utilities
    config.ts         # Site config loader
    types.ts          # Shared interfaces
    env-loader.ts     # .env.local parser
    mdx-parser.ts     # MDX parsing
    gsc-parser.ts     # GSC CSV parser
    gemini-client.ts  # Gemini client
    openrouter-client.ts  # OpenRouter client
    ai-provider.ts    # Unified AI (Gemini + OpenRouter fallback)
    pexels-client.ts  # Image search
    neuronwriter.ts   # NeuronWriter client
    audit-log.ts      # Audit log
    ubersuggest-client.ts  # Keyword research
  pipeline/
    steps.ts          # Pipeline steps
  install.sh          # Setup
  update.sh           # Update
```

## Ubersuggest MCP

The keyword research step uses OAuth MCP. Run the command in your Claude Code session and save results to `data/keyword-research-cache.json`.
