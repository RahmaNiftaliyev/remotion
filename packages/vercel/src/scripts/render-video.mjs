import {RenderInternals} from '@remotion/renderer';
import {statSync} from 'fs';
import {NoReactInternals} from 'remotion/no-react';

const config = JSON.parse(process.argv[2]);

const noop = () => undefined;

try {
	const serializedInputProps = NoReactInternals.serializeJSONWithSpecialTypes({
		data: config.inputProps,
		indent: undefined,
		staticBase: null,
	}).serializedString;

	console.log(JSON.stringify({type: 'opening-browser'}));

	const browser = await RenderInternals.internalOpenBrowser({
		browser: 'chrome',
		browserExecutable: config.browserExecutable,
		chromiumOptions: config.chromiumOptions,
		forceDeviceScaleFactor: undefined,
		viewport: null,
		indent: false,
		logLevel: config.logLevel,
		onBrowserDownload: () => ({
			version: null,
			onProgress: noop,
		}),
		chromeMode: config.chromeMode,
	});

	console.log(JSON.stringify({type: 'selecting-composition'}));

	const {metadata: composition} =
		await RenderInternals.internalSelectComposition({
			serializedInputPropsWithCustomSchema: serializedInputProps,
			envVariables: config.envVariables,
			puppeteerInstance: browser,
			onBrowserLog: null,
			browserExecutable: config.browserExecutable,
			chromiumOptions: config.chromiumOptions,
			port: null,
			indent: false,
			server: undefined,
			serveUrl: config.serveUrl,
			id: config.compositionId,
			onServeUrlVisited: noop,
			logLevel: config.logLevel,
			timeoutInMilliseconds: config.timeoutInMilliseconds,
			binariesDirectory: config.binariesDirectory,
			onBrowserDownload: () => ({
				version: null,
				onProgress: noop,
			}),
			chromeMode: config.chromeMode,
			mediaCacheSizeInBytes: config.mediaCacheSizeInBytes,
			offthreadVideoCacheSizeInBytes: config.offthreadVideoCacheSizeInBytes,
			offthreadVideoThreads: config.offthreadVideoThreads,
		});

	const serializedResolvedProps =
		NoReactInternals.serializeJSONWithSpecialTypes({
			data: composition.props,
			indent: undefined,
			staticBase: null,
		}).serializedString;

	const {contentType} = await RenderInternals.internalRenderMedia({
		outputLocation: config.outputLocation,
		composition,
		serializedInputPropsWithCustomSchema: serializedInputProps,
		serializedResolvedPropsWithCustomSchema: serializedResolvedProps,
		serveUrl: config.serveUrl,
		codec: config.codec,
		crf: config.crf,
		imageFormat: config.imageFormat,
		pixelFormat: config.pixelFormat,
		envVariables: config.envVariables,
		frameRange: config.frameRange,
		everyNthFrame: config.everyNthFrame,
		overwrite: true,
		proResProfile: config.proResProfile ?? undefined,
		chromiumOptions: config.chromiumOptions,
		scale: config.scale,
		browserExecutable: config.browserExecutable,
		preferLossless: config.preferLossless,
		enforceAudioTrack: config.enforceAudioTrack,
		disallowParallelEncoding: config.disallowParallelEncoding,
		concurrency: config.concurrency,
		binariesDirectory: config.binariesDirectory,
		metadata: config.metadata,
		licenseKey: config.licenseKey,
		videoBitrate: config.videoBitrate,
		audioBitrate: config.audioBitrate,
		encodingMaxRate: config.encodingMaxRate,
		encodingBufferSize: config.encodingBufferSize,
		muted: config.muted,
		numberOfGifLoops: config.numberOfGifLoops,
		x264Preset: config.x264Preset,
		colorSpace: config.colorSpace,
		jpegQuality: config.jpegQuality,
		audioCodec: config.audioCodec,
		logLevel: config.logLevel,
		timeoutInMilliseconds: config.timeoutInMilliseconds,
		forSeamlessAacConcatenation: config.forSeamlessAacConcatenation,
		separateAudioTo: config.separateAudioTo,
		hardwareAcceleration: config.hardwareAcceleration,
		chromeMode: config.chromeMode,
		offthreadVideoCacheSizeInBytes: config.offthreadVideoCacheSizeInBytes,
		mediaCacheSizeInBytes: config.mediaCacheSizeInBytes,
		offthreadVideoThreads: config.offthreadVideoThreads,
		repro: config.repro,
		// Non-serializable fields with defaults
		puppeteerInstance: browser,
		onProgress: (progress) => {
			console.log(
				JSON.stringify({
					type: 'progress',
					renderedFrames: progress.renderedFrames,
					encodedFrames: progress.encodedFrames,
					encodedDoneIn: progress.encodedDoneIn,
					renderedDoneIn: progress.renderedDoneIn,
					renderEstimatedTime: progress.renderEstimatedTime,
					progress: progress.progress,
					stitchStage: progress.stitchStage,
				}),
			);
		},
		onDownload: () => undefined,
		onBrowserLog: null,
		onStart: noop,
		port: null,
		cancelSignal: undefined,
		onCtrlCExit: noop,
		indent: false,
		server: undefined,
		ffmpegOverride: undefined,
		compositionStart: 0,
		onArtifact: null,
		onLog: RenderInternals.defaultOnLog,
		isProduction: true,
		onBrowserDownload: () => ({
			version: null,
			onProgress: noop,
		}),
	});

	console.log(JSON.stringify({type: 'render-complete'}));
	await browser.close({silent: false});

	const {size} = statSync(config.outputLocation ?? '/tmp/video.mp4');
	console.log(JSON.stringify({type: 'done', size, contentType}));
} catch (err) {
	console.error(err.message);
	process.exit(1);
}
