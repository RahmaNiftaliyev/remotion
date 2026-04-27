import React from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

/** 2D rotation around the center using the canvas transform matrix. */
export const HtmlInCanvasComposeRotate: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();

	const rotation = interpolate(
		frame,
		[0, durationInFrames - 1],
		[0, Math.PI * 2],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		},
	);

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

					ctx.clearRect(0, 0, w, h);
					ctx.save();
					ctx.translate(w / 2, h / 2);
					ctx.rotate(rotation);
					ctx.translate(-w / 2, -h / 2);
					ctx.drawImage(source, 0, 0, w, h);
					ctx.restore();
				}}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
