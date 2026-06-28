#!/usr/bin/env bash
# SeoFlow — Update
# Re-downloads pipeline files, agents, skills, and Python scripts,
# then re-syncs agents to all detected AI tools.
#
# Usage: bash .seoflow/update.sh

set -e

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         SeoFlow — Updater                    ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# Re-run installer in non-interactive mode (skips config prompts since
# seoflow.config.json already exists)
bash "$(dirname "$0")/install.sh" --sync-agents

echo "  ✅ SeoFlow updated"
echo ""
