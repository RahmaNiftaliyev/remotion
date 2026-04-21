import type {ScheduleAudioNodeOptions, ScheduleAudioNodeResult} from 'remotion';

export type SharedAudioContextForMediaPlayer = {
	audioContext: AudioContext;
	audioSyncAnchor: {value: number};
	scheduleAudioNode: (
		options: ScheduleAudioNodeOptions,
	) => ScheduleAudioNodeResult;
	getScheduledTime: (options: {
		mediaTimestamp: number;
		targetTime: number;
		currentTime: number;
		sequenceStartTime: number;
	}) => number;
	getDurationOfNode: (options: {
		mediaTimestamp: number;
		bufferDuration: number;
		sequenceEndTime: number;
		offset: number;
	}) => number;
};
