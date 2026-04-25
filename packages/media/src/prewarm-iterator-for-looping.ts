import type {CanvasSink, WrappedCanvas} from 'mediabunny';

export const makePrewarmedVideoIteratorCache = (videoSink: CanvasSink) => {
	const prewarmedVideoIterators: Map<
		number,
		AsyncGenerator<WrappedCanvas, void, unknown>
	> = new Map();

	const prewarmIteratorForLooping = ({timeToSeek}: {timeToSeek: number}) => {
		if (!prewarmedVideoIterators.has(timeToSeek)) {
			prewarmedVideoIterators.set(timeToSeek, videoSink.canvases(timeToSeek));
		}
	};

	const makeIteratorOrUsePrewarmed = (timeToSeek: number) => {
		const prewarmedIterator = prewarmedVideoIterators.get(timeToSeek);
		if (prewarmedIterator) {
			prewarmedVideoIterators.delete(timeToSeek);
			return prewarmedIterator;
		}

		const iterator = videoSink.canvases(timeToSeek);
		return iterator;
	};

	const destroy = () => {
		for (const iterator of prewarmedVideoIterators.values()) {
			iterator.return();
		}

		prewarmedVideoIterators.clear();
	};

	return {
		prewarmIteratorForLooping,
		makeIteratorOrUsePrewarmed,
		destroy,
	};
};

export type PrewarmedVideoIteratorCache = ReturnType<
	typeof makePrewarmedVideoIteratorCache
>;
