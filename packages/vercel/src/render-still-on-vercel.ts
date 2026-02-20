import type {Sandbox} from '@vercel/sandbox';
import {REMOTION_SANDBOX_BUNDLE_DIR} from './internals/add-bundle';
import type {
	ChromiumOptions,
	LogLevel,
	RenderOnVercelProgress,
	SandboxRenderStillMessage,
	StillImageFormat,
} from './types';

export async function renderStillOnVercel({
	sandbox,
	compositionId,
	inputProps,
	onProgress,
	outputFile = '/tmp/still.png',
	frame = 0,
	imageFormat = 'png',
	jpegQuality = 80,
	envVariables = {},
	chromiumOptions = {},
	scale = 1,
	logLevel = 'info',
	timeoutInMilliseconds = 30000,
	offthreadVideoCacheSizeInBytes,
	mediaCacheSizeInBytes,
	offthreadVideoThreads,
	licenseKey,
}: {
	sandbox: Sandbox;
	compositionId: string;
	inputProps: Record<string, unknown>;
	onProgress?: (progress: RenderOnVercelProgress) => Promise<void> | void;
	outputFile?: string;
	frame?: number;
	imageFormat?: StillImageFormat;
	jpegQuality?: number;
	envVariables?: Record<string, string>;
	chromiumOptions?: ChromiumOptions;
	scale?: number;
	logLevel?: LogLevel;
	timeoutInMilliseconds?: number;
	offthreadVideoCacheSizeInBytes?: number | null;
	mediaCacheSizeInBytes?: number | null;
	offthreadVideoThreads?: number | null;
	licenseKey?: string | null;
}): Promise<{sandboxFilePath: string; contentType: string}> {
	const serveUrl = `/vercel/sandbox/${REMOTION_SANDBOX_BUNDLE_DIR}`;

	const renderConfig = {
		serveUrl,
		compositionId,
		inputProps,
		output: outputFile,
		frame,
		imageFormat,
		jpegQuality,
		envVariables,
		chromiumOptions,
		scale,
		logLevel,
		timeoutInMilliseconds,
		offthreadVideoCacheSizeInBytes: offthreadVideoCacheSizeInBytes ?? null,
		mediaCacheSizeInBytes: mediaCacheSizeInBytes ?? null,
		offthreadVideoThreads: offthreadVideoThreads ?? null,
		licenseKey: licenseKey ?? null,
	};

	const renderCmd = await sandbox.runCommand({
		cmd: 'node',
		args: ['render-still.mjs', JSON.stringify(renderConfig)],
		detached: true,
	});

	let contentType: string = 'application/octet-stream';

	for await (const log of renderCmd.logs()) {
		if (log.stream === 'stdout') {
			try {
				const message: SandboxRenderStillMessage = JSON.parse(log.data);
				if (message.type === 'opening-browser') {
					await onProgress?.({type: 'opening-browser'});
				} else if (message.type === 'selecting-composition') {
					await onProgress?.({type: 'selecting-composition'});
				} else if (message.type === 'done') {
					contentType = message.contentType;
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

	return {sandboxFilePath: outputFile, contentType};
}
