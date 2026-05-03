import type {PlayerRef} from '@remotion/player';
import {Player} from '@remotion/player';
import React, {useEffect, useRef} from 'react';
import {staticFile} from 'remotion';
import {useHtmlInCanvasDocsDemoBranch} from '../demos/useHtmlInCanvasDocsDemoBranch';
import {
	presentationCompositionHeight,
	presentationCompositionWidth,
} from '../TableOfContents/transitions/presentations';
import {ZoomBlurTransitionPreview} from './zoom-blur-preview';

const sharedStyle: React.CSSProperties = {
	height: 60,
	borderRadius: 6,
	display: 'block',
	objectFit: 'cover',
};

export const ZoomBlurTocPreview: React.FC = () => {
	const branch = useHtmlInCanvasDocsDemoBranch();
	const ref = useRef<PlayerRef>(null);

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
					width: '100%',
					backgroundColor: '#000',
				}}
			/>
		);
	}

	if (branch === 'fallback') {
		return (
			<video
				autoPlay
				loop
				muted
				playsInline
				src={staticFile('img/zoom-blur-transition-thumb.mp4')}
				style={{
					...sharedStyle,
					width: '100%',
				}}
			/>
		);
	}

	return (
		<Player
			ref={ref}
			acknowledgeRemotionLicense
			component={ZoomBlurTransitionPreview}
			compositionHeight={presentationCompositionHeight}
			compositionWidth={presentationCompositionWidth}
			durationInFrames={90}
			fps={30}
			numberOfSharedAudioTags={0}
			style={sharedStyle}
		/>
	);
};
