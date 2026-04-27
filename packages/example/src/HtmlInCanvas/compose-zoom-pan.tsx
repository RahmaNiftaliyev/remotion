import React from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

/** Animated zoom and pan using every frame’s interpolation (no refs needed). */
export const HtmlInCanvasComposeZoomPan: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();

	const zoom = interpolate(frame, [0, durationInFrames - 1], [1, 1.35], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const panX = interpolate(frame, [0, durationInFrames - 1], [0, 180], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const panY = interpolate(frame, [0, durationInFrames - 1], [0, -120], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas
				width={width}
				height={height}
				onCompose={({source, target, width: w, height: h}) => {
					const ctx = target.getContext('2d');
					if (!ctx) {
						return;
					}

					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.clearRect(0, 0, w, h);
					ctx.save();
					ctx.translate(panX, panY);
					ctx.scale(zoom, zoom);
					ctx.drawImage(source, 0, 0, w, h);
					ctx.restore();
				}}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
