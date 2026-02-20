import type {RenderMediaOnProgress} from '@remotion/renderer';
import type {Sandbox} from '@vercel/sandbox';

export type VercelSandbox = Sandbox & AsyncDisposable;

export type CreateSandboxOnProgress = (update: {
	progress: number;
	message: string;
}) => Promise<void> | void;

export type {
	AudioCodec,
	Bitrate,
	ChromeMode,
	ChromiumOptions,
	Codec,
	ColorSpace,
	FrameRange,
	LogLevel,
	OpenGlRenderer,
	PixelFormat,
	RenderMediaOnProgress,
	StillImageFormat,
	StitchingState,
	VideoImageFormat,
	X264Preset,
} from '@remotion/renderer';

export type RenderOnVercelProgress =
	| {type: 'opening-browser'}
	| {type: 'selecting-composition'}
	| ({type: 'render-progress'} & Parameters<RenderMediaOnProgress>[0]);

export type {
	HardwareAccelerationOption,
	ProResProfile,
} from '@remotion/renderer/client';

export type SandboxRenderMediaMessage =
	| {type: 'opening-browser'}
	| {type: 'selecting-composition'}
	| ({type: 'progress'} & Parameters<RenderMediaOnProgress>[0])
	| {type: 'render-complete'}
	| {type: 'done'; size: number; contentType: string};

export type SandboxRenderStillMessage =
	| {type: 'opening-browser'}
	| {type: 'selecting-composition'}
	| {type: 'render-complete'}
	| {type: 'done'; size: number; contentType: string};
