import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

export const HtmlInCanvasScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();

	const progress = frame / Math.max(durationInFrames, 1);
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
