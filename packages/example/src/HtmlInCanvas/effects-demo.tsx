import {blur, tint, wave} from '@remotion/canvas-effects';
import React from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

export const HtmlInCanvasEffectsDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();

	const blurRadius = interpolate(frame, [0, durationInFrames - 1], [0, 24], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const tintAmount = interpolate(frame, [0, durationInFrames - 1], [0, 0.4], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas
				width={width}
				height={height}
				_experimentalEffects={[
					wave({amplitude: 40, wavelength: 240}),
					blur({radius: blurRadius}),
					tint({color: 'cyan', amount: tintAmount}),
				]}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
