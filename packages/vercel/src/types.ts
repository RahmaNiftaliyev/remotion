import type {Sandbox} from '@vercel/sandbox';

export type VercelSandbox = Sandbox & AsyncDisposable;

export type CreateSandboxOnProgress = (update: {
	progress: number;
	message: string;
}) => void;

// Render option types (compatible with @remotion/renderer)

export type Codec =
	| 'h264'
	| 'h265'
	| 'vp8'
	| 'vp9'
	| 'mp3'
	| 'aac'
	| 'wav'
	| 'prores'
	| 'h264-mkv'
	| 'h264-ts'
	| 'gif';

export type VideoImageFormat = 'png' | 'jpeg' | 'none';

export type StillImageFormat = 'png' | 'jpeg' | 'pdf' | 'webp';

export type PixelFormat =
	| 'yuv420p'
	| 'yuva420p'
	| 'yuv422p'
	| 'yuv444p'
	| 'yuv420p10le'
	| 'yuv422p10le'
	| 'yuv444p10le'
	| 'yuva444p10le';

export type ColorSpace = 'default' | 'bt601' | 'bt709' | 'bt2020-ncl';

export type AudioCodec = 'pcm-16' | 'aac' | 'mp3' | 'opus';

export type LogLevel = 'trace' | 'verbose' | 'info' | 'warn' | 'error';

export type ProResProfile =
	| '4444-xq'
	| '4444'
	| 'hq'
	| 'standard'
	| 'light'
	| 'proxy';

export type ChromeMode = 'headless-shell' | 'chrome-for-testing';

export type HardwareAccelerationOption = 'disable' | 'if-possible' | 'required';

export type X264Preset =
	| 'ultrafast'
	| 'superfast'
	| 'veryfast'
	| 'faster'
	| 'fast'
	| 'medium'
	| 'slow'
	| 'slower'
	| 'veryslow'
	| 'placebo';

export type OpenGlRenderer =
	| 'swangle'
	| 'angle'
	| 'egl'
	| 'swiftshader'
	| 'vulkan'
	| 'angle-egl';

export type FrameRange = number | [number, number] | [number, null];

type BitrateUnit = 'k' | 'K' | 'M';
export type Bitrate = `${number}${BitrateUnit}`;

export type ChromiumOptions = {
	ignoreCertificateErrors?: boolean;
	disableWebSecurity?: boolean;
	gl?: OpenGlRenderer | null;
	userAgent?: string | null;
	enableMultiProcessOnLinux?: boolean;
	darkMode?: boolean;
};

export type StitchingState = 'encoding' | 'muxing';

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
			stitchStage: StitchingState;
	  }
	| {type: 'uploading'}
	| {type: 'done'; url: string; size: number};
