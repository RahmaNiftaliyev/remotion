#!/usr/bin/env bash
# Repro helper for GitHub issues #7065 / #7207: inspect Chrome-related processes
# immediately after a render finishes (same shell session — required to see leaks).
set -euo pipefail

cd /usr/app
export PATH="/usr/app/node_modules/.bin:${PATH}"

OUT_MP4="${OUT_MP4:-/tmp/repro-out.mp4}"
COMPOSITION_ID="${COMPOSITION_ID:-minimal}"

echo "=== Before render ==="
ps -eo pid,ppid,stat,comm | head -25

echo ""
echo "=== Running render (${COMPOSITION_ID}) → ${OUT_MP4} ==="
remotion render /usr/app/bundle "${COMPOSITION_ID}" "${OUT_MP4}" --log=verbose

echo ""
echo "=== Immediately after render (Chrome / headless / zombies) ==="
# Match issue reports: chrome-headless-shell, chrome-headless, etc.
ps -efww | grep -E 'chrome|Chrome|CHROMIUM|headless' | grep -v grep || true
pgrep -af 'chrome-headless' || echo "(pgrep: no chrome-headless)"

echo ""
echo "=== Rows with PPID 1 or zombie state (Z) ==="
ps -eo pid,ppid,stat,args | awk 'NR==1 || $2==1 || $3 ~ /^Z/ {print}'

echo ""
echo "=== Full ps (for manual inspection) ==="
ps auxww

echo ""
echo "Render output file:"
ls -la "${OUT_MP4}"
