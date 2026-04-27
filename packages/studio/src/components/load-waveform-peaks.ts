import {ALL_FORMATS, AudioSampleSink, Input, UrlSource} from 'mediabunny';
import {
	createWaveformPeakProcessor,
	emitWaveformProgress,
} from './waveform-peak-processor';

const TARGET_SAMPLE_RATE = 100;
const DEFAULT_PROGRESS_INTERVAL_IN_MS = 50;

const peaksCache = new Map<string, Float32Array>();

export {TARGET_SAMPLE_RATE};

type Progress = {
	readonly peaks: Float32Array;
	readonly completedPeaks: number;
	readonly totalPeaks: number;
	readonly final: boolean;
};

type LoadWaveformPeaksOptions = {
	readonly onProgress?: (progress: Progress) => void;
	readonly progressIntervalInMs?: number;
};

export async function loadWaveformPeaks(
	url: string,
	signal: AbortSignal,
	options?: LoadWaveformPeaksOptions,
): Promise<Float32Array> {
	const cached = peaksCache.get(url);
	if (cached) {
		emitWaveformProgress({
			peaks: cached,
			completedPeaks: cached.length,
			totalPeaks: cached.length,
			final: true,
			onProgress: options?.onProgress,
		});
		return cached;
	}

	const input = new Input({
		formats: ALL_FORMATS,
		source: new UrlSource(url),
	});

	try {
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) {
			return new Float32Array(0);
		}

		const {sampleRate} = audioTrack;
		const durationInSeconds = await audioTrack.computeDuration();
		const totalPeaks = Math.ceil(durationInSeconds * TARGET_SAMPLE_RATE);
		const samplesPerPeak = Math.max(
			1,
			Math.floor(sampleRate / TARGET_SAMPLE_RATE),
		);

		const sink = new AudioSampleSink(audioTrack);
		const processor = createWaveformPeakProcessor({
			totalPeaks,
			samplesPerPeak,
			onProgress: options?.onProgress,
			progressIntervalInMs:
				options?.progressIntervalInMs ?? DEFAULT_PROGRESS_INTERVAL_IN_MS,
			now: () => Date.now(),
		});

		for await (const sample of sink.samples()) {
			if (signal.aborted) {
				sample.close();
				return new Float32Array(0);
			}

			const bytesNeeded = sample.allocationSize({
				format: 'f32',
				planeIndex: 0,
			});
			const floats = new Float32Array(bytesNeeded / 4);
			sample.copyTo(floats, {format: 'f32', planeIndex: 0});
			const channels = Math.max(1, sample.numberOfChannels);
			sample.close();

			processor.processSampleChunk(floats, channels);
		}

		processor.finalize();
		const {peaks} = processor;
		peaksCache.set(url, peaks);
		return peaks;
	} finally {
		input.dispose();
	}
}
