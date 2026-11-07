#!/usr/bin/env bash
# ComfyClient launcher — starts the IPC server + QML editor.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

SOCKET="${COMFYCLIENT_SOCKET:-/tmp/comfyclient.sock}"
CONFIG="${COMFYCLIENT_CONFIG:-$SCRIPT_DIR/../data/image_prompt_queue.json}"

echo "[comfyclient] socket: $SOCKET"
echo "[comfyclient] config: $CONFIG"
python3 -m comfyclient \
  --socket "$SOCKET" \
  --config "$CONFIG" \
  --gui \
  --gui-path "$SCRIPT_DIR/qml/Main.qml"
