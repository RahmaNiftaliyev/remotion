import type {AudioBufferSink, WrappedAudioBuffer} from 'mediabunny';

const AUDIO_PRIMING_SECONDS = 0.5;

async function* makeIteratorWithPrimingInner(
	audioSink: AudioBufferSink,
	timeToSeek: number,
	maximumTimestamp: number,
): AsyncGenerator<WrappedAudioBuffer, void, unknown> {
	const primingStart = Math.max(0, timeToSeek - AUDIO_PRIMING_SECONDS);
	const iterator = audioSink.buffers(primingStart, maximumTimestamp);

	for await (const buffer of iterator) {
		if (buffer.timestamp + buffer.duration <= timeToSeek) {
			continue;
		}

		yield buffer;
	}
}

export const makeIteratorWithPriming = ({
	audioSink,
	timeToSeek,
	maximumTimestamp,
}: {
	audioSink: AudioBufferSink;
	timeToSeek: number;
	maximumTimestamp: number;
}): AsyncGenerator<WrappedAudioBuffer, void, unknown> => {
	return makeIteratorWithPrimingInner(audioSink, timeToSeek, maximumTimestamp);
};
