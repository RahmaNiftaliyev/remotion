export const createDisposableWriter = (
  writer: WritableStreamDefaultWriter<Uint8Array>,
): WritableStreamDefaultWriter<Uint8Array> & AsyncDisposable => {
  return Object.assign(writer, {
    [Symbol.asyncDispose]: async () => {
      await writer.close();
    },
  });
};

export type RenderProgress =
  | { type: "phase"; phase: string; progress: number; subtitle?: string }
  | { type: "done"; url: string; size: number }
  | { type: "error"; message: string };

export type OnProgressFn = (message: RenderProgress) => Promise<void>;

export function formatSSE(message: RenderProgress): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}
