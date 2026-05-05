#!/usr/bin/env bash
# Repro for #7207: force-kill the Node parent during render; chrome-headless-shell
# should survive with PPID=1 if not tied to parent lifetime.
# Run inside the repro Docker image (same deps as Dockerfile.repro-chrome-linux).
set -euo pipefail

cd /usr/app
export PATH="/usr/app/node_modules/.bin:${PATH}"

OUT_MP4="${OUT_MP4:-/tmp/repro-sigkill-out.mp4}"
COMPOSITION_ID="${COMPOSITION_ID:-minimal}"

echo "=== Spawning render in background (${COMPOSITION_ID}) ==="
remotion render /usr/app/bundle "${COMPOSITION_ID}" "${OUT_MP4}" --log=verbose &
RENDER_PID=$!

echo "Render PID: ${RENDER_PID}"
# Minimal comp (~2s @ 30fps); wait until Chrome is usually up.
sleep 2

echo "=== Sending SIGKILL to Node render parent ==="
kill -9 "${RENDER_PID}" || true

sleep 2

echo "=== chrome-headless-shell still alive? (expect orphans if bug reproduces) ==="
ps -efww | grep -E 'chrome|Chrome|headless' | grep -v grep || echo "(none)"

echo ""
echo "=== Processes with PPID 1 ==="
ps -eo pid,ppid,stat,args | awk 'NR==1 || $2==1 {print}'
