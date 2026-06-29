#!/usr/bin/env bash
# SeoFlow — Smart Installer
# Installs the pipeline + SEO agents/skills for every detected AI coding tool.
#
# Run: bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
#
# Detected tools: Kiro, Claude Code, Cursor, GitHub Copilot, Windsurf,
#                 OpenCode, Codex, Cline, Qwen/Lingma, Zed

set -e

REPO="https://raw.githubusercontent.com/imsankz/seoflow/main"
SEOFLOW_DIR=".seoflow"

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         SeoFlow — Smart Installer            ║"
echo "  ║  Pipeline + SEO Agents for every AI tool     ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo "  ✦  $*"; }
success() { echo "  ✅ $*"; }
skip()    { echo "  ○  $*"; }
warn()    { echo "  ⚠️  $*"; }

dir_exists() { [ -d "$1" ]; }
file_exists() { [ -f "$1" ]; }
home_dir_exists() { [ -d "$HOME/$1" ]; }


# ─── Step 1: Download pipeline into .seoflow/ ─────────────────────────────────
echo "📦 Downloading SeoFlow pipeline..."
mkdir -p \
  "$SEOFLOW_DIR/lib/technical" \
  "$SEOFLOW_DIR/lib/content-quality" \
  "$SEOFLOW_DIR/lib/reports" \
  "$SEOFLOW_DIR/lib/drift" \
  "$SEOFLOW_DIR/lib/backlinks" \
  "$SEOFLOW_DIR/lib/python" \
  "$SEOFLOW_DIR/lib/cli" \
  "$SEOFLOW_DIR/pipeline" \
  "$SEOFLOW_DIR/scripts" \
  "$SEOFLOW_DIR/agents" \
  "$SEOFLOW_DIR/skills" \
  "$SEOFLOW_DIR/data"

# Core pipeline files
PIPELINE_FILES=(
  "run.ts"
  "lib/types.ts" "lib/config.ts" "lib/env-loader.ts" "lib/mdx-parser.ts"
  "lib/gsc-parser.ts" "lib/gsc-client.ts" "lib/gemini-client.ts"
  "lib/openrouter-client.ts" "lib/ai-provider.ts" "lib/pexels-client.ts"
  "lib/neuronwriter.ts" "lib/audit-log.ts" "lib/ubersuggest-client.ts"
  "lib/learning.ts" "lib/generator.ts" "lib/publisher.ts"
  "lib/validator.ts" "lib/schema.ts" "lib/cluster.ts" "lib/content-brief.ts"
  "lib/technical/psi.ts" "lib/content-quality/content-quality.ts"
  "lib/reports/reports.ts" "lib/reports/pdf-generator.ts"
  "lib/drift/drift.ts" "lib/backlinks/backlinks.ts"
  "lib/python/python-manager.ts"
  "pipeline/steps.ts" "pipeline/technical.ts"
  "pipeline/content-quality.ts" "pipeline/report-export.ts"
  "update.sh"
)

for f in "${PIPELINE_FILES[@]}"; do
  dest_dir="$SEOFLOW_DIR/$(dirname "$f")"
  mkdir -p "$dest_dir"
  curl -sSfL "$REPO/$f" -o "$SEOFLOW_DIR/$f" 2>/dev/null || warn "Could not fetch $f (skipping)"
done
success "Pipeline downloaded"


# ─── Step 2: Download agents ───────────────────────────────────────────────────
echo "🤖 Downloading SEO agents..."

AGENTS=(
  "seo-technical" "seo-content" "seo-schema" "seo-sitemap"
  "seo-performance" "seo-visual" "seo-geo" "seo-local"
  "seo-maps" "seo-google" "seo-backlinks" "seo-dataforseo"
  "seo-image-gen" "seo-cluster" "seo-sxo" "seo-drift"
  "seo-ecommerce" "seo-flow"
)

for agent in "${AGENTS[@]}"; do
  curl -sSfL "$REPO/.claude/seoflow/agents/${agent}.md" \
    -o "$SEOFLOW_DIR/agents/${agent}.md" 2>/dev/null \
    || warn "Could not fetch agent ${agent}"
done
success "Agents downloaded (${#AGENTS[@]} agents)"

# ─── Step 3: Download skills ───────────────────────────────────────────────────
echo "🧠 Downloading SEO skills..."

SKILLS=(
  "seo" "seo-audit" "seo-page" "seo-technical" "seo-content"
  "seo-schema" "seo-sitemap" "seo-images" "seo-geo" "seo-local"
  "seo-maps" "seo-plan" "seo-programmatic" "seo-competitor-pages"
  "seo-hreflang" "seo-google" "seo-backlinks" "seo-cluster"
  "seo-sxo" "seo-drift" "seo-ecommerce" "seo-dataforseo"
  "seo-image-gen" "seo-flow" "seo-content-brief"
)

for skill in "${SKILLS[@]}"; do
  mkdir -p "$SEOFLOW_DIR/skills/$skill"
  curl -sSfL "$REPO/.claude/seoflow/skills/${skill}/SKILL.md" \
    -o "$SEOFLOW_DIR/skills/$skill/SKILL.md" 2>/dev/null \
    || warn "Could not fetch skill ${skill}/SKILL.md"
done
success "Skills downloaded (${#SKILLS[@]} skills)"


# ─── Step 4: Download Python scripts ──────────────────────────────────────────
echo "🐍 Downloading Python scripts..."

PYTHON_SCRIPTS=(
  "render_page" "parse_html" "url_safety" "fetch_page"
  "google_auth" "pagespeed_check" "crux_history" "lcp_subparts"
  "gsc_query" "gsc_inspect" "ga4_report" "indexing_notify"
  "google_report" "nlp_analyze" "keyword_planner" "youtube_search"
  "backlinks_auth" "moz_api" "bing_webmaster" "commoncrawl_graph"
  "verify_backlinks" "validate_backlink_report"
  "content_quality" "content_humanize" "content_verify"
  "schema_generate" "schema_ecommerce_validate"
  "drift_baseline" "drift_compare" "drift_history" "drift_report"
  "dataforseo_costs" "dataforseo_merchant" "dataforseo_normalize"
  "capture_screenshot" "analyze_visual"
  "gbp_deprecation_lint" "domain_history" "parasite_risk"
  "iptc_ai_label" "seo_updates" "indexnow_submit"
  "agent_ux_check" "preload_check" "ucp_check"
  "sync_flow" "portability_check" "unlighthouse_run"
)

for script in "${PYTHON_SCRIPTS[@]}"; do
  curl -sSfL "$REPO/python/${script}.py" \
    -o "$SEOFLOW_DIR/scripts/${script}.py" 2>/dev/null \
    || warn "Could not fetch ${script}.py"
done

# requirements.txt
curl -sSfL "$REPO/python/requirements.txt" \
  -o "$SEOFLOW_DIR/scripts/requirements.txt" 2>/dev/null \
  || warn "Could not fetch requirements.txt"

success "Python scripts downloaded (${#PYTHON_SCRIPTS[@]} scripts)"


# ─── Step 5: Rewrite script paths in agents ───────────────────────────────────
# Agents from seoflow reference `scripts/` (relative to their install root).
# After SeoFlow install they live at `.seoflow/agents/` and scripts at `.seoflow/scripts/`.
# We rewrite all path references so agents work regardless of the tool they're
# copied into.
echo "🔧 Patching agent script paths..."

SEOFLOW_SCRIPTS_PATH=".seoflow/scripts"

for agent_file in "$SEOFLOW_DIR/agents/"*.md; do
  # Replace `scripts/` → `.seoflow/scripts/` (avoiding double-patching)
  sed -i.bak \
    -e "s|python3 scripts/|python3 $SEOFLOW_SCRIPTS_PATH/|g" \
    -e "s|python scripts/|python $SEOFLOW_SCRIPTS_PATH/|g" \
    "$agent_file"
  rm -f "${agent_file}.bak"
done

# Same for skill SKILL.md files
for skill_file in "$SEOFLOW_DIR/skills/"*/SKILL.md; do
  sed -i.bak \
    -e "s|python3 scripts/|python3 $SEOFLOW_SCRIPTS_PATH/|g" \
    -e "s|python scripts/|python $SEOFLOW_SCRIPTS_PATH/|g" \
    "$skill_file"
  rm -f "${skill_file}.bak"
done

success "Script paths patched"

# ─── Step 6: Detect AI coding tools ───────────────────────────────────────────
echo ""
echo "🔍 Detecting AI coding tools..."

DETECTED_TOOLS=()
PROJECT_ROOT="$(pwd)"
HOME_DIR="$HOME"

detect_tool() {
  local name="$1"; shift
  local found=false
  for signal in "$@"; do
    # Check relative to project root and home dir
    if dir_exists "$signal" || file_exists "$signal" || \
       dir_exists "$HOME_DIR/$signal" || file_exists "$HOME_DIR/$signal"; then
      found=true; break
    fi
  done
  if $found; then
    DETECTED_TOOLS+=("$name")
    info "Detected: $name"
  fi
}

# Kiro (AWS)
detect_tool "kiro" ".kiro" ".kiro/settings"

# Claude Code (Anthropic)
detect_tool "claude" ".claude" ".claude/CLAUDE.md" ".claude/settings.json"

# Cursor
detect_tool "cursor" ".cursor" ".cursor/rules" ".cursorrules"

# GitHub Copilot / VS Code
detect_tool "github-copilot" ".github/copilot-instructions.md" ".vscode/settings.json" ".github"

# Windsurf (Codeium)
detect_tool "windsurf" ".windsurf" ".codeium"

# OpenCode
detect_tool "opencode" ".opencode" "opencode.json"

# Codex (OpenAI)
detect_tool "codex" ".codex" "$HOME_DIR/.codex"

# Cline (VS Code extension)
detect_tool "cline" ".cline" ".clinerules"

# Qwen / Tongyi Lingma
detect_tool "lingma" ".lingma" ".tongyi"

# Zed AI
detect_tool "zed" ".zed" "$HOME_DIR/.config/zed"

# Amp (Sourcegraph)
detect_tool "amp" ".amp" "amp.json"

if [ ${#DETECTED_TOOLS[@]} -eq 0 ]; then
  warn "No AI coding tools detected — agents will only be in .seoflow/agents/"
  warn "You can manually copy them later using: bash .seoflow/install.sh --sync-agents"
fi


# ─── Step 7: Deploy agents to detected tools ──────────────────────────────────
echo ""
echo "📂 Deploying agents to detected tools..."

# Tool deployment configuration
# Format: tool_name|agent_dest|skill_dest|extra_setup_fn
deploy_agents() {
  local tool="$1"
  local agent_dest="$2"
  local skill_dest="$3"

  mkdir -p "$agent_dest"
  cp "$SEOFLOW_DIR/agents/"*.md "$agent_dest/" 2>/dev/null
  success "$tool → agents copied to $agent_dest/"

  if [ -n "$skill_dest" ]; then
    mkdir -p "$skill_dest"
    cp -r "$SEOFLOW_DIR/skills/"* "$skill_dest/" 2>/dev/null
    success "$tool → skills copied to $skill_dest/"
  fi
}

for tool in "${DETECTED_TOOLS[@]}"; do
  case "$tool" in

    kiro)
      # Kiro uses .kiro/agents/ for sub-agents
      deploy_agents "Kiro" ".kiro/agents" ""
      # Also write a steering file so Kiro knows about the pipeline
      mkdir -p ".kiro/steering"
      cat > ".kiro/steering/seoflow.md" << 'STEEREOF'
---
inclusion: auto
---
# SeoFlow SEO Pipeline

This project has SeoFlow installed at `.seoflow/`. It provides:
- **Pipeline**: `npm run seoflow audit` — automated content audit and improvement
- **SEO Agents**: Available in `.kiro/agents/` for interactive analysis

## Running the pipeline
```bash
npm run seoflow audit          # audit top 10 posts
npm run seoflow audit <slug>   # audit one post
npm run seoflow status         # check pipeline state
npm run seoflow:dry            # preview without writing
```

## Using SEO agents
Agents are pre-configured for this site via `seoflow.config.json`.
Scripts live at `.seoflow/scripts/`. Call agents by name: `/seo audit`, `/seo technical <url>`, etc.
STEEREOF
      success "Kiro → steering file written to .kiro/steering/seoflow.md"
      ;;

    claude)
      # Claude Code uses .claude/agents/ (v2) or skills/ at repo root
      deploy_agents "Claude Code" ".claude/agents" ".claude/skills"
      # Write CLAUDE.md context if not present
      if ! file_exists ".claude/CLAUDE.md"; then
        mkdir -p ".claude"
        cat > ".claude/CLAUDE.md" << 'CLAUDEEOF'
# SeoFlow SEO Pipeline

SeoFlow is installed at `.seoflow/`. Pipeline CLI: `tsx .seoflow/run.ts`.
SEO agents are in `.claude/agents/`. Skills are in `.claude/skills/`.
Scripts are at `.seoflow/scripts/`. Config: `seoflow.config.json`.
CLAUDEEOF
        success "Claude Code → .claude/CLAUDE.md written"
      fi
      ;;

    cursor)
      # Cursor uses .cursor/rules/ for agent rules
      deploy_agents "Cursor" ".cursor/agents" ""
      # Also write .cursorrules summary
      if ! file_exists ".cursorrules"; then
        echo "# SeoFlow SEO Pipeline installed. Agents in .cursor/agents/. Scripts at .seoflow/scripts/." > .cursorrules
        success "Cursor → .cursorrules written"
      fi
      ;;

    github-copilot)
      # GitHub Copilot uses .github/agents/ (Copilot coding agents)
      deploy_agents "GitHub Copilot" ".github/agents" ""
      # Append to copilot-instructions.md
      mkdir -p ".github"
      if ! grep -q "SeoFlow" ".github/copilot-instructions.md" 2>/dev/null; then
        cat >> ".github/copilot-instructions.md" << 'GHEOF'

## SeoFlow SEO Pipeline
SEO agents are available in `.github/agents/`. Pipeline at `.seoflow/run.ts`.
Scripts at `.seoflow/scripts/`. Config: `seoflow.config.json`.
GHEOF
        success "GitHub Copilot → .github/copilot-instructions.md updated"
      fi
      ;;

    windsurf)
      deploy_agents "Windsurf" ".windsurf/agents" ""
      ;;

    opencode)
      deploy_agents "OpenCode" ".opencode/agents" ""
      ;;

    codex)
      # Codex uses ~/.codex/ for user-level agents
      deploy_agents "Codex" "$HOME/.codex/agents" ""
      ;;

    cline)
      deploy_agents "Cline" ".cline/agents" ""
      # Cline uses .clinerules for context
      if ! grep -q "SeoFlow" ".clinerules" 2>/dev/null; then
        echo "SeoFlow SEO agents available in .cline/agents/. Scripts at .seoflow/scripts/." >> .clinerules
        success "Cline → .clinerules updated"
      fi
      ;;

    lingma)
      deploy_agents "Qwen/Lingma" ".lingma/agents" ""
      ;;

    zed)
      deploy_agents "Zed AI" ".zed/agents" ""
      ;;

    amp)
      deploy_agents "Amp" ".amp/agents" ""
      ;;

  esac
done


# ─── Step 8: Interactive site config ──────────────────────────────────────────
echo ""
if ! file_exists "seoflow.config.json"; then
  echo "📝 Let's configure your site (Enter = accept default)"
  echo ""
  read -p "   Site name (e.g. My Travel Blog): " SITE_NAME
  SITE_NAME="${SITE_NAME:-My Site}"
  read -p "   Site URL (e.g. example.com): " SITE_URL
  SITE_URL="${SITE_URL:-example.com}"
  read -p "   Author name: " AUTHOR
  AUTHOR="${AUTHOR:-Author}"
  read -p "   Author location (e.g. Berlin, Germany): " AUTHOR_LOC
  AUTHOR_LOC="${AUTHOR_LOC:-Your City}"
  read -p "   Posts directory (default: src/content/posts): " POSTS_DIR
  POSTS_DIR="${POSTS_DIR:-src/content/posts}"
  read -p "   Blog URL prefix (default: /blog/): " BLOG_PREFIX
  BLOG_PREFIX="${BLOG_PREFIX:-/blog/}"
  read -p "   Content domain (e.g. travel blog, SaaS, food blog): " CONTENT_DOMAIN
  CONTENT_DOMAIN="${CONTENT_DOMAIN:-blog}"
  read -p "   Git branch (default: main): " GIT_BRANCH
  GIT_BRANCH="${GIT_BRANCH:-main}"

  cat > seoflow.config.json << CONFIGEOF
{
  "siteName": "${SITE_NAME}",
  "siteUrl": "${SITE_URL}",
  "author": "${AUTHOR}",
  "authorLocation": "${AUTHOR_LOC}",
  "writingSample": "Short punchy sentences. Specific prices and transit times. First-person. No fluff.",
  "postsDir": "${POSTS_DIR}",
  "blogPrefix": "${BLOG_PREFIX}",
  "gscDays": 28,
  "gscPagesCsv": "gsc_data/Seiten.csv",
  "gscQueriesCsv": "gsc_data/Suchanfragen.csv",
  "auditLogPath": ".seoflow/data/audit-log.json",
  "keywordCachePath": ".seoflow/data/keyword-cache.json",
  "contentFormat": "mdx",
  "contentDomain": "${CONTENT_DOMAIN}",
  "imageSearchFallback": "lifestyle",
  "defaultCategory": "article",
  "aiLimits": { "maxCallsPerRun": 50, "maxCallsPerPost": 3 },
  "tools": [],
  "bookings": [],
  "generation": {
    "defaultSchema": "Article",
    "defaultCategory": "article",
    "wordCountMin": 1500,
    "wordCountMax": 2500
  },
  "publishing": {
    "gitEmail": "noreply@${SITE_URL}",
    "gitName": "${SITE_NAME} Publisher",
    "branch": "${GIT_BRANCH}",
    "baseUrl": "https://${SITE_URL}",
    "majorCities": []
  }
}
CONFIGEOF
  success "seoflow.config.json created"
else
  skip "seoflow.config.json already exists"
fi


# ─── Step 9: .env.local ───────────────────────────────────────────────────────
if ! file_exists ".env.local"; then
  cat > .env.example << 'EXAMPLEEOF'
# ── AI Providers (at least one required) ──────────────────────────────────────
GEMINI_API_KEY=
OPENROUTER_API_KEY=
AI_PROVIDER=gemini          # gemini | openrouter

# ── SEO Data (optional but recommended) ───────────────────────────────────────
NEURONWRITER_API_KEY=
NEURONWRITER_PROJECT_ID=

# ── Image Sources (optional) ──────────────────────────────────────────────────
PEXELS_API_KEY=
UNSPLASH_API_KEY=

# ── Google APIs (optional, for PSI / CrUX / GSC / GA4) ───────────────────────
GOOGLE_API_KEY=
# For live GSC data, run once:
#   gcloud auth application-default login \
#     --scopes=https://www.googleapis.com/auth/webmasters.readonly
GSC_SITE_URL=               # sc-domain:yourdomain.com (only needed for domain properties)

# ── Backlinks (optional) ──────────────────────────────────────────────────────
MOZ_API_KEY=
BING_WEBMASTER_API_KEY=

# ── DataForSEO (optional, for live SERP data) ─────────────────────────────────
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
EXAMPLEEOF
  success ".env.example created — copy to .env.local and fill in your keys"
fi

# ─── Step 10: npm scripts ─────────────────────────────────────────────────────
if file_exists "package.json"; then
  if ! npm ls tsx >/dev/null 2>&1; then
    npm install --save-dev tsx 2>/dev/null
    success "Installed tsx"
  fi
  if ! grep -q '"seoflow"' package.json 2>/dev/null; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
      pkg.scripts = {
        ...pkg.scripts,
        'seoflow':          'tsx .seoflow/run.ts',
        'seoflow:dry':      'tsx .seoflow/run.ts --dry-run',
        'seoflow:status':   'tsx .seoflow/run.ts status',
        'seoflow:generate': 'tsx .seoflow/run.ts generate',
        'seoflow:publish':  'tsx .seoflow/run.ts publish',
        'seoflow:cluster':  'tsx .seoflow/run.ts cluster',
        'seoflow:brief':    'tsx .seoflow/run.ts brief',
        'seoflow:learn':    'tsx .seoflow/run.ts learn',
      };
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)+'\n');
    "
    success "npm scripts added to package.json"
  else
    skip "seoflow scripts already in package.json"
  fi
fi

# ─── Step 11: .gitignore ──────────────────────────────────────────────────────
if file_exists ".gitignore"; then
  if ! grep -q ".seoflow/data" .gitignore; then
    printf '\n# SeoFlow generated data\n.seoflow/data/\n.env.local\n' >> .gitignore
    success ".gitignore updated"
  fi
fi


# ─── Step 12: Python deps check ───────────────────────────────────────────────
echo ""
echo "🐍 Checking Python dependencies..."
if command -v python3 &>/dev/null; then
  PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
  info "Python $PYTHON_VERSION detected"
  if file_exists "$SEOFLOW_DIR/scripts/requirements.txt"; then
    echo "   Run this to install optional Python deps (enables PSI, drift, reports):"
    echo "   pip3 install -r .seoflow/scripts/requirements.txt"
  fi
else
  warn "Python 3 not found — Python-powered steps (PSI, CrUX, reports) will be skipped"
  warn "Install from https://python.org or via your package manager"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         SeoFlow Installed! 🎉                ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

if [ ${#DETECTED_TOOLS[@]} -gt 0 ]; then
  echo "  🤖 Agents deployed to:"
  for tool in "${DETECTED_TOOLS[@]}"; do
    case "$tool" in
      kiro)          echo "     • Kiro       → .kiro/agents/ + .kiro/steering/seoflow.md" ;;
      claude)        echo "     • Claude Code → .claude/agents/ + .claude/skills/" ;;
      cursor)        echo "     • Cursor      → .cursor/agents/" ;;
      github-copilot)echo "     • Copilot     → .github/agents/" ;;
      windsurf)      echo "     • Windsurf    → .windsurf/agents/" ;;
      opencode)      echo "     • OpenCode    → .opencode/agents/" ;;
      codex)         echo "     • Codex       → ~/.codex/agents/" ;;
      cline)         echo "     • Cline       → .cline/agents/" ;;
      lingma)        echo "     • Lingma      → .lingma/agents/" ;;
      zed)           echo "     • Zed         → .zed/agents/" ;;
      amp)           echo "     • Amp         → .amp/agents/" ;;
    esac
  done
  echo ""
fi

echo "  📋 Next steps:"
echo "     1. Copy .env.example → .env.local and add your API keys"
echo "     2. Edit seoflow.config.json for your site"
echo "     3. Set up live GSC data (optional but recommended):"
echo "          gcloud auth application-default login \\"
echo "            --scopes=https://www.googleapis.com/auth/webmasters.readonly"
echo "     4. Run: npm run seoflow:dry"
echo ""
echo "  📖 All SEO agents available — try asking your AI tool:"
echo "     /seo audit https://yoursite.com"
echo "     /seo technical https://yoursite.com"
echo "     /seo content https://yoursite.com/blog/post"
echo ""

# ─── Re-sync flag: bash .seoflow/install.sh --sync-agents ─────────────────────
if [[ "$1" == "--sync-agents" ]]; then
  echo "  🔄 Re-sync complete"
fi

