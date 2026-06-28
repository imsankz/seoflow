#!/bin/bash
# SeoFlow — Update pipeline to latest version

set -e

echo "🔄 Updating SeoFlow..."

if [ ! -d ".seoflow" ]; then
  echo "❌ No .seoflow directory found. Run install.sh first."
  exit 1
fi

BASE="https://raw.githubusercontent.com/imsankz/seoflow/main"

echo "📦 Downloading latest pipeline..."
for f in README.md lib/types.ts lib/config.ts lib/env-loader.ts lib/mdx-parser.ts lib/gsc-parser.ts lib/gsc-client.ts lib/gemini-client.ts lib/openrouter-client.ts lib/ai-provider.ts lib/pexels-client.ts lib/neuronwriter.ts lib/audit-log.ts lib/ubersuggest-client.ts lib/learning.ts lib/generator.ts lib/publisher.ts lib/validator.ts pipeline/steps.ts run.ts install.sh update.sh; do
  curl -sSL "$BASE/$f" -o ".seoflow/$f"
  echo "  ✓ $f"
done

echo ""
echo "✅ SeoFlow updated to latest version"
echo ""
