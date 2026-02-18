import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {statSync} from 'fs';

const config = JSON.parse(process.argv[2]);

try {
	console.log(JSON.stringify({type: 'opening-browser'}));
	const browser = await openBrowser('chrome');
	console.log(JSON.stringify({type: 'selecting-composition'}));
	const composition = await selectComposition({
		serveUrl: config.serveUrl,
		id: config.compositionId,
		inputProps: config.inputProps,
		puppeteerInstance: browser,
	});

	await renderStill({
		composition,
		serveUrl: config.serveUrl,
		imageFormat: config.imageFormat,
		output: config.outputFile,
		inputProps: config.inputProps,
		puppeteerInstance: browser,
	});

	console.log(JSON.stringify({type: 'render-complete'}));
	await browser.close({silent: false});

	const size = statSync(config.outputFile).size;
	console.log(JSON.stringify({type: 'done', size}));
} catch (err) {
	console.error((err as Error).message);
	process.exit(1);
}
