import type {AudioBufferSink, WrappedAudioBuffer} from 'mediabunny';

const AUDIO_PRIMING_SECONDS = 0.5;

async function* makeIteratorWithPrimingInner(
	audioSink: AudioBufferSink,
	timeToSeek: number,
	maximumTimestamp: number,
): AsyncGenerator<WrappedAudioBuffer, void, unknown> {
	const primingStart = Math.max(0, timeToSeek - AUDIO_PRIMING_SECONDS);
	const iterator = audioSink.buffers(primingStart, maximumTimestamp);

	console.log({timeToSeek, maximumTimestamp});
	for await (const buffer of iterator) {
		if (buffer.timestamp + buffer.duration <= timeToSeek) {
			continue;
		}

		yield buffer;
	}
}

async function* makeLoopingIterator(
	audioSink: AudioBufferSink,
	timeToSeek: number,
	maximumTimestamp: number,
): AsyncGenerator<WrappedAudioBuffer, void, unknown> {
	while (true) {
		yield* makeIteratorWithPrimingInner(
			audioSink,
			timeToSeek,
			maximumTimestamp,
		);
	}
}

export const makeIteratorWithPriming = ({
	audioSink,
	timeToSeek,
	maximumTimestamp,
	loop,
}: {
	audioSink: AudioBufferSink;
	timeToSeek: number;
	maximumTimestamp: number;
	loop: boolean;
}): AsyncGenerator<WrappedAudioBuffer, void, unknown> => {
	if (loop) {
		return makeLoopingIterator(audioSink, timeToSeek, maximumTimestamp);
	}

	return makeIteratorWithPrimingInner(audioSink, timeToSeek, maximumTimestamp);
};
