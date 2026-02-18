import {getRenderVideoScript} from './internals/render-video-script';
import type {RenderOnVercelProgress, VercelSandbox} from './types';

export async function renderVideoOnVercel({
	sandbox,
	compositionId,
	inputProps,
	codec = 'h264',
	outputFile = '/tmp/video.mp4',
	onProgress,
	bundleDir = '.remotion',
}: {
	sandbox: VercelSandbox;
	compositionId: string;
	inputProps: Record<string, unknown>;
	codec?: string;
	outputFile?: string;
	onProgress?: (progress: RenderOnVercelProgress) => void;
	bundleDir?: string;
}): Promise<{file: string}> {
	const serveUrl = `/vercel/sandbox/${bundleDir}`;

	const renderScript = getRenderVideoScript({codec, outputFile});

	await sandbox.writeFiles([
		{
			path: 'render-video.ts',
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
		args: ['--strip-types', 'render-video.ts', JSON.stringify(renderConfig)],
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
				} else if (message.type === 'progress') {
					onProgress?.({
						type: 'render-progress',
						progress: message.progress,
					});
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
		throw new Error(`Render failed: ${stderr} ${stdout}`);
	}

	return {file: outputFile};
}
