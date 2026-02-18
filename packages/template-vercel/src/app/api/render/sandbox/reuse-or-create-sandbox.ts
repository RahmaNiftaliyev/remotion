import { Sandbox } from "@vercel/sandbox";
import { createDisposableSandbox, OnProgressFn } from "../helpers";
import { createSandbox } from "./create-sandbox";
import { getCachedSnapshot } from "./snapshots";

const TIMEOUT = 5 * 60 * 1000;

export async function reuseOrCreateSandbox(
  onProgress: OnProgressFn,
): Promise<Sandbox & AsyncDisposable> {
  await onProgress({
    type: "phase",
    phase: "Creating sandbox...",
    progress: 0,
  });

  // In production, the snapshot is created at build time via `create-snapshot`
  const cachedSnapshotId = await getCachedSnapshot();

  if (cachedSnapshotId) {
    try {
      return await createDisposableSandbox({
        source: { type: "snapshot", snapshotId: cachedSnapshotId },
        timeout: TIMEOUT,
      });
    } catch {
      if (process.env.VERCEL) {
        throw new Error("Failed to create sandbox from snapshot");
      }

      // In development, fall through to full setup
    }
  } else if (process.env.VERCEL) {
    throw new Error(
      "No sandbox snapshot found. Run `bun run create-snapshot` first.",
    );
  }

  // Local development: create sandbox from scratch (no snapshotting)
  return await createSandbox({ onProgress });
}
