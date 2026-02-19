import type {Sandbox} from '@vercel/sandbox';
import {REMOTION_SANDBOX_BUNDLE_DIR} from './internals/add-bundle';
import type {
	ChromeMode,
	ChromiumOptions,
	LogLevel,
	RenderOnVercelProgress,
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
	overwrite = true,
	browserExecutable,
	chromiumOptions = {},
	scale = 1,
	logLevel = 'info',
	timeoutInMilliseconds = 30000,
	binariesDirectory,
	chromeMode = 'headless-shell',
	offthreadVideoCacheSizeInBytes,
	mediaCacheSizeInBytes,
	offthreadVideoThreads,
	licenseKey,
}: {
	sandbox: Sandbox;
	compositionId: string;
	inputProps: Record<string, unknown>;
	onProgress?: (progress: RenderOnVercelProgress) => void;
	outputFile?: string;
	frame?: number;
	imageFormat?: StillImageFormat;
	jpegQuality?: number;
	envVariables?: Record<string, string>;
	overwrite?: boolean;
	browserExecutable?: string | null;
	chromiumOptions?: ChromiumOptions;
	scale?: number;
	logLevel?: LogLevel;
	timeoutInMilliseconds?: number;
	binariesDirectory?: string | null;
	chromeMode?: ChromeMode;
	offthreadVideoCacheSizeInBytes?: number | null;
	mediaCacheSizeInBytes?: number | null;
	offthreadVideoThreads?: number | null;
	licenseKey?: string | null;
}): Promise<{file: string}> {
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
		overwrite,
		browserExecutable: browserExecutable ?? null,
		chromiumOptions,
		scale,
		logLevel,
		timeoutInMilliseconds,
		binariesDirectory: binariesDirectory ?? null,
		chromeMode,
		offthreadVideoCacheSizeInBytes: offthreadVideoCacheSizeInBytes ?? null,
		mediaCacheSizeInBytes: mediaCacheSizeInBytes ?? null,
		offthreadVideoThreads: offthreadVideoThreads ?? null,
		licenseKey: licenseKey ?? null,
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
