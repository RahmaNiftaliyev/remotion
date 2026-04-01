import {expect, test} from 'bun:test';
import {getMediaDuration} from '../get-media-duration.js';

test('playbackRate 2.45 with 300 composition frames returns 300', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 2.45,
		trimBefore: undefined,
		trimAfter: undefined,
		parentSequenceDurationInFrames: null,
	});

	expect(duration).toBe(300);
});

test('playbackRate 1 returns composition duration unchanged', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 1,
		trimBefore: undefined,
		trimAfter: undefined,
		parentSequenceDurationInFrames: null,
	});

	expect(duration).toBe(300);
});

test('playbackRate 0.5 with 300 composition frames returns 300', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 0.5,
		trimBefore: undefined,
		trimAfter: undefined,
		parentSequenceDurationInFrames: null,
	});

	expect(duration).toBe(300);
});

test('parentSequence caps the duration', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 1,
		trimBefore: undefined,
		trimAfter: undefined,
		parentSequenceDurationInFrames: 100,
	});

	expect(duration).toBe(100);
});

test('parentSequence with playbackRate 2.45 caps correctly', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 2.45,
		trimBefore: undefined,
		trimAfter: undefined,
		parentSequenceDurationInFrames: 100,
	});

	expect(duration).toBe(245);
});

test('trimBefore is accounted for', () => {
	const duration = getMediaDuration({
		compositionDurationInFrames: 300,
		playbackRate: 2.45,
		trimBefore: 30,
		trimAfter: undefined,
		parentSequenceDurationInFrames: null,
	});

	expect(duration).toBe(300);
});
