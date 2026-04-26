import React, {useCallback, useEffect, useRef, useState} from 'react';
import {cancelRender} from '../cancel-render.js';
import type {EffectsProp} from './effect-types.js';
import {useEffectChain} from './use-effect-chain.js';

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

export type HtmlInCanvasProps = {
	readonly width: number;
	readonly height: number;
	readonly effects?: EffectsProp;
	readonly children: React.ReactNode;
	readonly className?: string;
	readonly style?: React.CSSProperties;
	readonly pixelRatio?: number;
};

// `<HtmlInCanvas>` rasterizes its DOM children into a canvas using the WICG
// html-in-canvas proposal, then runs the resulting image through an
// effect chain. The captured DOM image is the source for the chain; effects
// then transform it just like with any other source component.
//
// Requires Chrome Canary with `chrome://flags/#canvas-draw-element` enabled.
export const HtmlInCanvas: React.FC<HtmlInCanvasProps> = ({
	width,
	height,
	effects = [],
	children,
	className,
	style,
	pixelRatio,
}) => {
	const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sceneRef = useRef<HTMLDivElement | null>(null);
	const [outputCanvas, setOutputCanvas] = useState<HTMLCanvasElement | null>(
		null,
	);

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

	const source = useCallback(() => {
		const sourceCanvas =
			sourceCanvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		const sceneEl = sceneRef.current;
		if (!sourceCanvas || !sceneEl) {
			return null;
		}

		const ctx = sourceCanvas.getContext('2d') as Canvas2DWithDrawElement | null;
		if (!ctx) {
			throw new Error('Failed to acquire 2D context for <HtmlInCanvas> source');
		}

		return new Promise<CanvasImageSource>((resolve, reject) => {
			const onPaint = () => {
				sourceCanvas.removeEventListener('paint', onPaint);
				try {
					ctx.reset();
					ctx.drawElementImage(sceneEl, 0, 0, width, height);
					resolve(sourceCanvas);
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			};

			sourceCanvas.addEventListener('paint', onPaint);
			sourceCanvas.requestPaint();
		});
	}, [width, height]);

	useEffectChain({
		source,
		effects,
		width,
		height,
		pixelRatio,
		output: outputCanvas,
		sourceDeps: [],
	});

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
				ref={setOutputCanvas}
				width={width}
				height={height}
				className={className}
				style={{
					position: 'absolute',
					inset: 0,
					width,
					height,
					...style,
				}}
			/>
		</>
	);
};
