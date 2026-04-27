/// <reference lib="webworker" />

import type {
	AudioWaveformWorkerIncomingMessage,
	AudioWaveformWorkerOutgoingMessage,
	AudioWaveformWorkerRenderMessage,
} from './components/audio-waveform-worker-types';
import {drawBars} from './components/draw-peaks';
import {loadWaveformPeaks} from './components/load-waveform-peaks';
import {sliceWaveformPeaks} from './components/slice-waveform-peaks';

declare const self: DedicatedWorkerGlobalScope;

let canvas: OffscreenCanvas | null = null;
let currentController: AbortController | null = null;
let latestRequestId = 0;

const postError = (requestId: number, error: unknown) => {
	const message =
		error instanceof Error ? error.message : 'Failed to render waveform';

	const payload: AudioWaveformWorkerOutgoingMessage = {
		type: 'error',
		requestId,
		message,
	};
	self.postMessage(payload);
};

const drawPartialWaveform = (
	message: AudioWaveformWorkerRenderMessage,
	peaks: Float32Array,
) => {
	if (!canvas) {
		return;
	}

	const portionPeaks = sliceWaveformPeaks({
		durationInFrames: message.durationInFrames,
		fps: message.fps,
		peaks,
		playbackRate: message.playbackRate,
		startFrom: message.startFrom,
	});

	drawBars(
		canvas,
		portionPeaks,
		'rgba(255, 255, 255, 0.6)',
		message.volume,
		message.width,
	);
};

const renderWaveform = async (message: AudioWaveformWorkerRenderMessage) => {
	if (!canvas) {
		postError(message.requestId, new Error('Waveform canvas not initialized'));
		return;
	}

	const controller = new AbortController();
	currentController?.abort();
	currentController = controller;
	latestRequestId = message.requestId;

	try {
		canvas.width = message.width;
		canvas.height = message.height;

		const peaks = await loadWaveformPeaks(message.src, controller.signal, {
			onProgress: ({peaks: nextPeaks}) => {
				if (
					controller.signal.aborted ||
					latestRequestId !== message.requestId
				) {
					return;
				}

				drawPartialWaveform(message, nextPeaks);
			},
		});
		if (controller.signal.aborted || latestRequestId !== message.requestId) {
			return;
		}

		drawPartialWaveform(message, peaks);
	} catch (error) {
		if (controller.signal.aborted || latestRequestId !== message.requestId) {
			return;
		}

		postError(message.requestId, error);
	}
};

self.addEventListener(
	'message',
	(event: MessageEvent<AudioWaveformWorkerIncomingMessage>) => {
		const message = event.data;
		if (message.type === 'init') {
			canvas = message.canvas;
			return;
		}

		if (message.type === 'dispose') {
			currentController?.abort();
			currentController = null;
			canvas = null;
			return;
		}

		renderWaveform(message);
	},
);
