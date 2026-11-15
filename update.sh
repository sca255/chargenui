#!/usr/bin/env bash
set -e

# ==========================================================
#   🔮 CHARGEN HARNESS: Update / Upgrade Script
# ==========================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Updating CharGen Harness to the latest version..."

# Fetch and merge latest git changes if in a git repo
if [ -d ".git" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "master")
    echo "Pulling latest changes from branch: $CURRENT_BRANCH..."
    git pull origin "$CURRENT_BRANCH"
fi

echo "Updating dependencies..."
bun install

echo "Re-generating runtime assets (modular HTML and JS bundles)..."
bun run build

echo "=========================================================="
echo "  ✨ Update complete! Launching CharGen Harness..."
echo "=========================================================="
exec ./start.sh
