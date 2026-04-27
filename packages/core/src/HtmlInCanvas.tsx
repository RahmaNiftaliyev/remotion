import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {EffectsProp} from './canvas-effects/effect-types.js';
import type {EffectChainState} from './canvas-effects/run-effect-chain.js';
import {
	cleanupEffectChainState,
	createEffectChainState,
	runEffectChain,
} from './canvas-effects/run-effect-chain.js';
import type {SequenceControls} from './CompositionManager.js';
import {addSequenceStackTraces} from './enable-sequence-stack-traces.js';
import type {SequenceSchema} from './sequence-field-schema.js';
import type {
	AbsoluteFillLayout,
	LayoutAndStyle,
	SequenceProps,
} from './Sequence.js';
import {Sequence} from './Sequence.js';
import {useCurrentFrame} from './use-current-frame.js';
import {useDelayRender} from './use-delay-render.js';
import {useVideoConfig} from './use-video-config.js';
import {wrapInSchema} from './wrap-in-schema.js';

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

export type HtmlInCanvasProps = Omit<
	SequenceProps,
	'children' | 'durationInFrames' | keyof LayoutAndStyle
> &
	Omit<AbsoluteFillLayout, 'layout'> & {
		readonly durationInFrames?: number;
		readonly width: number;
		readonly height: number;
		readonly effects?: EffectsProp;
		readonly children: React.ReactNode;
		readonly pixelRatio?: number;
	};

const htmlInCanvasSchema = {
	'style.translate': {
		type: 'translate',
		step: 1,
		default: '0px 0px',
		description: 'Position',
	},
	'style.scale': {
		type: 'number',
		min: 0.05,
		max: 100,
		step: 0.01,
		default: 1,
		description: 'Scale',
	},
	'style.rotate': {
		type: 'rotation',
		step: 1,
		default: '0deg',
		description: 'Rotation',
	},
	'style.opacity': {
		type: 'number',
		min: 0,
		max: 1,
		step: 0.01,
		default: 1,
		description: 'Opacity',
	},
} as const satisfies SequenceSchema;

const HtmlInCanvasInner: React.FC<
	HtmlInCanvasProps & {
		readonly controls: SequenceControls | undefined;
	}
> = ({
	width,
	height,
	effects = [],
	children,
	style,
	pixelRatio = 1,
	controls,
	durationInFrames,
	...sequenceProps
}) => {
	const {durationInFrames: videoDuration} = useVideoConfig();
	const resolvedDuration = durationInFrames ?? videoDuration;
	const frame = useCurrentFrame();
	const {delayRender, continueRender, cancelRender} = useDelayRender();

	const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sceneRef = useRef<HTMLDivElement | null>(null);
	const [outputCanvas, setOutputCanvas] = useState<HTMLCanvasElement | null>(
		null,
	);

	const chainStateRef = useRef<EffectChainState | null>(null);
	const sizeRef = useRef<{width: number; height: number} | null>(null);

	if (
		!sizeRef.current ||
		sizeRef.current.width !== width ||
		sizeRef.current.height !== height
	) {
		if (chainStateRef.current) {
			cleanupEffectChainState(chainStateRef.current);
		}

		chainStateRef.current = createEffectChainState(width, height);
		sizeRef.current = {width, height};
	}

	// Refs so the paint handler always reads fresh values.
	const effectsRef = useRef(effects);
	effectsRef.current = effects;
	const frameRef = useRef(frame);
	frameRef.current = frame;
	const pixelRatioRef = useRef(pixelRatio);
	pixelRatioRef.current = pixelRatio;
	const widthRef = useRef(width);
	widthRef.current = width;
	const heightRef = useRef(height);
	heightRef.current = height;

	// Track the current delayRender handle so the paint handler can settle it.
	const pendingHandleRef = useRef<number | null>(null);

	const onPaint = useCallback(() => {
		const sourceCanvas =
			sourceCanvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		const sceneEl = sceneRef.current;
		const chainState = chainStateRef.current;
		const output = outputCanvas;
		const handle = pendingHandleRef.current;

		if (
			!sourceCanvas ||
			!sceneEl ||
			!chainState ||
			!output ||
			handle === null
		) {
			return;
		}

		const ctx = sourceCanvas.getContext('2d') as Canvas2DWithDrawElement | null;
		if (!ctx) {
			cancelRender(
				new Error('Failed to acquire 2D context for <HtmlInCanvas> source'),
			);
			return;
		}

		const w = widthRef.current;
		const h = heightRef.current;

		ctx.reset();
		ctx.drawElementImage(sceneEl, 0, 0, w, h);

		const capturedHandle = handle;
		pendingHandleRef.current = null;

		runEffectChain({
			state: chainState,
			source: sourceCanvas,
			effects: effectsRef.current,
			output,
			frame: frameRef.current,
			width: w,
			height: h,
			pixelRatio: pixelRatioRef.current,
		})
			.then((completed) => {
				if (completed) {
					continueRender(capturedHandle);
				}
			})
			.catch((err) => {
				cancelRender(err);
			});
	}, [outputCanvas, continueRender, cancelRender]);

	// Set up layoutSubtree and persistent paint listener.
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
		sourceCanvas.addEventListener('paint', onPaint);
		return () => {
			sourceCanvas.removeEventListener('paint', onPaint);
		};
	}, [onPaint, cancelRender]);

	// On each frame change: block the renderer and request a paint.
	useEffect(() => {
		const handle = delayRender(`HtmlInCanvas (frame ${frame})`);

		// Continue a stale handle from a previous frame that never got a paint.
		if (pendingHandleRef.current !== null) {
			continueRender(pendingHandleRef.current);
		}

		pendingHandleRef.current = handle;

		const sourceCanvas =
			sourceCanvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		sourceCanvas?.requestPaint();

		return () => {
			if (pendingHandleRef.current === handle) {
				continueRender(handle);
				pendingHandleRef.current = null;
			}
		};
	}, [frame, delayRender, continueRender]);

	// Cleanup chain state on unmount.
	useEffect(() => {
		return () => {
			if (chainStateRef.current) {
				cleanupEffectChainState(chainStateRef.current);
			}
		};
	}, []);

	return (
		<Sequence
			durationInFrames={resolvedDuration}
			name="<HtmlInCanvas>"
			controls={controls}
			{...sequenceProps}
			style={style}
		>
			<canvas
				ref={sourceCanvasRef}
				width={width}
				height={height}
				style={{
					position: 'absolute',
					inset: 0,
					width,
					height,
					visibility: 'visible',
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
				style={{
					position: 'absolute',
					inset: 0,
					width,
					height,
				}}
			/>
		</Sequence>
	);
};

export const HtmlInCanvas = wrapInSchema(HtmlInCanvasInner, htmlInCanvasSchema);

HtmlInCanvas.displayName = 'HtmlInCanvas';

addSequenceStackTraces(HtmlInCanvas);
