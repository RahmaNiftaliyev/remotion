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

export type {
	HardwareAccelerationOption,
	ProResProfile,
} from '@remotion/renderer/client';
