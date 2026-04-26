import {blur, tint} from '@remotion/canvas-effects';
import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	Solid,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// Demonstrates the canvas-effect chain with `<Solid>` as the source. The chain
// runs a separable Gaussian blur (WebGL2) followed by a tint pass (2D),
// exercising the runtime's cross-backend transfer (createImageBitmap) inside
// a single chain.
export const SolidEffectsDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();

	const radius = interpolate(frame, [0, durationInFrames - 1], [8, 64], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const tintAmount = interpolate(frame, [0, durationInFrames - 1], [0.1, 0.6], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<Solid
				color="hotpink"
				width={width}
				height={height}
				effects={[blur({radius}), tint({color: 'cyan', amount: tintAmount})]}
			/>
		</AbsoluteFill>
	);
};
