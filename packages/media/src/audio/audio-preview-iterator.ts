import type {AudioBufferSink} from 'mediabunny';
import type {LogLevel} from 'remotion';
import {Internals} from 'remotion';
import {makeIteratorWithPriming} from '../make-iterator-with-priming';
import type {SharedAudioContextForMediaPlayer} from '../shared-audio-context-for-media-player';

export const HEALTHY_BUFFER_THRESHOLD_SECONDS = 1;
export const ALLOWED_GLOBAL_TIME_ANCHOR_SHIFT = 0.1;

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
	logLevel,
	audioSink,
}: {
	startFromSecond: number;
	maximumTimestamp: number;
	logLevel: LogLevel;
	audioSink: AudioBufferSink;
}) => {
	let destroyed = false;
	const iterator = makeIteratorWithPriming({
		audioSink,
		timeToSeek: startFromSecond,
		maximumTimestamp,
	});
	const queuedAudioNodes: QueuedNode[] = [];
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
					audioContext.audioContext.currentTime!;

				// except for when the audio anchor changed (e.g. through a seek)
				const wasScheduledForThisAnchor =
					node.scheduledAtAnchor === audioContext.audioSyncAnchor.value;

				if (isAlreadyPlaying && wasScheduledForThisAnchor) {
					console.log('not cleaning up!');
					continue;
				}

				const currentlyHearing =
					audioContext.audioContext.getOutputTimestamp().contextTime!;
				const nodeEndTime =
					node.scheduledTime + node.buffer.duration / node.playbackRate;

				Internals.Log.verbose(
					{logLevel, tag: 'audio-scheduling'},
					`Stopping node ${node.timestamp.toFixed(3)}, currently hearing = ${currentlyHearing.toFixed(3)} currentTime = ${audioContext.audioContext.currentTime.toFixed(3)} nodeEndTime = ${nodeEndTime.toFixed(3)} scheduledTime = ${node.scheduledTime.toFixed(3)}`,
				);

				node.node.stop();
			} catch {
				// Node may not have been started
			}
		}

		queuedAudioNodes.length = 0;
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

			if (!Number.isFinite(from) || !Number.isFinite(until)) {
				return null;
			}

			return {
				from,
				until,
			};
		},
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
