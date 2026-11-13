#!/usr/bin/env bash
# Launch CharGen Expression Forge
cd "$(dirname "$0")/.."
python3 -m expression_forge.app "$@"
