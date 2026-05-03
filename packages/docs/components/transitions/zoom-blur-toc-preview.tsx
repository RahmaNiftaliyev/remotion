import type {PlayerRef} from '@remotion/player';
import {Player} from '@remotion/player';
import React, {useEffect, useRef} from 'react';
import {staticFile} from 'remotion';
import {useHtmlInCanvasDocsDemoBranch} from '../demos/useHtmlInCanvasDocsDemoBranch';
import {
	presentationCompositionHeight,
	presentationCompositionWidth,
} from '../TableOfContents/transitions/presentations';
import {ZoomBlurTransitionPreviewThumb} from './zoom-blur-preview';

export const ZoomBlurTocPreview: React.FC = () => {
	const branch = useHtmlInCanvasDocsDemoBranch();
	const ref = useRef<PlayerRef>(null);

	const tileHeight = 60;
	const tileWidth =
		(tileHeight * presentationCompositionWidth) / presentationCompositionHeight;
	const sharedStyle: React.CSSProperties = {
		width: tileWidth,
		height: tileHeight,
		flex: 'none',
		borderRadius: 6,
		display: 'block',
		objectFit: 'cover',
	};

	useEffect(() => {
		const {current} = ref;
		if (!current) {
			return;
		}

		const callback = () => {
			current?.seekTo(0);
			current?.play();
		};

		current?.getContainerNode()?.addEventListener('pointerenter', callback);

		return () => {
			current
				?.getContainerNode()
				?.removeEventListener('pointerenter', callback);
		};
	}, [branch]);

	if (branch === 'pending') {
		return (
			<div
				style={{
					...sharedStyle,
					backgroundColor: '#000',
				}}
			/>
		);
	}

	if (branch === 'fallback') {
		return (
			<video
				muted
				playsInline
				preload="auto"
				src={staticFile('img/zoom-blur-transition-thumb.mp4')}
				style={sharedStyle}
				onPointerEnter={(event) => {
					const video = event.currentTarget;
					video.currentTime = 0;
					void video.play();
				}}
			/>
		);
	}

	return (
		<Player
			ref={ref}
			acknowledgeRemotionLicense
			component={ZoomBlurTransitionPreviewThumb}
			compositionHeight={presentationCompositionHeight}
			compositionWidth={presentationCompositionWidth}
			durationInFrames={60}
			fps={30}
			numberOfSharedAudioTags={0}
			style={sharedStyle}
		/>
	);
};
