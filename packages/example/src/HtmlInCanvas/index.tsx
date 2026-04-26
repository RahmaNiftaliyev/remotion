import {blur, tint, wave} from '@remotion/canvas-effects';
import React from 'react';
import {
	AbsoluteFill,
	Experimental,
	interpolate,
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
			<Experimental.HtmlInCanvas
				width={width}
				height={height}
				effects={[
					wave({amplitude: 40, wavelength: 240}),
					blur({radius: blurRadius}),
					tint({color: 'cyan', amount: tintAmount}),
				]}
			>
				<Scene />
			</Experimental.HtmlInCanvas>
		</AbsoluteFill>
	);
};
