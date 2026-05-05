#!/usr/bin/env bash
# Prepare tarballs + bundle (same as run.sh front matter), then build the repro image.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${SCRIPT_DIR}"

echo "== Workspace build (ensure-browser bundle + bundle CLI need compiled packages) =="
cd "${REPO_ROOT}"
# CLI pulls bundler/example deps; renderer/core needed for ensure-browser.mjs bundle.
bunx turbo run make --filter=@remotion/cli --filter=remotion --filter=@remotion/renderer --no-update-notifier
cd "${SCRIPT_DIR}"

echo "== Building browser downloader + ensure-browser.mjs =="
cd ../renderer
bun build-browser-downloader.ts
cp ensure-browser.mjs ../dockerfiles/ensure-browser.mjs
cd ../dockerfiles

echo "== Packing local @remotion/cli =="
bun pack-cli.ts

echo "== Building minimal repro bundle (packages/docker-repro-minimal) =="
cd ../docker-repro-minimal
bunx remotion bundle src/index.ts --out-dir ../dockerfiles/bundle
cd ../dockerfiles

PLATFORM_FLAG=()
if [[ "${BUILD_PLATFORM:-}" != "" ]]; then
  PLATFORM_FLAG=(--platform "${BUILD_PLATFORM}")
fi

echo "== docker build Dockerfile.repro-chrome-linux =="
docker build "${PLATFORM_FLAG[@]}" --file Dockerfile.repro-chrome-linux -t remotion-repro-chrome-linux .

echo ""
echo "Done. Run (add --init if you want PID 1 to reap zombies like a real init):"
echo "  docker run --rm --init remotion-repro-chrome-linux"
echo ""
echo "Optional (#7207-style kill parent):"
echo "  docker run --rm --init --entrypoint /usr/app/repro-sigkill-parent.sh remotion-repro-chrome-linux"
