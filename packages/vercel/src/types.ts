import type {Sandbox} from '@vercel/sandbox';

export type VercelSandbox = Sandbox & AsyncDisposable;

export type CreateSandboxOnProgress = (update: {
	progress: number;
	message: string;
}) => void;

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
	StillImageFormat,
	StitchingState,
	VideoImageFormat,
	X264Preset,
} from '@remotion/renderer';

export type {
	HardwareAccelerationOption,
	ProResProfile,
} from '@remotion/renderer/client';

import type {StitchingState as StitchingStateType} from '@remotion/renderer';

export type RenderOnVercelProgress =
	| {type: 'opening-browser'}
	| {type: 'selecting-composition'}
	| {
			type: 'render-progress';
			renderedFrames: number;
			encodedFrames: number;
			encodedDoneIn: number | null;
			renderedDoneIn: number | null;
			renderEstimatedTime: number;
			progress: number;
			stitchStage: StitchingStateType;
	  }
	| {type: 'uploading'}
	| {type: 'done'; url: string; size: number};
