import {getRenderStillScript} from './internals/render-still-script';
import type {RenderOnVercelProgress, VercelSandbox} from './types';

export async function renderStillOnVercel({
	sandbox,
	compositionId,
	inputProps,
	imageFormat = 'png',
	outputFile = '/tmp/still.png',
	onProgress,
	bundleDir = '.remotion',
}: {
	sandbox: VercelSandbox;
	compositionId: string;
	inputProps: Record<string, unknown>;
	imageFormat?: 'png' | 'jpeg' | 'webp';
	outputFile?: string;
	onProgress?: (progress: RenderOnVercelProgress) => void;
	bundleDir?: string;
}): Promise<{file: string}> {
	const serveUrl = `/vercel/sandbox/${bundleDir}`;

	const renderScript = getRenderStillScript({imageFormat, outputFile});

	await sandbox.writeFiles([
		{
			path: 'render-still.ts',
			content: Buffer.from(renderScript),
		},
	]);

	const renderConfig = {
		serveUrl,
		compositionId,
		inputProps,
	};

	const renderCmd = await sandbox.runCommand({
		cmd: 'node',
		args: ['--strip-types', 'render-still.ts', JSON.stringify(renderConfig)],
		detached: true,
	});

	for await (const log of renderCmd.logs()) {
		if (log.stream === 'stdout') {
			try {
				const message = JSON.parse(log.data);
				if (message.type === 'opening-browser') {
					onProgress?.({type: 'opening-browser'});
				} else if (message.type === 'selecting-composition') {
					onProgress?.({type: 'selecting-composition'});
				}
			} catch {
				// Not JSON, ignore
			}
		}
	}

	const renderResult = await renderCmd.wait();
	if (renderResult.exitCode !== 0) {
		const stderr = await renderResult.stderr();
		const stdout = await renderResult.stdout();
		throw new Error(`Render still failed: ${stderr} ${stdout}`);
	}

	return {file: outputFile};
}
