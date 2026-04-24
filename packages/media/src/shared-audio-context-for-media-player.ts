import type {ScheduleAudioNodeOptions, ScheduleAudioNodeResult} from 'remotion';

export type SharedAudioContextForMediaPlayer = {
	audioContext: AudioContext;
	audioSyncAnchor: {value: number};
	scheduleAudioNode: (
		options: ScheduleAudioNodeOptions,
	) => ScheduleAudioNodeResult;
	unscheduleAudioNode: (node: AudioBufferSourceNode) => void;
};
