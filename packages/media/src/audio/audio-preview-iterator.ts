import {Internals} from 'remotion';
import type {PrewarmedAudioIteratorCache} from '../prewarm-iterator-for-looping';
import {ALLOWED_GLOBAL_TIME_ANCHOR_SHIFT} from '../set-global-time-anchor';
import type {SharedAudioContextForMediaPlayer} from '../shared-audio-context-for-media-player';

export const HEALTHY_BUFFER_THRESHOLD_SECONDS = 1;

export type QueuedNode = {
	node: AudioBufferSourceNode;
	timestamp: number;
	buffer: AudioBuffer;
	scheduledTime: number;
	playbackRate: number;
	scheduledAtAnchor: number;
};

export type QueuedPeriod = {
	from: number;
	until: number;
};

export const makeAudioIterator = ({
	startFromSecond,
	maximumTimestamp,
	cache,
	debugAudioScheduling,
}: {
	startFromSecond: number;
	maximumTimestamp: number;
	cache: PrewarmedAudioIteratorCache;
	debugAudioScheduling: boolean;
}) => {
	let destroyed = false;
	const iterator = cache.makeIteratorOrUsePrewarmed(
		startFromSecond,
		maximumTimestamp,
	);
	const queuedAudioNodes: QueuedNode[] = [];
	const audioChunksForAfterResuming: {
		buffer: AudioBuffer;
		timestamp: number;
	}[] = [];
	let mostRecentTimestamp = -Infinity;

	const cleanupAudioQueue = (
		audioContext: SharedAudioContextForMediaPlayer,
	) => {
		for (const node of queuedAudioNodes) {
			try {
				// When we unmount at the end of playback, we might not yet be done with audio anchors
				// we should not stop the nodes
				const isAlreadyPlaying =
					node.scheduledTime - ALLOWED_GLOBAL_TIME_ANCHOR_SHIFT <
					audioContext.audioContext.currentTime;

				// except for when the audio anchor changed (e.g. through a seek)
				const wasScheduledForThisAnchor =
					node.scheduledAtAnchor === audioContext.audioSyncAnchor.value;

				if (isAlreadyPlaying && wasScheduledForThisAnchor) {
					continue;
				}

				if (debugAudioScheduling) {
					const currentlyHearing =
						audioContext.audioContext.getOutputTimestamp().contextTime!;
					const nodeEndTime =
						node.scheduledTime + node.buffer.duration / node.playbackRate;

					Internals.Log.info(
						{logLevel: 'trace', tag: 'audio-scheduling'},
						`Stopping node ${node.timestamp.toFixed(3)}, currently hearing = ${currentlyHearing.toFixed(3)} currentTime = ${audioContext.audioContext.currentTime.toFixed(3)} nodeEndTime = ${nodeEndTime.toFixed(3)} scheduledTime = ${node.scheduledTime.toFixed(3)}`,
					);
				}

				node.node.stop();
			} catch {
				// Node may not have been started
			}
		}

		queuedAudioNodes.length = 0;
	};

	const removeAndReturnAllQueuedAudioNodes = () => {
		const nodes = queuedAudioNodes.slice();
		for (const node of nodes) {
			try {
				node.node.stop();
			} catch {
				// Node may not have been started
			}
		}

		queuedAudioNodes.length = 0;
		return nodes;
	};

	const addChunkForAfterResuming = (buffer: AudioBuffer, timestamp: number) => {
		audioChunksForAfterResuming.push({
			buffer,
			timestamp,
		});
	};

	const moveQueuedChunksToPauseQueue = () => {
		const toQueue = removeAndReturnAllQueuedAudioNodes();
		for (const chunk of toQueue) {
			addChunkForAfterResuming(chunk.buffer, chunk.timestamp);
		}

		if (debugAudioScheduling && toQueue.length > 0) {
			Internals.Log.trace(
				{logLevel: 'trace', tag: 'audio-scheduling'},
				`Moved ${toQueue.length} ${toQueue.length === 1 ? 'chunk' : 'chunks'} to pause queue (${toQueue[0].timestamp.toFixed(3)}-${toQueue[toQueue.length - 1].timestamp + toQueue[toQueue.length - 1].buffer.duration.toFixed(3)})`,
			);
		}
	};

	const getNumberOfChunksAfterResuming = () => {
		return audioChunksForAfterResuming.length;
	};

	const getNextFn = async () => {
		const next = await iterator.next();

		if (next.value) {
			mostRecentTimestamp = Math.max(
				mostRecentTimestamp,
				next.value.timestamp + next.value.duration,
			);
		}

		return next;
	};

	return {
		destroy: (audioContext: SharedAudioContextForMediaPlayer) => {
			cleanupAudioQueue(audioContext);
			destroyed = true;
			iterator.return().catch(() => undefined);
			audioChunksForAfterResuming.length = 0;
		},
		getNextFn,
		isDestroyed: () => {
			return destroyed;
		},

		addQueuedAudioNode: ({
			node,
			timestamp,
			buffer,
			scheduledTime,
			playbackRate,
			scheduledAtAnchor,
		}: {
			node: AudioBufferSourceNode;
			timestamp: number;
			buffer: AudioBuffer;
			scheduledTime: number;
			playbackRate: number;
			scheduledAtAnchor: number;
		}) => {
			queuedAudioNodes.push({
				node,
				timestamp,
				buffer,
				scheduledTime,
				playbackRate,
				scheduledAtAnchor,
			});
		},
		removeQueuedAudioNode: (node: AudioBufferSourceNode) => {
			const index = queuedAudioNodes.findIndex((n) => n.node === node);
			if (index !== -1) {
				queuedAudioNodes.splice(index, 1);
			}
		},
		getAndClearAudioChunksForAfterResuming: () => {
			const chunks = audioChunksForAfterResuming.slice();
			audioChunksForAfterResuming.length = 0;
			return chunks;
		},
		guessNextTimestamp: () => {
			return !Number.isFinite(mostRecentTimestamp)
				? startFromSecond
				: mostRecentTimestamp;
		},
		getQueuedPeriod: () => {
			let until = -Infinity;
			let from = Infinity;

			for (const node of queuedAudioNodes) {
				until = Math.max(until, node.timestamp + node.buffer.duration);
				from = Math.min(from, node.timestamp);
			}

			for (const chunk of audioChunksForAfterResuming) {
				until = Math.max(until, chunk.timestamp + chunk.buffer.duration);
				from = Math.min(from, chunk.timestamp);
			}

			if (!Number.isFinite(from) || !Number.isFinite(until)) {
				return null;
			}

			return {
				from,
				until,
			};
		},
		addChunkForAfterResuming,
		moveQueuedChunksToPauseQueue,
		getNumberOfChunksAfterResuming,
	};
};

export type AudioIterator = ReturnType<typeof makeAudioIterator>;

export const isAlreadyQueued = (
	time: number,
	queuedPeriod: {from: number; until: number} | undefined | null,
) => {
	if (!queuedPeriod) {
		return false;
	}

	return time >= queuedPeriod.from && time < queuedPeriod.until;
};
