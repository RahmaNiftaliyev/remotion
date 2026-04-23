import {Log, type LogLevel} from '../log.js';

export const waitUntilActuallyResumed = (
	audioContext: AudioContext,
	logLevel: LogLevel,
): Promise<void> => {
	return new Promise((resolve) => {
		const startCurrentTime = audioContext.currentTime;
		const startOutputContextTime =
			audioContext.getOutputTimestamp().contextTime;
		const startWallClock = performance.now();

		const check = () => {
			const {currentTime} = audioContext;
			const outputTimestamp = audioContext.getOutputTimestamp();
			const elapsedWallClock = performance.now() - startWallClock;

			if (
				startOutputContextTime !== undefined &&
				outputTimestamp.contextTime !== undefined &&
				outputTimestamp.contextTime > startOutputContextTime
			) {
				Log.info(
					{logLevel, tag: 'audio'},
					`waitUntilActuallyResumed: getOutputTimestamp.contextTime advanced from ${startOutputContextTime.toFixed(
						6,
					)} to ${outputTimestamp.contextTime.toFixed(
						6,
					)} after ${elapsedWallClock.toFixed(
						1,
					)}ms. currentTime=${currentTime.toFixed(6)} (advanced by ${(
						currentTime - startCurrentTime
					).toFixed(6)}), getOutputTimestamp.performanceTime=${
						outputTimestamp.performanceTime?.toFixed(1) ?? 'undefined'
					}`,
				);
				resolve();
				return;
			}

			requestAnimationFrame(check);
		};

		requestAnimationFrame(check);
	});
};
