import type {Sandbox} from '@vercel/sandbox';
import {REMOTION_SANDBOX_BUNDLE_DIR} from './internals/add-bundle';
import type {
	AudioCodec,
	Bitrate,
	ChromeMode,
	ChromiumOptions,
	Codec,
	ColorSpace,
	FrameRange,
	HardwareAccelerationOption,
	LogLevel,
	PixelFormat,
	ProResProfile,
	RenderOnVercelProgress,
	VideoImageFormat,
	X264Preset,
} from './types';

export async function renderVideoOnVercel({
	sandbox,
	compositionId,
	inputProps,
	onProgress,
	outputFile = '/tmp/video.mp4',
	codec = 'h264',
	crf,
	imageFormat,
	pixelFormat,
	envVariables = {},
	frameRange,
	everyNthFrame = 1,
	overwrite = true,
	proResProfile,
	chromiumOptions = {},
	scale = 1,
	browserExecutable,
	preferLossless = false,
	enforceAudioTrack = false,
	disallowParallelEncoding = false,
	concurrency,
	binariesDirectory,
	metadata,
	licenseKey,
	videoBitrate,
	audioBitrate,
	encodingMaxRate,
	encodingBufferSize,
	muted = false,
	numberOfGifLoops,
	x264Preset,
	colorSpace = 'default',
	jpegQuality = 80,
	audioCodec,
	logLevel = 'info',
	timeoutInMilliseconds = 30000,
	forSeamlessAacConcatenation = false,
	separateAudioTo,
	hardwareAcceleration = 'disable',
	chromeMode = 'headless-shell',
	offthreadVideoCacheSizeInBytes,
	mediaCacheSizeInBytes,
	offthreadVideoThreads,
	repro = false,
}: {
	sandbox: Sandbox;
	compositionId: string;
	inputProps: Record<string, unknown>;
	onProgress?: (progress: RenderOnVercelProgress) => void;
	outputFile?: string;
	codec?: Codec;
	crf?: number | null;
	imageFormat?: VideoImageFormat | null;
	pixelFormat?: PixelFormat | null;
	envVariables?: Record<string, string>;
	frameRange?: FrameRange | null;
	everyNthFrame?: number;
	overwrite?: boolean;
	proResProfile?: ProResProfile;
	chromiumOptions?: ChromiumOptions;
	scale?: number;
	browserExecutable?: string | null;
	preferLossless?: boolean;
	enforceAudioTrack?: boolean;
	disallowParallelEncoding?: boolean;
	concurrency?: number | string | null;
	binariesDirectory?: string | null;
	metadata?: Record<string, string> | null;
	licenseKey?: string | null;
	videoBitrate?: Bitrate | null;
	audioBitrate?: Bitrate | null;
	encodingMaxRate?: Bitrate | null;
	encodingBufferSize?: Bitrate | null;
	muted?: boolean;
	numberOfGifLoops?: number | null;
	x264Preset?: X264Preset | null;
	colorSpace?: ColorSpace;
	jpegQuality?: number;
	audioCodec?: AudioCodec | null;
	logLevel?: LogLevel;
	timeoutInMilliseconds?: number;
	forSeamlessAacConcatenation?: boolean;
	separateAudioTo?: string | null;
	hardwareAcceleration?: HardwareAccelerationOption;
	chromeMode?: ChromeMode;
	offthreadVideoCacheSizeInBytes?: number | null;
	mediaCacheSizeInBytes?: number | null;
	offthreadVideoThreads?: number | null;
	repro?: boolean;
}): Promise<{file: string}> {
	const serveUrl = `/vercel/sandbox/${REMOTION_SANDBOX_BUNDLE_DIR}`;

	const renderConfig = {
		serveUrl,
		compositionId,
		inputProps,
		outputLocation: outputFile,
		codec,
		crf: crf ?? null,
		imageFormat: imageFormat ?? null,
		pixelFormat: pixelFormat ?? null,
		envVariables,
		frameRange: frameRange ?? null,
		everyNthFrame,
		overwrite,
		proResProfile: proResProfile ?? null,
		chromiumOptions,
		scale,
		browserExecutable: browserExecutable ?? null,
		preferLossless,
		enforceAudioTrack,
		disallowParallelEncoding,
		concurrency: concurrency ?? null,
		binariesDirectory: binariesDirectory ?? null,
		metadata: metadata ?? null,
		licenseKey: licenseKey ?? null,
		videoBitrate: videoBitrate ?? null,
		audioBitrate: audioBitrate ?? null,
		encodingMaxRate: encodingMaxRate ?? null,
		encodingBufferSize: encodingBufferSize ?? null,
		muted,
		numberOfGifLoops: numberOfGifLoops ?? null,
		x264Preset: x264Preset ?? null,
		colorSpace,
		jpegQuality,
		audioCodec: audioCodec ?? null,
		logLevel,
		timeoutInMilliseconds,
		forSeamlessAacConcatenation,
		separateAudioTo: separateAudioTo ?? null,
		hardwareAcceleration,
		chromeMode,
		offthreadVideoCacheSizeInBytes: offthreadVideoCacheSizeInBytes ?? null,
		mediaCacheSizeInBytes: mediaCacheSizeInBytes ?? null,
		offthreadVideoThreads: offthreadVideoThreads ?? null,
		repro,
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
						renderedFrames: message.renderedFrames,
						encodedFrames: message.encodedFrames,
						encodedDoneIn: message.encodedDoneIn,
						renderedDoneIn: message.renderedDoneIn,
						renderEstimatedTime: message.renderEstimatedTime,
						progress: message.progress,
						stitchStage: message.stitchStage,
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
