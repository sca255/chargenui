#!/usr/bin/env bash
# ==============================================================================
# CharGen Harness - Native Desktop Client Launcher
# Runs the PySide6 / QML native desktop app, auto-connecting to the Bun engine.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=================================================="
echo "⚡ Starting CharGen Harness Desktop (PySide6 / QML)"
echo "=================================================="

# Check Python3
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 is not found. Please install python3."
    exit 1
fi

# Check PySide6
if ! python3 -c "import PySide6" &>/dev/null; then
    echo "❌ PySide6 is not found in Python 3."
    echo "   Please install it with: pip install PySide6 requests"
    exit 1
fi

echo "✓ PySide6 detected: $(python3 -c "import PySide6; print(PySide6.__version__)")"
echo "✓ Launching Native Desktop Studio..."

export QT_QUICK_CONTROLS_STYLE="${QT_QUICK_CONTROLS_STYLE:-Basic}"
python3 "$SCRIPT_DIR/app.py" "$@"
