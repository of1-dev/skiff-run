#!/usr/bin/env bash
# Headless Chromium Chart shots via Podman Playwright image.
# Stay in ~/sites/skiff-run. Output: tmp/chart-{local,sector,full}.png
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.55.1-noble}"
cd "$ROOT"
mkdir -p tmp

if ! podman image exists "$IMAGE"; then
  echo "pulling $IMAGE (first run)"
  podman pull "$IMAGE"
fi

podman run --rm --network=host --ipc=host \
  -v "$ROOT:/work:Z" \
  -w /work \
  -e HOME=/tmp \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -e SKIFF_SHOT_URL="${SKIFF_SHOT_URL:-https://of1-dev.github.io/skiff-run/}" \
  "$IMAGE" \
  bash -lc 'mkdir -p /tmp/shot && cd /tmp/shot && npm install --no-save playwright-core@1.55.1 >/tmp/pw-install.log && cp /work/scripts/chart-shots.mjs . && SKIFF_SHOT_DIR=/work/tmp node chart-shots.mjs'
echo "shots in $ROOT/tmp/"
