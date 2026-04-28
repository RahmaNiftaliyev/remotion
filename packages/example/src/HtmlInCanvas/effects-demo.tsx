import React from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

export const HtmlInCanvasEffectsDemo: React.FC = () => {
	const {width, height} = useVideoConfig();

	const scale = spring({
		frame: useCurrentFrame(),
		fps: useVideoConfig().fps,
		config: {
			damping: 10,
			stiffness: 100,
		},
	});

	return (
		<AbsoluteFill>
			<HtmlInCanvas
				width={width}
				height={height}
				style={{scale}}
				onPaint={({canvas, element}) => {
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						throw new Error(
							'Failed to acquire 2D context for <HtmlInCanvas> canvas',
						);
					}

					ctx.reset();
					ctx.rotate((15 * Math.PI) / 180);
					ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);
					const transform = ctx.drawElementImage(element, 0, 0);
					element.style.transform = transform.toString();
				}}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
