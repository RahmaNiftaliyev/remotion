import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

export function ensureLocalBundle(bundleDir: string): void {
  const fullBundleDir = path.join(process.cwd(), bundleDir);
  if (!existsSync(fullBundleDir)) {
    try {
      execSync(`node_modules/.bin/remotion bundle --out-dir ./${bundleDir}`, {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString() ?? "";
      throw new Error(`Remotion bundle failed: ${stderr}`);
    }
  }
}

export type RenderProgress =
  | { type: "phase"; phase: string; progress: number; subtitle?: string }
  | { type: "done"; url: string; size: number }
  | { type: "error"; message: string };

export type OnProgressFn = (message: RenderProgress) => Promise<void>;

export function formatSSE(message: RenderProgress): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}
