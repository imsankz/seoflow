#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEOFLOW_DIR="${ROOT_DIR}/.seoflow"

if [ -d "${SEOFLOW_DIR}" ]; then
  rm -rf "${SEOFLOW_DIR}"
  echo "Removed ${SEOFLOW_DIR}"
else
  echo "No local SeoFlow install artifacts found."
fi

echo "SeoFlow uninstall complete."
echo "If you copied agents or skills into your AI tool folders, remove those files manually if desired."
