#!/bin/bash
# SeoFlow — Install into a project
# Usage: bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)

set -e

echo "🔍 Installing SeoFlow into $(pwd)..."

# Create .seoflow directory
mkdir -p .seoflow/lib .seoflow/pipeline

# Download pipeline code from GitHub
BASE="https://raw.githubusercontent.com/imsankz/seoflow/main"

echo "📦 Downloading pipeline..."
for f in lib/types.ts lib/config.ts lib/env-loader.ts lib/mdx-parser.ts lib/gsc-parser.ts lib/gemini-client.ts lib/openrouter-client.ts lib/ai-provider.ts lib/pexels-client.ts lib/neuronwriter.ts lib/audit-log.ts lib/ubersuggest-client.ts pipeline/steps.ts run.ts seoflow.config.template.json .env.example; do
  curl -sSL "$BASE/$f" -o ".seoflow/$f" &
done
wait

echo ""

# Create config if not exists
if [ ! -f "seoflow.config.json" ]; then
  cp .seoflow/seoflow.config.template.json seoflow.config.json
  echo "📝 Created seoflow.config.json — edit with your site details"
else
  echo "✓ seoflow.config.json already exists"
fi

# Add npm scripts
if [ -f "package.json" ]; then
  if ! grep -q "seo:audit" package.json; then
    node -e "
      const pkg = require('./package.json');
      pkg.scripts = {
        ...pkg.scripts,
        'seo:audit': 'npx tsx .seoflow/run.ts',
        'seo:audit:dry': 'npx tsx .seoflow/run.ts --dry-run',
        'seo:keywords': 'npx tsx .seoflow/run.ts --mode keywords',
        'seo:links': 'npx tsx .seoflow/run.ts --mode links',
        'seo:images': 'npx tsx .seoflow/run.ts --mode images',
        'seo:neuron': 'npx tsx .seoflow/run.ts --mode neuron',
        'seo:content': 'npx tsx .seoflow/run.ts --mode content',
        'seo:review': 'npx tsx .seoflow/run.ts --mode review',
        'seo:factcheck': 'npx tsx .seoflow/run.ts --mode factcheck',
        'seo:full': 'npx tsx .seoflow/run.ts --mode all --limit 5',
      };
      require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "✅ Added seoflow scripts to package.json"
  else
    echo "✓ seoflow scripts already in package.json"
  fi
fi

echo ""
echo "🎉 SeoFlow installed!"
echo ""
echo "Next steps:"
echo "  1. Edit seoflow.config.json with your site details"
echo "  2. Copy .seoflow/.env.example to .env.local and add API keys"
echo "  3. Run: npm run seo:audit:dry"
echo ""
