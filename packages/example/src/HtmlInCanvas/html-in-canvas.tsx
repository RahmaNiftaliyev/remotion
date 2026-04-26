import React, {useEffect, useRef} from 'react';
import {
	cancelRender,
	continueRender,
	delayRender,
	useCurrentFrame,
} from 'remotion';

// Type augmentation for the WICG html-in-canvas proposal:
// https://github.com/WICG/html-in-canvas
//
// Requires Chrome Canary with chrome://flags/#canvas-draw-element enabled, so
// that both drawElementImage() and canvas.requestPaint() are available.
//
// The current Chromium implementation requires the element passed to
// drawElementImage() to be an immediate child of the canvas, and the canvas
// must have its `layoutSubtree` property set to true so the children are
// actually laid out (instead of being treated as fallback content).
type Canvas2DWithDrawElement = CanvasRenderingContext2D & {
	drawElementImage: (
		element: Element,
		dx: number,
		dy: number,
		dwidth: number,
		dheight: number,
	) => DOMMatrix;
};

type HTMLCanvasWithLayoutSubtree = HTMLCanvasElement & {
	layoutSubtree?: boolean;
	requestPaint: () => void;
};

const isHtmlInCanvasSupported = () => {
	if (typeof document === 'undefined') {
		return false;
	}

	const canvas = document.createElement(
		'canvas',
	) as HTMLCanvasWithLayoutSubtree;
	const ctx = canvas.getContext('2d') as Canvas2DWithDrawElement | null;
	return (
		typeof ctx?.drawElementImage === 'function' &&
		typeof canvas.requestPaint === 'function'
	);
};

export type ApplyCanvasEffect = (params: {
	source: HTMLCanvasElement;
	target: HTMLCanvasElement;
	frame: number;
	width: number;
	height: number;
}) => void;

export const HtmlInCanvas: React.FC<{
	readonly width: number;
	readonly height: number;
	readonly applyEffect: ApplyCanvasEffect;
	readonly children: React.ReactNode;
}> = ({width, height, applyEffect, children}) => {
	const frame = useCurrentFrame();

	const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sceneRef = useRef<HTMLDivElement | null>(null);
	const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Mark the source canvas as a layoutSubtree root once on mount so its
	// child <div ref={sceneRef}> participates in layout/paint and can be
	// captured via drawElementImage().
	useEffect(() => {
		if (!isHtmlInCanvasSupported()) {
			cancelRender(
				new Error(
					'HTML in Canvas is not supported. Open this page in Chrome Canary with chrome://flags/#canvas-draw-element enabled.',
				),
			);
			return;
		}

		const sourceCanvas =
			sourceCanvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		if (!sourceCanvas) {
			return;
		}

		sourceCanvas.layoutSubtree = true;
	}, []);

	useEffect(() => {
		const sourceCanvas =
			sourceCanvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		const sceneEl = sceneRef.current;
		const outputCanvas = outputCanvasRef.current;
		if (!sourceCanvas || !sceneEl || !outputCanvas) {
			return;
		}

		const ctx = sourceCanvas.getContext('2d') as Canvas2DWithDrawElement | null;
		if (!ctx) {
			return;
		}

		const handle = delayRender(`Painting HTML in canvas (frame ${frame})`);
		let resolved = false;
		let cancelled = false;

		const capture = () => {
			if (cancelled) {
				return;
			}

			try {
				ctx.reset();
				ctx.drawElementImage(sceneEl, 0, 0, width, height);

				applyEffect({
					source: sourceCanvas,
					target: outputCanvas,
					frame,
					width,
					height,
				});

				resolved = true;
				continueRender(handle);
			} catch (err) {
				resolved = true;
				cancelRender(err as Error);
			}
		};

		const onPaint = () => {
			sourceCanvas.removeEventListener('paint', onPaint);
			capture();
		};

		sourceCanvas.addEventListener('paint', onPaint);
		sourceCanvas.requestPaint();

		return () => {
			cancelled = true;
			sourceCanvas.removeEventListener('paint', onPaint);
			if (!resolved) {
				continueRender(handle);
			}
		};
	}, [frame, width, height, applyEffect]);

	return (
		<>
			<canvas
				ref={sourceCanvasRef}
				width={width}
				height={height}
				style={{
					position: 'absolute',
					inset: 0,
					width,
					height,
				}}
			>
				<div
					ref={sceneRef}
					style={{
						width,
						height,
					}}
				>
					{children}
				</div>
			</canvas>
			<canvas
				ref={outputCanvasRef}
				width={width}
				height={height}
				style={{
					position: 'absolute',
					inset: 0,
					width,
					height,
				}}
			/>
		</>
	);
};
