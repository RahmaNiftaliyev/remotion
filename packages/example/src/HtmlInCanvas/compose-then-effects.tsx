import {blur} from '@remotion/canvas-effects';
import React from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

/**
 * Compose stage (slight scale pulse) then canvas-effects — effects run on top of the composed image.
 */
export const HtmlInCanvasComposeThenEffects: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();

	const scale = interpolate(frame, [0, durationInFrames - 1], [1, 1.08], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const blurRadius = interpolate(frame, [0, durationInFrames - 1], [2, 18], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas
				width={width}
				height={height}
				onPaint={({canvas}) => {
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						return;
					}

					ctx.clearRect(0, 0, width, height);
					ctx.save();
					ctx.translate(width / 2, height / 2);
					ctx.scale(scale, scale);
					ctx.translate(-width / 2, -height / 2);
					ctx.drawImage(canvas, 0, 0, width, height);
					ctx.restore();
				}}
				_experimentalEffects={[blur({radius: blurRadius})]}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
