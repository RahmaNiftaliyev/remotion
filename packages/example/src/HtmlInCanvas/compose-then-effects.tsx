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
				onPaint={({canvas: source, target, width: w, height: h}) => {
					const ctx = target.getContext('2d');
					if (!ctx) {
						return;
					}

					ctx.clearRect(0, 0, w, h);
					ctx.save();
					ctx.translate(w / 2, h / 2);
					ctx.scale(scale, scale);
					ctx.translate(-w / 2, -h / 2);
					ctx.drawImage(source, 0, 0, w, h);
					ctx.restore();
				}}
				_experimentalEffects={[blur({radius: blurRadius})]}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
