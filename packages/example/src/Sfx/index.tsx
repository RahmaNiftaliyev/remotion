import {whip, whoosh} from '@remotion/sfx';
import React from 'react';
import {Audio, Sequence} from 'remotion';

export const SfxExample: React.FC = () => {
	return (
		<>
			<Sequence from={0} durationInFrames={30}>
				<Audio src={whip} />
			</Sequence>
			<Sequence from={30} durationInFrames={30}>
				<Audio src={whoosh} />
			</Sequence>
		</>
	);
};
