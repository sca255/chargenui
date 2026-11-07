#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  🔮 CHARGEN HARNESS: Uncensored RP & Vision Forge"
echo "=========================================================="

if command -v bun >/dev/null 2>&1; then
    echo "Starting server with Bun..."
    bun run src/server.ts
else
    echo "Error: Bun is required to run CharGen Harness (https://bun.sh)."
    echo "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
