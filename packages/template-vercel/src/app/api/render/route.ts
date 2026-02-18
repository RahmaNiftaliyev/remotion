import {
  createSandbox,
  renderVideoOnVercel,
  restoreSnapshot,
  uploadToVercelBlob,
} from "@remotion/vercel";
import { waitUntil } from "@vercel/functions";
import { COMP_NAME } from "../../../../types/constants";
import { RenderRequest } from "../../../../types/schema";
import {
  createDisposableWriter,
  formatSSE,
  type RenderProgress,
} from "./helpers";

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (message: RenderProgress) => {
    await writer.write(encoder.encode(formatSSE(message)));
  };

  const runRender = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    await using _writer = createDisposableWriter(writer);

    try {
      const payload = await req.json();
      const body = RenderRequest.parse(payload);

      await send({ type: "phase", phase: "Creating sandbox...", progress: 0 });

      await using sandbox = process.env.VERCEL
        ? await restoreSnapshot()
        : await createSandbox({
            bundleDir: ".remotion",
            onProgress: ({ progress, message }) => {
              send({
                type: "phase",
                phase: message,
                progress,
                subtitle: "This is only needed during development.",
              });
            },
          });

      const { file } = await renderVideoOnVercel({
        sandbox,
        compositionId: COMP_NAME,
        inputProps: body.inputProps,
        bundleDir: ".remotion",
        onProgress: (update) => {
          switch (update.type) {
            case "opening-browser":
              send({
                type: "phase",
                phase: "Opening browser...",
                progress: 0,
              });
              break;
            case "selecting-composition":
              send({
                type: "phase",
                phase: "Selecting composition...",
                progress: 0,
              });
              break;
            case "render-progress":
              send({
                type: "phase",
                phase: "Rendering video...",
                progress: update.progress,
              });
              break;
            default:
              break;
          }
        },
      });

      await send({
        type: "phase",
        phase: "Uploading video...",
        progress: 1,
      });

      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (!blobToken) {
        throw new Error("BLOB_READ_WRITE_TOKEN is not set");
      }

      const { url, size } = await uploadToVercelBlob({
        sandbox,
        sandboxFilePath: file,
        contentType: "video/mp4",
        blobToken,
      });

      await send({ type: "done", url, size });
    } catch (err) {
      console.log(err);
      await send({ type: "error", message: (err as Error).message });
    }
  };

  waitUntil(runRender());

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
