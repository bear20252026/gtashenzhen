#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PORT="${1:-8899}"
if command -v python3 >/dev/null 2>&1; then
  exec python3 tools/serve.py "$PORT"
else
  exec node tools/serve.js "$PORT"
fi
