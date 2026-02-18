import type {Sandbox} from '@vercel/sandbox';

export type VercelSandbox = Sandbox & AsyncDisposable;

export type OnProgress = (update: {progress: number; message: string}) => void;

export type RenderOnVercelProgress =
	| {type: 'opening-browser'}
	| {type: 'selecting-composition'}
	| {type: 'render-progress'; progress: number}
	| {type: 'uploading'}
	| {type: 'done'; url: string; size: number};
