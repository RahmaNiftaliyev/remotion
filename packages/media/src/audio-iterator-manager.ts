import type {InputAudioTrack, WrappedAudioBuffer} from 'mediabunny';
import {AudioBufferSink, InputDisposedError} from 'mediabunny';
import {Internals, type ScheduleAudioNodeResult} from 'remotion';
import type {AudioIterator, QueuedPeriod} from './audio/audio-preview-iterator';
import {
	isAlreadyQueued,
	makeAudioIterator,
} from './audio/audio-preview-iterator';
import {getScheduledTime} from './audio/get-scheduled-time';
import {StaleWaiterError, waitForTurn} from './audio/sort-by-priority';
import type {DelayPlaybackIfNotPremounting} from './delay-playback-if-not-premounting';
import type {Nonce} from './nonce-manager';
import {makePrewarmedAudioIteratorCache} from './prewarm-iterator-for-looping';
import {ALLOWED_GLOBAL_TIME_ANCHOR_SHIFT} from './set-global-time-anchor';
import type {SharedAudioContextForMediaPlayer} from './shared-audio-context-for-media-player';

type ScheduleAudioNode = (
	node: AudioBufferSourceNode,
	mediaTimestamp: number,
) => ScheduleAudioNodeResult;

export const audioIteratorManager = ({
	audioTrack,
	delayPlaybackHandleIfNotPremounting,
	sharedAudioContext,
	getIsLooping,
	getEndTime,
	getStartTime,
	initialMuted,
	drawDebugOverlay,
}: {
	audioTrack: InputAudioTrack;
	delayPlaybackHandleIfNotPremounting: () => DelayPlaybackIfNotPremounting;
	sharedAudioContext: SharedAudioContextForMediaPlayer;
	getIsLooping: () => boolean;
	getEndTime: () => number;
	getStartTime: () => number;
	initialMuted: boolean;
	drawDebugOverlay: () => void;
}) => {
	let muted = initialMuted;
	let currentVolume = 1;

	const gainNode = sharedAudioContext.audioContext.createGain();
	gainNode.connect(sharedAudioContext.audioContext.destination);

	const audioSink = new AudioBufferSink(audioTrack);
	const prewarmedAudioIteratorCache =
		makePrewarmedAudioIteratorCache(audioSink);
	let audioBufferIterator: AudioIterator | null = null;
	let audioIteratorsCreated = 0;
	let currentDelayHandle: {unblock: () => void} | null = null;

	const pendingScheduleWaiters: {
		remaining: number;
		resolve: () => void;
	}[] = [];

	const notifyNodeScheduled = () => {
		for (let i = pendingScheduleWaiters.length - 1; i >= 0; i--) {
			const waiter = pendingScheduleWaiters[i];
			waiter.remaining--;
			if (waiter.remaining <= 0) {
				waiter.resolve();
				pendingScheduleWaiters.splice(i, 1);
			}
		}
	};

	const waitForNScheduledNodes = (n: number) => {
		if (n <= 0) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => {
			pendingScheduleWaiters.push({remaining: n, resolve});
		});
	};

	const scheduleAudioChunk = ({
		buffer,
		mediaTimestamp,
		playbackRate,
		scheduleAudioNode,
		debugAudioScheduling,
		getAudioContextState,
	}: {
		buffer: AudioBuffer;
		mediaTimestamp: number;
		playbackRate: number;
		scheduleAudioNode: ScheduleAudioNode;
		getAudioContextState: () => AudioContextState;
		debugAudioScheduling: boolean;
	}) => {
		if (!audioBufferIterator) {
			throw new Error('Audio buffer iterator not found');
		}

		if (getAudioContextState() !== 'running') {
			throw new Error(
				'Tried to schedule node while audio context is not running',
			);
		}

		if (muted) {
			return;
		}

		const node = sharedAudioContext.audioContext.createBufferSource();
		node.buffer = buffer;
		node.playbackRate.value = playbackRate;
		node.connect(gainNode);

		const started = scheduleAudioNode(node, mediaTimestamp);

		if (started.type === 'not-started') {
			if (debugAudioScheduling) {
				Internals.Log.info(
					{logLevel: 'trace', tag: 'audio-scheduling'},
					'not started, disconnected: %s %s',
					mediaTimestamp.toFixed(3),
					buffer.duration.toFixed(3),
				);
			}

			node.disconnect();
			return;
		}

		const iterator = audioBufferIterator;

		iterator.addQueuedAudioNode({
			node,
			timestamp: mediaTimestamp,
			buffer,
			scheduledTime: started.scheduledTime,
			playbackRate,
			scheduledAtAnchor: sharedAudioContext.audioSyncAnchor.value,
		});
		node.onended = () => {
			// Some leniancy is needed as we find that sometimes onended is fired a bit too early
			setTimeout(() => {
				iterator.removeQueuedAudioNode(node);
			}, 30);
		};
	};

	const onAudioChunk = ({
		getAudioContextState,
		buffer,
		playbackRate,
		scheduleAudioNode,
		debugAudioScheduling,
	}: {
		getAudioContextState: () => AudioContextState;
		buffer: WrappedAudioBuffer;
		playbackRate: number;
		scheduleAudioNode: ScheduleAudioNode;
		debugAudioScheduling: boolean;
	}) => {
		if (muted) {
			return;
		}

		const startTime = getStartTime();
		const endTime = getEndTime();

		// Skip chunks entirely outside the range
		if (buffer.timestamp + buffer.duration <= startTime) {
			return;
		}

		if (buffer.timestamp >= endTime) {
			return;
		}

		scheduleAudioChunk({
			buffer: buffer.buffer,
			mediaTimestamp: buffer.timestamp,
			playbackRate,
			scheduleAudioNode,
			debugAudioScheduling,
			getAudioContextState,
		});

		drawDebugOverlay();
	};

	const proceedScheduling = ({
		iterator,
		nonce,
		getTargetTime,
		getIsPlaying,
		playbackRate,
		scheduleAudioNode,
		debugAudioScheduling,
		onScheduled,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	}: {
		iterator: AudioIterator;
		nonce: Nonce;
		getTargetTime: (
			mediaTimestamp: number,
			currentTime: number,
		) => number | null;
		getIsPlaying: () => boolean;
		getAudioContextState: () => AudioContextState;
		getAudioContextOutputTimestamp: () => number;
		playbackRate: number;
		scheduleAudioNode: ScheduleAudioNode;
		debugAudioScheduling: boolean;
		onScheduled: (mediaTimestamp: number) => void;
	}) => {
		waitForTurn({
			getPriority: () => {
				if (iterator.isDestroyed()) {
					return null;
				}

				const {currentTime} = sharedAudioContext.audioContext;

				const guessedNextTimestamp = iterator.guessNextTimestamp();
				const targetTime = getTargetTime(guessedNextTimestamp, currentTime);
				if (targetTime === null) {
					// Time will not be mounted
					return null;
				}

				const scheduledTime = getScheduledTime({
					mediaTimestamp: guessedNextTimestamp,
					targetTime,
					currentTime,
					sequenceStartTime: getStartTime(),
				});

				return scheduledTime - currentTime;
			},
			fn: () => iterator.getNextFn(),
			onDone: (result, next) => {
				if (iterator.isDestroyed()) {
					next();
					return;
				}

				// We schedule even if nonce.isStale(), because the iterator is still alive and the seek did not destroy the
				// iterator. So the seek was non-destructive, and the schedule valid. The iterator already progressed, we cannot get it again.

				if (!result.value) {
					// media ended
					next();
					return;
				}

				onScheduled(result.value.timestamp);
				notifyNodeScheduled();

				onAudioChunk({
					getAudioContextState,
					buffer: result.value,
					playbackRate,
					scheduleAudioNode,
					debugAudioScheduling,
				});
				proceedScheduling({
					iterator,
					nonce,
					getTargetTime,
					getIsPlaying,
					playbackRate,
					scheduleAudioNode,
					debugAudioScheduling,
					onScheduled,
					getAudioContextState,
					getAudioContextOutputTimestamp,
				});
				next();
			},
			onError: (e) => {
				if (e instanceof InputDisposedError) {
					// iterator was disposed by a newer startAudioIterator call
					// this is expected during rapid seeking
					return;
				}

				if (e instanceof StaleWaiterError) {
					// iterator was stale before it got its turn
					return;
				}

				throw e;
			},
		});
	};

	const startAudioIterator = async ({
		nonce,
		playbackRate,
		startFromSecond,
		getIsPlaying,
		scheduleAudioNode,
		debugAudioScheduling,
		getTargetTime,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	}: {
		startFromSecond: number;
		nonce: Nonce;
		playbackRate: number;
		getIsPlaying: () => boolean;
		getAudioContextState: () => AudioContextState;
		getAudioContextOutputTimestamp: () => number;
		scheduleAudioNode: ScheduleAudioNode;
		debugAudioScheduling: boolean;
		getTargetTime: (
			mediaTimestamp: number,
			currentTime: number,
		) => number | null;
	}) => {
		if (muted) {
			return;
		}

		audioBufferIterator?.destroy(sharedAudioContext);
		// TODO: Delayhandle currently does nothing
		using delayHandle = delayPlaybackHandleIfNotPremounting();
		currentDelayHandle = delayHandle;

		const iterator = makeAudioIterator({
			startFromSecond,
			maximumTimestamp: getEndTime(),
			cache: prewarmedAudioIteratorCache,
			debugAudioScheduling,
		});
		audioIteratorsCreated++;
		audioBufferIterator = iterator;

		proceedScheduling({
			iterator,
			nonce,
			getTargetTime,
			getIsPlaying,
			playbackRate,
			scheduleAudioNode,
			debugAudioScheduling,
			onScheduled: () => {},
			getAudioContextState,
			getAudioContextOutputTimestamp,
		});
	};

	const seek = async ({
		newTime,
		nonce,
		playbackRate,
		getIsPlaying,
		scheduleAudioNode,
		debugAudioScheduling,
		getTargetTime,
		getAudioContextState,
		getAudioContextOutputTimestamp,
	}: {
		newTime: number;
		nonce: Nonce;
		playbackRate: number;
		getIsPlaying: () => boolean;
		scheduleAudioNode: ScheduleAudioNode;
		debugAudioScheduling: boolean;
		getTargetTime: (
			mediaTimestamp: number,
			currentTime: number,
		) => number | null;
		getAudioContextState: () => AudioContextState;
		getAudioContextOutputTimestamp: () => number;
	}) => {
		if (muted) {
			return;
		}

		if (getIsLooping()) {
			// If less than 1 second from the end away, we pre-warm a new iterator
			if (getEndTime() - newTime < 1) {
				prewarmedAudioIteratorCache.prewarmIteratorForLooping({
					timeToSeek: getStartTime(),
					maximumTimestamp: getEndTime(),
				});
			}
		}

		if (audioBufferIterator && !audioBufferIterator.isDestroyed()) {
			const queuedPeriod = audioBufferIterator.getQueuedPeriod();
			// If there is a missing period, but we'd have no chance to schedule nodes,
			// then let's not bother. Let's just leave the gap.
			const queuedPeriodMinusLatency: QueuedPeriod | null = queuedPeriod
				? {
						from:
							queuedPeriod.from -
							ALLOWED_GLOBAL_TIME_ANCHOR_SHIFT -
							sharedAudioContext.audioContext.baseLatency -
							sharedAudioContext.audioContext.outputLatency,
						until: queuedPeriod.until,
					}
				: null;
			const currentTimeIsAlreadyQueued = isAlreadyQueued(
				newTime,
				queuedPeriodMinusLatency,
			);
			if (currentTimeIsAlreadyQueued) {
				// current time is scheduled, will keep scheduling
				return;
			}

			const currentIteratorTimestamp = audioBufferIterator.guessNextTimestamp();
			if (
				currentIteratorTimestamp < newTime &&
				Math.abs(currentIteratorTimestamp - newTime) < 1
			) {
				// iterator is less than 1 second behind, we will just let it run
				return;
			}
		}

		await startAudioIterator({
			nonce,
			playbackRate,
			startFromSecond: newTime,
			getIsPlaying,
			scheduleAudioNode,
			debugAudioScheduling,
			getTargetTime,
			getAudioContextState,
			getAudioContextOutputTimestamp,
		});

		// Not further scheduling, initial iterator is already running
	};

	return {
		startAudioIterator,
		getAudioBufferIterator: () => audioBufferIterator,
		destroyIterator: () => {
			prewarmedAudioIteratorCache.destroy();
			audioBufferIterator?.destroy(sharedAudioContext);
			audioBufferIterator = null;

			if (currentDelayHandle) {
				currentDelayHandle.unblock();
				currentDelayHandle = null;
			}
		},
		seek,
		getAudioIteratorsCreated: () => audioIteratorsCreated,
		setMuted: (newMuted: boolean) => {
			muted = newMuted;
			gainNode.gain.value = muted ? 0 : currentVolume;
		},
		setVolume: (volume: number) => {
			currentVolume = Math.max(0, volume);
			gainNode.gain.value = muted ? 0 : currentVolume;
		},
		scheduleAudioChunk,
		waitForNScheduledNodes,
	};
};

export type AudioIteratorManager = ReturnType<typeof audioIteratorManager>;
