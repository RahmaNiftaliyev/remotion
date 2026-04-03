import {useCallback, useContext, useEffect, type FC} from 'react';
import {Internals} from 'remotion';
import {useIsVideoComposition} from '../../helpers/is-current-selected-still';
import {TimelineZoomCtx} from '../../state/timeline-zoom';
import {scrollableRef, timelineVerticalScroll} from './timeline-refs';
import {getFrameFromX} from './timeline-scroll-logic';

const ZOOM_WHEEL_DELTA = 0.005;

export const TimelinePinchZoom: FC = () => {
	const isVideoComposition = useIsVideoComposition();
	const videoConfig = Internals.useUnsafeVideoConfig();
	const {canvasContent} = useContext(Internals.CompositionManager);
	const {setZoom} = useContext(TimelineZoomCtx);

	const onWheel = useCallback(
		(e: WheelEvent) => {
			if (!isVideoComposition) {
				return;
			}

			const {ctrlKey, metaKey, clientX} = e;
			if (!(ctrlKey || metaKey)) {
				return;
			}

			if (!videoConfig || videoConfig.durationInFrames < 2) {
				return;
			}

			if (!canvasContent || canvasContent.type !== 'composition') {
				return;
			}

			const scrollEl = scrollableRef.current;
			if (!scrollEl) {
				return;
			}

			e.preventDefault();

			const rect = scrollEl.getBoundingClientRect();
			const clampedClientX = Math.min(Math.max(clientX, rect.left), rect.right);
			const clientXInContent = clampedClientX + scrollEl.scrollLeft - rect.left;

			const width = scrollEl.scrollWidth;
			const anchorFrame = getFrameFromX({
				clientX: clientXInContent,
				durationInFrames: videoConfig.durationInFrames,
				width,
				extrapolate: 'clamp',
			});

			const {deltaMode} = e;
			let {deltaY} = e;
			if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
				deltaY *= 16;
			} else if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
				deltaY *= scrollEl.clientHeight;
			}

			setZoom(
				canvasContent.compositionId,
				(z) => z - deltaY * ZOOM_WHEEL_DELTA,
				{anchorFrame},
			);
		},
		[isVideoComposition, videoConfig, canvasContent, setZoom],
	);

	useEffect(() => {
		const el = timelineVerticalScroll.current;
		if (!el) {
			return;
		}

		el.addEventListener('wheel', onWheel, {passive: false});
		return () => {
			el.removeEventListener('wheel', onWheel);
		};
	}, [onWheel]);

	return null;
};
