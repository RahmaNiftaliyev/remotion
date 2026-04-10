import {Audio} from '@remotion/media';
import {parseMedia} from '@remotion/media-parser';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

const AUDIO_URL =
	'https://media.mkv.so/usr_f7260fb5-50f0-46c4-baee-9d50058a30c6/prj_9df9398c-f152-4a4d-8027-be122cb29ef9/RNX8pupQfgAOHdyB.mp3.m4a';

export const calculateMetadataRemoteAudio = async () => {
	const fps = 30;

	const {slowDurationInSeconds} = await parseMedia({
		src: AUDIO_URL,
		fields: {
			slowDurationInSeconds: true,
		},
	});

	return {
		durationInFrames: Math.ceil(slowDurationInSeconds * fps),
		fps,
		width: 800,
		height: 800,
	};
};

export const RemoteAudioTestbed: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();

	const currentTime = (frame / fps).toFixed(2);
	const totalTime = (durationInFrames / fps).toFixed(2);
	const progress = frame / durationInFrames;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#1a1a2e',
				justifyContent: 'center',
				alignItems: 'center',
				fontFamily: 'sans-serif',
			}}
		>
			<Audio src={AUDIO_URL} debugAudioScheduling />
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 24,
				}}
			>
				<div style={{fontSize: 32, color: '#e0e0e0', fontWeight: 'bold'}}>
					Remote Audio Testbed
				</div>
				<div
					style={{
						fontSize: 18,
						color: '#aaa',
						maxWidth: 600,
						wordBreak: 'break-all',
						textAlign: 'center',
					}}
				>
					{AUDIO_URL}
				</div>
				<div style={{fontSize: 48, color: '#00d4ff'}}>
					{currentTime}s / {totalTime}s
				</div>
				<div
					style={{
						width: 600,
						height: 12,
						backgroundColor: '#333',
						borderRadius: 6,
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							width: `${progress * 100}%`,
							height: '100%',
							backgroundColor: '#00d4ff',
							borderRadius: 6,
						}}
					/>
				</div>
				<div style={{fontSize: 16, color: '#888'}}>
					Frame {frame} / {durationInFrames} @ {fps}fps
				</div>
			</div>
		</AbsoluteFill>
	);
};
