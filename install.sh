#!/usr/bin/env bash
set -e

# ==========================================================
#   🔮 CHARGEN HARNESS: Install / Setup Script
# ==========================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Checking environment prerequisites..."

if ! command -v bun >/dev/null 2>&1; then
    echo "❌ Bun is not installed."
    echo "Installing Bun via official installer..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

echo "✅ Bun version: $(bun --version)"

echo "Installing project dependencies..."
bun install

echo "Building runtime-generated assets (index.html & JS bundle)..."
bun run build

# Ensure local data directory structure exists
mkdir -p data/cards data/exports data/cache

echo "=========================================================="
echo "  ✨ CharGen Harness installation complete!"
echo "  Run './start.sh' or 'bun run start' to launch the app."
echo "=========================================================="
