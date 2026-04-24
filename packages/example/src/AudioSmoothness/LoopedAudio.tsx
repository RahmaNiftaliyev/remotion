import {Audio} from '@remotion/media';
import React from 'react';
import {Composition, Sequence} from 'remotion';

const src = 'https://remotion.media/dialogue.wav';

const Component: React.FC = () => {
	return (
		<Sequence durationInFrames={420} from={100}>
			<Audio src={src} trimBefore={10 * 30} trimAfter={11 * 30} loop />
		</Sequence>
	);
};

export const AudioSmoothnessLoopedAudioComp: React.FC = () => {
	return (
		<Composition
			component={Component}
			id="audio-smoothness-looped-audio"
			fps={30}
			width={1920}
			height={1080}
			durationInFrames={600}
		/>
	);
};
