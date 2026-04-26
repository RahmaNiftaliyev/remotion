import {wave} from '@remotion/canvas-effects';
import React from 'react';
import {
	AbsoluteFill,
	Experimental,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const Scene: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();

	const progress = frame / durationInFrames;
	const hue = Math.round(progress * 360);

	return (
		<AbsoluteFill
			style={{
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 40,
				background: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${
					(hue + 80) % 360
				}, 80%, 40%))`,
				color: 'white',
				fontFamily:
					'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
				textAlign: 'center',
				fontSize: 56,
				fontWeight: 600,
				padding: '20px 40px',
				borderRadius: 24,
			}}
		>
			{frame}
		</AbsoluteFill>
	);
};

export const HtmlInCanvasDemo: React.FC = () => {
	const {width, height} = useVideoConfig();

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<Experimental.HtmlInCanvas
				width={width}
				height={height}
				effects={[wave({amplitude: 60, wavelength: 240})]}
			>
				<Scene />
			</Experimental.HtmlInCanvas>
		</AbsoluteFill>
	);
};
