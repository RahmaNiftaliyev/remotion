import React, {useLayoutEffect, useRef} from 'react';
import {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '../types';

export type ZoomBlurProps = {};

export const ZoomBlurPresentation: React.FC<
	TransitionPresentationComponentProps<ZoomBlurProps>
> = ({children, onElementImage}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasSubtreeStyle: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
		};
	}, []);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		canvas.layoutSubtree = true;

		const onPaint = () => {
			const firstChild = canvas.firstChild as HTMLElement;

			if (!firstChild) {
				return;
			}

			const elementImage = canvas.captureElementImage(firstChild);
			onElementImage(elementImage);
		};

		canvas.addEventListener('paint', onPaint);

		return () => {
			canvas.removeEventListener('paint', onPaint);
		};
	}, [onElementImage]);

	return (
		<AbsoluteFill>
			<canvas ref={canvasRef} style={canvasSubtreeStyle}>
				{children}
			</canvas>
		</AbsoluteFill>
	);
};

export const zoomBlur = (
	props: ZoomBlurProps,
): TransitionPresentation<ZoomBlurProps> => {
	return {component: ZoomBlurPresentation, props: props ?? {}};
};
