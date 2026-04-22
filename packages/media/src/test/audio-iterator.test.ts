import {ALL_FORMATS, Input, UrlSource} from 'mediabunny';
import type {ScheduleAudioNodeResult} from 'remotion';
import {expect, test} from 'vitest';
import {audioIteratorManager} from '../audio-iterator-manager';
import {makeNonceManager} from '../nonce-manager';

const prepare = async () => {
	const input = new Input({
		source: new UrlSource('https://remotion.media/video.mp4'),
		formats: ALL_FORMATS,
	});
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!audioTrack) {
		throw new Error('No audio track found');
	}

	const audioContext = new AudioContext();

	let sharedContextChunks = 0;
	const scheduleSharedAudioNode = (): ScheduleAudioNodeResult => {
		sharedContextChunks++;
		return {
			type: 'started',
			scheduledTime: 0,
		};
	};

	const manager = audioIteratorManager({
		audioTrack,
		delayPlaybackHandleIfNotPremounting: () => ({
			unblock: () => {},
			[Symbol.dispose]: () => {},
		}),
		sharedAudioContext: {
			audioContext,
			audioSyncAnchor: {value: 0},
			scheduleAudioNode: scheduleSharedAudioNode,
		},
		getIsLooping: () => false,
		getEndTime: () => Infinity,
		getStartTime: () => 0,
		initialMuted: false,
		drawDebugOverlay: () => {},
	});

	const fps = 30;
	const playbackRate = 1;
	const getIsPlaying = () => true;

	const getAudioContextState = () => 'running' as const;
	const getAudioContextOutputTimestamp = () => 1;

	const scheduledChunks: number[] = [];
	const waiters: {count: number; resolve: () => void}[] = [];

	const scheduleAudioNode = (
		_node: AudioBufferSourceNode,
		mediaTimestamp: number,
	): ScheduleAudioNodeResult => {
		scheduledChunks.push(mediaTimestamp);
		for (let i = waiters.length - 1; i >= 0; i--) {
			if (scheduledChunks.length >= waiters[i].count) {
				waiters[i].resolve();
				waiters.splice(i, 1);
			}
		}

		return {
			type: 'started',
			scheduledTime: mediaTimestamp,
		};
	};

	const waitForNNodes = (n: number): Promise<void> => {
		const target = scheduledChunks.length + n;
		return new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				const i = waiters.indexOf(waiter);
				if (i >= 0) waiters.splice(i, 1);
				reject(new Error(`Timed out waiting for ${n} audio nodes`));
			}, 10000);
			const waiter = {
				count: target,
				resolve: () => {
					clearTimeout(timeoutId);
					resolve();
				},
			};
			waiters.push(waiter);
		});
	};

	return {
		manager,
		fps,
		playbackRate,
		getIsPlaying,
		getScheduledChunks: () => sharedContextChunks,
		getAudioContextState,
		getAudioContextOutputTimestamp,
		scheduleAudioNode,
		scheduledChunks,
		waitForNNodes,
	};
};

test('media player should work', async () => {
	const {
		manager,
		playbackRate,
		getIsPlaying,
		getAudioContextState,
		getAudioContextOutputTimestamp,
		scheduleAudioNode,
		scheduledChunks,
		waitForNNodes,
	} = await prepare();

	await manager.seek({
		newTime: 9.96,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 3,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});

	expect(scheduledChunks).toEqual([
		9.941333333333333, 9.962666666666667, 9.984,
	]);

	scheduledChunks.length = 0;
	await manager.seek({
		newTime: 0,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 3,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});

	expect(scheduledChunks).toEqual([
		0, 0.021333333333333333, 0.042666666666666665,
	]);
	scheduledChunks.length = 0;

	await manager.seek({
		newTime: 0.04,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 2,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});

	await waitForNNodes(2);

	manager.destroyIterator();

	expect(scheduledChunks).toEqual([0.064, 0.08533333333333333]);

	const created = manager.getAudioIteratorsCreated();
	expect(created).toBe(2);
	manager.destroyIterator();
});

test('should not create too many iterators when the audio ends', async () => {
	const {
		manager,
		playbackRate,
		getIsPlaying,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	} = await prepare();

	const scheduledChunks: number[] = [];
	const scheduleAudioNode = (
		_node: AudioBufferSourceNode,
		mediaTimestamp: number,
	): ScheduleAudioNodeResult => {
		scheduledChunks.push(mediaTimestamp);
		return {
			type: 'started',
			scheduledTime: mediaTimestamp,
		};
	};

	await manager.seek({
		newTime: 9.97,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 2,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});
	await manager.seek({
		newTime: 9.98,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 2,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});

	const created = manager.getAudioIteratorsCreated();
	expect(created).toBe(1);

	expect(scheduledChunks).toEqual([9.962666666666667, 9.984]);
});

test('should create more iterators when seeking ', async () => {
	const {
		manager,
		playbackRate,
		getIsPlaying,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	} = await prepare();

	const scheduledChunks: number[] = [];
	const scheduleAudioNode = (
		_node: AudioBufferSourceNode,
		mediaTimestamp: number,
	): ScheduleAudioNodeResult => {
		scheduledChunks.push(mediaTimestamp);
		return {
			type: 'started',
			scheduledTime: mediaTimestamp,
		};
	};

	await manager.seek({
		newTime: 0,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 6,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});
	expect(scheduledChunks).toEqual([
		0, 0.021333333333333333, 0.042666666666666665, 0.064, 0.08533333333333333,
		0.10666666666666667,
	]);
	scheduledChunks.length = 0;
	await manager.seek({
		newTime: 1,
		scheduleAudioNode,
		getIsPlaying,
		nonce: makeNonceManager().createAsyncOperation(),
		playbackRate,
		debugAudioScheduling: false,
		getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
		resolveAfterNScheduledNodes: 6,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	});

	const created = manager.getAudioIteratorsCreated();
	expect(created).toBe(2);

	expect(scheduledChunks).toEqual([
		0.9813333333333333, 1.0026666666666666, 1.024, 1.0453333333333332,
		1.0666666666666667, 1.088,
	]);
});

// https://github.com/remotion-dev/remotion/issues/5872#issuecomment-3541004403
test('should not schedule duplicate chunks with playbackRate=0.5', async () => {
	const input = new Input({
		source: new UrlSource('https://remotion.media/video.mp4'),
		formats: ALL_FORMATS,
	});
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!audioTrack) {
		throw new Error('No audio track found');
	}

	const audioContext = new AudioContext();

	const manager = audioIteratorManager({
		audioTrack,
		delayPlaybackHandleIfNotPremounting: () => ({
			unblock: () => {},
			[Symbol.dispose]: () => {},
		}),
		sharedAudioContext: {
			audioContext,
			audioSyncAnchor: {value: 0},
			scheduleAudioNode: () => ({
				type: 'started',
				scheduledTime: 0,
			}),
		},
		getIsLooping: () => false,
		getEndTime: () => Infinity,
		getStartTime: () => 0,

		initialMuted: false,
		drawDebugOverlay: () => {},
	});

	const scheduledChunks: number[] = [];
	const scheduleAudioNode = (
		_node: AudioBufferSourceNode,
		mediaTimestamp: number,
	): ScheduleAudioNodeResult => {
		scheduledChunks.push(mediaTimestamp);
		return {
			type: 'started',
			scheduledTime: mediaTimestamp,
		};
	};

	const fps = 25;
	const playbackRate = 0.5;

	// Simulate sequential seeks like real playback over many frames
	// At 25fps with playbackRate=0.5, media time advances 20ms per frame
	// But AAC audio chunks are 21.33ms, so we keep re-encountering them

	// Simulate 30 frames of playback
	// (about 1.2 seconds real time, 0.6s media time)
	for (let frame = 0; frame < 30; frame++) {
		const mediaTime = frame * (1 / fps) * playbackRate;

		await manager.seek({
			newTime: mediaTime,
			scheduleAudioNode,
			getIsPlaying: () => true,
			nonce: makeNonceManager().createAsyncOperation(),
			playbackRate,
			debugAudioScheduling: false,
			getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
			resolveAfterNScheduledNodes: 3,
			getAudioContextState: () => 'running' as const,
			getAudioContextOutputTimestamp: () => 1,
		});
	}

	const uniqueChunks = [...new Set(scheduledChunks)];
	expect(uniqueChunks.length).toEqual(30);
	expect(scheduledChunks.length).toBe(uniqueChunks.length);
});

test('should not decode + schedule audio chunks beyond the end time', async () => {
	const endTime = 0.5;
	const fps = 30;

	const input = new Input({
		source: new UrlSource('https://remotion.media/video.mp4'),
		formats: ALL_FORMATS,
	});
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!audioTrack) {
		throw new Error('No audio track found');
	}

	const audioContext = new AudioContext();

	const manager = audioIteratorManager({
		audioTrack,
		delayPlaybackHandleIfNotPremounting: () => ({
			unblock: () => {},
			[Symbol.dispose]: () => {},
		}),
		sharedAudioContext: {
			audioContext,
			audioSyncAnchor: {value: 0},
			scheduleAudioNode: () => ({
				type: 'started',
				scheduledTime: 0,
			}),
		},
		getIsLooping: () => false,
		getEndTime: () => endTime,
		getStartTime: () => 0,
		initialMuted: false,
		drawDebugOverlay: () => {},
	});

	const scheduledChunks: {
		timestamp: number;
	}[] = [];
	const scheduleAudioNode = (
		_node: AudioBufferSourceNode,
		mediaTimestamp: number,
	): ScheduleAudioNodeResult => {
		scheduledChunks.push({
			timestamp: mediaTimestamp,
		});
		return {
			type: 'started',
			scheduledTime: mediaTimestamp,
		};
	};

	// Simulate playback frame by frame, seeking past the end time
	for (let frame = 0; frame < 30; frame++) {
		const mediaTime = frame / fps;

		manager.seek({
			newTime: mediaTime,
			scheduleAudioNode,
			getIsPlaying: () => true,
			nonce: makeNonceManager().createAsyncOperation(),
			playbackRate: 1,
			debugAudioScheduling: false,
			getTargetTime: (mediaTimestamp: number) => mediaTimestamp,
			resolveAfterNScheduledNodes: 3,
			getAudioContextState: () => 'running' as const,
			getAudioContextOutputTimestamp: () => 1,
		});
	}

	for (const chunk of scheduledChunks) {
		expect(chunk.timestamp).toBeLessThanOrEqual(endTime);
	}
});
