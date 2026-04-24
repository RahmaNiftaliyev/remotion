import {ALL_FORMATS, AudioBufferSink, Input, UrlSource} from 'mediabunny';
import {expect, test} from 'vitest';
import {makeAudioIterator} from '../audio/audio-preview-iterator';

const makeCache = async () => {
	const input = new Input({
		source: new UrlSource('https://remotion.media/video.mp4'),
		formats: ALL_FORMATS,
	});
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!audioTrack) {
		throw new Error('No audio track found');
	}

	const audioBufferSink = new AudioBufferSink(audioTrack);

	return audioBufferSink;
};

const makeMockNode = () => {
	let stopped = false;
	const node = {
		stop: () => {
			stopped = true;
		},
	} as unknown as AudioBufferSourceNode;

	return {
		node,
		wasStopped: () => stopped,
	};
};

const makeMockBuffer = (duration: number) => {
	return {
		duration,
	} as unknown as AudioBuffer;
};

test('destroy should NOT stop nodes that are already playing with the same anchor', async () => {
	const audioSink = await makeCache();
	const iterator = makeAudioIterator({
		startFromSecond: 0,
		maximumTimestamp: Infinity,
		audioSink,
		logLevel: 'info',
		loop: false,
		playbackRate: 1,
		sequenceDurationInSeconds: 10,
	});

	const mock1 = makeMockNode();
	const mock2 = makeMockNode();

	// Add nodes scheduled at anchor 0, with scheduledTime in the past
	iterator.addQueuedAudioNode({
		node: mock1.node,
		timestamp: 0,
		buffer: makeMockBuffer(0.021),
		scheduledTime: 0.1, // in the past relative to currentTime=1.0
		scheduledAtAnchor: 0,
	});
	iterator.addQueuedAudioNode({
		node: mock2.node,
		timestamp: 0.021,
		buffer: makeMockBuffer(0.021),
		scheduledTime: 0.121,
		scheduledAtAnchor: 0,
	});

	// Destroy with same anchor (0) and currentTime well past scheduledTime
	iterator.destroy();

	// Nodes should NOT have been stopped because they are already playing
	// and were scheduled for the current anchor
	expect(mock1.wasStopped()).toBe(false);
	expect(mock2.wasStopped()).toBe(false);
});

test('destroy should stop nodes when the audio anchor changed (seek to different position)', async () => {
	const audioBufferSink = await makeCache();
	const iterator = makeAudioIterator({
		startFromSecond: 0,
		maximumTimestamp: Infinity,
		audioSink: audioBufferSink,
		logLevel: 'info',
		loop: false,
		playbackRate: 1,
		sequenceDurationInSeconds: 10,
	});

	const mock1 = makeMockNode();
	const mock2 = makeMockNode();

	// Add nodes scheduled at anchor 0
	iterator.addQueuedAudioNode({
		node: mock1.node,
		timestamp: 0,
		buffer: makeMockBuffer(0.021),
		scheduledTime: 0.1,
		scheduledAtAnchor: 0,
	});
	iterator.addQueuedAudioNode({
		node: mock2.node,
		timestamp: 0.021,
		buffer: makeMockBuffer(0.021),
		scheduledTime: 0.121,
		scheduledAtAnchor: 0,
	});

	// Destroy with a DIFFERENT anchor (simulating a seek happened)
	// Even though nodes are "already playing" (currentTime > scheduledTime),
	// they should be stopped because the anchor changed
	iterator.destroy();

	// Nodes SHOULD be stopped because the anchor changed (seek happened)
	expect(mock1.wasStopped()).toBe(true);
	expect(mock2.wasStopped()).toBe(true);
});
