#!/usr/bin/env bash
# One-shot bridge restart for god-persist landings. Host only.
set -euo pipefail
if systemctl --user restart skiff-bridge 2>/dev/null; then
  systemctl --user is-active skiff-bridge
elif [[ -x "$HOME/bin/skiff-bridge" ]]; then
  "$HOME/bin/skiff-bridge" restart || "$HOME/bin/skiff-bridge"
else
  pkill -f 'mcp/bridge.mjs' 2>/dev/null || true
  sleep 1
  cd "$HOME/sites/skiff-run"
  nohup node mcp/bridge.mjs >/tmp/skiff-bridge.log 2>&1 &
  echo "started pid $!"
fi
curl -sS -m 3 http://127.0.0.1:8787/api/state | head -c 200 || true
echo
