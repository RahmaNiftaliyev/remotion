import {Video} from '@remotion/media';
import React from 'react';
import {Sequence, useVideoConfig} from 'remotion';

const SLICE_DURATION_FRAMES = 3; // 0.1sec at 30fps
const NUM_SLICES = 10;
const PREMOUNT_SEC = 0.5;

/**
 * Reproduces https://github.com/remotion-dev/remotion/issues/6727
 *
 * The outer Sequence starts at frame 15 with premountFor={15},
 * so it premounts at frame 0. Each inner Sequence also has premountFor={15}.
 * The issue is that 6 videos are premounted on frame 0 because
 * premounting cascades through nested Sequences unexpectedly.
 */
export const CascadingPremount: React.FC = () => {
	const src = 'https://remotion.media/video.mp4';
	const {fps} = useVideoConfig();

	return (
		<Sequence from={15} premountFor={15}>
			{new Array(NUM_SLICES).fill(0).map((_, i) => {
				const from = i * SLICE_DURATION_FRAMES;
				return (
					<Sequence
						key={i}
						from={from}
						durationInFrames={SLICE_DURATION_FRAMES}
						premountFor={PREMOUNT_SEC * fps}
					>
						<Video src={src} trimBefore={from} />
					</Sequence>
				);
			})}
		</Sequence>
	);
};
