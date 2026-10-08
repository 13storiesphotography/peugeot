#!/usr/bin/env bash
# Extrahiert finanz-ai/ in einen Standalone-Git-Tree und pusht optional ein neues Repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EXTRACT_BRANCH="${EXTRACT_BRANCH:-cursor/kontura-standalone-aee5}"
REPO_NAME="${REPO_NAME:-kontura}"
OWNER="${OWNER:-13storiesphotography}"

cd "$ROOT"

echo "→ subtree split -P finanz-ai → $EXTRACT_BRANCH"
git fetch origin main 2>/dev/null || true
git subtree split -P finanz-ai -b "$EXTRACT_BRANCH"

echo "→ push extract branch to origin"
git push -u origin "$EXTRACT_BRANCH"

echo ""
echo "Standalone-Branch: origin/$EXTRACT_BRANCH"
echo ""
echo "Neues GitHub-Repo anlegen (lokal mit deinem Account):"
echo "  gh repo create ${OWNER}/${REPO_NAME} --public --description 'Kontura — Finanzen im Klarblick'"
echo "  git clone https://github.com/${OWNER}/${REPO_NAME}.git /tmp/${REPO_NAME}"
echo "  cd /tmp/${REPO_NAME}"
echo "  git pull https://github.com/${OWNER}/peugeot.git ${EXTRACT_BRANCH}"
echo "  git push -u origin main"
echo ""
echo "Oder mirror:"
echo "  git push https://github.com/${OWNER}/${REPO_NAME}.git ${EXTRACT_BRANCH}:main"
