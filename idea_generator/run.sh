#!/usr/bin/env bash
# CharGen Idea Forge Launcher
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "✨ Launching CharGen Idea Forge..."

# Prefer Wayland/WSLg or X11 automatically
export QT_QUICK_CONTROLS_STYLE="Basic"

# Launch Python app
python3 app.py "$@"
