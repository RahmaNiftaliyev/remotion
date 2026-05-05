import React from 'react';
import {Composition} from 'remotion';
import {Minimal} from './Minimal';

export const ReproRoot: React.FC = () => {
	return (
		<Composition
			id="minimal"
			component={Minimal}
			fps={30}
			width={640}
			height={360}
			durationInFrames={60}
		/>
	);
};
