import { createSandbox, saveSnapshot } from "@remotion/vercel";

const sandbox = await createSandbox({
  bundleDir: ".remotion",
  onProgress: ({ progress, message }) => {
    const pct = Math.round(progress * 100);
    console.log(`[create-snapshot] ${message} (${pct}%)`);
  },
});

console.log("[create-snapshot] Taking snapshot...");
const { snapshotId } = await saveSnapshot({ sandbox });

console.log(`[create-snapshot] Snapshot saved: ${snapshotId} (never expires)`);
