#!/bin/bash
# SeoFlow — Interactive Installer
# Run: bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)

set -e

echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║        SeoFlow — Pipeline Installer       ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""

# ── Download pipeline ──────────────────────────────────────────────────────────
echo "📦 Downloading SeoFlow pipeline..."
mkdir -p .seoflow/lib .seoflow/pipeline .seoflow/data

BASE="https://raw.githubusercontent.com/imsankz/seoflow/main"

for f in README.md lib/types.ts lib/config.ts lib/env-loader.ts lib/mdx-parser.ts lib/gsc-parser.ts lib/gsc-client.ts lib/gemini-client.ts lib/openrouter-client.ts lib/ai-provider.ts lib/pexels-client.ts lib/neuronwriter.ts lib/audit-log.ts lib/ubersuggest-client.ts lib/learning.ts lib/generator.ts lib/publisher.ts lib/validator.ts pipeline/steps.ts run.ts install.sh update.sh; do
  curl -sSL "$BASE/$f" -o ".seoflow/$f" &
done
wait
echo "   ✅ Pipeline downloaded"

# ── Interactive config ─────────────────────────────────────────────────────────
if [ ! -f "seoflow.config.json" ]; then
  echo ""
  echo "📝 Let's set up seoflow.config.json"
  echo "   (Press Enter to accept defaults)"
  echo ""

  read -p "   Site name (e.g. Chasing Whereabouts): " SITE_NAME
  SITE_NAME="${SITE_NAME:-My Travel Site}"

  read -p "   Site URL (e.g. chasingwhereabouts.com): " SITE_URL
  SITE_URL="${SITE_URL:-example.com}"

  read -p "   Author name: " AUTHOR
  AUTHOR="${AUTHOR:-Author}"

  read -p "   Author location (e.g. Frankfurt, Germany): " AUTHOR_LOC
  AUTHOR_LOC="${AUTHOR_LOC:-Your City}"

  read -p "   Posts directory (default: src/content/posts): " POSTS_DIR
  POSTS_DIR="${POSTS_DIR:-src/content/posts}"

  read -p "   Blog URL prefix (default: /blog/): " BLOG_PREFIX
  BLOG_PREFIX="${BLOG_PREFIX:-/blog/}"

  read -p "   Git branch for publishing (default: main): " GIT_BRANCH
  GIT_BRANCH="${GIT_BRANCH:-main}"

  read -p "   Git email for commits (default: noreply@seoflow.dev): " GIT_EMAIL
  GIT_EMAIL="${GIT_EMAIL:-noreply@seoflow.dev}"

  cat > seoflow.config.json << CONFIGEOF
{
  "siteName": "${SITE_NAME}",
  "siteUrl": "${SITE_URL}",
  "author": "${AUTHOR}",
  "authorLocation": "${AUTHOR_LOC}",
  "writingSample": "I've been visiting this place for years and here's what I've found. Short, punchy sentences. Specific prices and transit times. No fluff.",
  "postsDir": "${POSTS_DIR}",
  "blogPrefix": "${BLOG_PREFIX}",
  "gscDays": 28,
  "gscPagesCsv": "gsc_data/Seiten.csv",
  "gscQueriesCsv": "gsc_data/Suchanfragen.csv",
  "auditLogPath": ".seoflow/data/audit-log.json",
  "keywordCachePath": ".seoflow/data/keyword-cache.json",
  "destinationPattern": "/destinations/{country}",
  "tools": [
    { "keywords": ["budget", "cost", "how much", "cheap", "per day", "price"], "path": "/tools/budget-calculator", "anchor": "budget calculator" },
    { "keywords": ["itinerary", "day by day", "trip plan"], "path": "/tools/itinerary-planner", "anchor": "itinerary planner" }
  ],
  "bookings": [],
  "generation": {
    "defaultSchema": "TravelGuide",
    "defaultCategory": "travel",
    "wordCountMin": 1500,
    "wordCountMax": 2500
  },
  "publishing": {
    "gitEmail": "${GIT_EMAIL}",
    "gitName": "${SITE_NAME} Publisher",
    "branch": "${GIT_BRANCH}",
    "baseUrl": "https://${SITE_URL}",
    "majorCities": []
  }
}
CONFIGEOF

  echo "   ✅ seoflow.config.json created"
else
  echo "   ✓ seoflow.config.json already exists"
fi

# ── .env.example ───────────────────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  cat > .env.example << EXAMPLEEOF
# AI Providers (at least one required)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
AI_PROVIDER=gemini

# SEO Data
NEURONWRITER_API_KEY=
NEURONWRITER_PROJECT_ID=

# Images (optional)
PEXELS_API_KEY=
UNSPLASH_API_KEY=
EXAMPLEEOF
  echo "   ✅ .env.example created — copy to .env.local and add your keys"
fi

# ── npm scripts ───────────────────────────────────────────────────────────────
if [ -f "package.json" ]; then
  if ! npm ls tsx >/dev/null 2>&1; then
    npm install --save-dev tsx
    echo "   ✅ Installed tsx dev dependency"
  fi

  if ! grep -q "seoflow" package.json 2>/dev/null; then
    node -e "
      const pkg = require('./package.json');
      pkg.scripts = {
        ...pkg.scripts,
        'seoflow': 'tsx .seoflow/run.ts',
        'seoflow:dry': 'tsx .seoflow/run.ts --dry-run',
        'seoflow:generate': 'tsx .seoflow/run.ts --mode generate',
        'seoflow:publish': 'tsx .seoflow/run.ts --mode publish',
      };
      require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "   ✅ Added seoflow scripts to package.json"
  else
    echo "   ✓ seoflow scripts already in package.json"
  fi
fi

# ── Gitignore ──────────────────────────────────────────────────────────────────
if [ -f ".gitignore" ]; then
  if ! grep -q ".seoflow/data/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# SeoFlow generated data" >> .gitignore
    echo ".seoflow/data/" >> .gitignore
    echo "   ✅ Added .seoflow/data/ to .gitignore"
  fi
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║         SeoFlow Installed! 🎉             ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""
echo "   Next steps:"
echo "   1. Set up live GSC data (recommended):"
echo "        gcloud auth application-default login \\"
echo "          --scopes=https://www.googleapis.com/auth/webmasters.readonly"
echo "   2. Add API keys to .env.local"
echo "   3. Edit seoflow.config.json for your site's tools and triggers"
echo "   4. Run: npm run seoflow:dry"
echo "   5. Generate content: npm run seoflow:generate"
echo "   6. Publish: npm run seoflow:publish -- --go"
echo ""
