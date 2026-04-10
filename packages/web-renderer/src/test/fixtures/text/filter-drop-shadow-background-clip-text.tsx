import React from 'react';
import {AbsoluteFill} from 'remotion';

const Component: React.FC = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#222',
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				gap: 40,
			}}
		>
			{/* Case 1: filter drop-shadow on element with background-clip: text */}
			<span
				style={{
					fontSize: 80,
					fontWeight: 900,
					backgroundClip: 'text',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundImage:
						'linear-gradient(90deg, rgb(160, 216, 62), rgb(202, 233, 147), rgb(160, 216, 62))',
					filter: 'drop-shadow(white 4px 4px 6px)',
					fontFamily: 'sans-serif',
				}}
			>
				Shadow
			</span>

			{/* Case 2: parent wrapper filter + child background-clip text with own filter */}
			<div
				style={{
					filter:
						'drop-shadow(rgb(160, 216, 62) 0px 0px 40px) drop-shadow(white 5px 5px 15px)',
				}}
			>
				<span
					style={{
						fontSize: 80,
						fontWeight: 900,
						backgroundClip: 'text',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundImage:
							'linear-gradient(90deg, rgb(160, 216, 62), rgb(202, 233, 147), rgb(160, 216, 62))',
						filter: 'drop-shadow(rgba(255, 255, 255, 0.5) 3px 3px 4px)',
						fontFamily: 'sans-serif',
					}}
				>
					Both
				</span>
			</div>

			{/* Case 3: filter drop-shadow on regular text (baseline) */}
			<span
				style={{
					fontSize: 80,
					fontWeight: 900,
					color: 'red',
					filter: 'drop-shadow(white 4px 4px 6px)',
					fontFamily: 'sans-serif',
				}}
			>
				Baseline
			</span>
		</AbsoluteFill>
	);
};

export const filterDropShadowBackgroundClipText = {
	component: Component,
	id: 'filter-drop-shadow-background-clip-text',
	width: 600,
	height: 500,
	fps: 25,
	durationInFrames: 1,
} as const;
