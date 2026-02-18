export const getRenderVideoScript = ({
	codec,
	outputFile,
}: {
	codec: string;
	outputFile: string;
}): string => {
	return `\
import {
  openBrowser,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import { readFileSync, statSync } from "fs";

const config = JSON.parse(process.argv[2]);

try {
  console.log(JSON.stringify({ type: "opening-browser" }));
  const browser = await openBrowser("chrome");
  console.log(JSON.stringify({ type: "selecting-composition" }));
  const composition = await selectComposition({
    serveUrl: config.serveUrl,
    id: config.compositionId,
    inputProps: config.inputProps,
    puppeteerInstance: browser,
  });

  await renderMedia({
    composition,
    serveUrl: config.serveUrl,
    codec: ${JSON.stringify(codec)},
    outputLocation: ${JSON.stringify(outputFile)},
    inputProps: config.inputProps,
    onProgress: ({ progress }) => {
      console.log(JSON.stringify({ type: "progress", progress }));
    },
    puppeteerInstance: browser,
  });

  console.log(JSON.stringify({ type: "render-complete" }));
  await browser.close({ silent: false });

  const size = statSync(${JSON.stringify(outputFile)}).size;
  console.log(JSON.stringify({ type: "done", size }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
`;
};
