import {AbsoluteFill} from 'remotion';

const Component: React.FC = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#222',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					filter: 'drop-shadow(rgb(160, 216, 62) 0px 0px 100px)',
				}}
			>
				<span
					style={{
						fontFamily: 'sans-serif',
						fontSize: 140,
						color: 'rgb(160, 216, 62)',
						filter: 'drop-shadow(rgba(0, 0, 0, 0.35) 5px 5px 15px)',
					}}
				>
					ordering
				</span>
			</div>
		</AbsoluteFill>
	);
};

export const issue7050Repro = {
	component: Component,
	id: 'issue-7050-repro',
	width: 800,
	height: 400,
	fps: 25,
	durationInFrames: 1,
} as const;
