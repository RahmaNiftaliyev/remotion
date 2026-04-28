import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import type {EffectsProp} from './canvas-effects/effect-types.js';
import {runEffectChain} from './canvas-effects/run-effect-chain.js';
import {useEffectChainState} from './canvas-effects/use-effect-chain-state.js';
import type {SequenceControls} from './CompositionManager.js';
import {ENABLE_EFFECTS} from './enable-effects.js';
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

export type HtmlInCanvasComposeParams = {
	readonly source: CanvasImageSource;
	readonly target: HTMLCanvasElement;
	readonly frame: number;
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
};

export const isHtmlInCanvasSupported = (): boolean => {
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
		readonly _experimentalEffects?: EffectsProp;
		readonly children: React.ReactNode;
		readonly pixelRatio?: number;
		readonly onCompose?: (
			params: HtmlInCanvasComposeParams,
		) => void | Promise<void>;
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
	_experimentalEffects: experimentalEffects = [],
	children,
	pixelRatio = 1,
	onCompose,
	controls,
	style,
	durationInFrames,
	...sequenceProps
}) => {
	const {durationInFrames: videoDuration} = useVideoConfig();
	const resolvedDuration = durationInFrames ?? videoDuration;

	const frame = useCurrentFrame();
	const {delayRender, continueRender, cancelRender} = useDelayRender();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const sceneRef = useRef<HTMLDivElement | null>(null);

	const chainState = useEffectChainState(width, height);

	// Refs so the paint handler always reads fresh values.
	const effectsRef = useRef(experimentalEffects);
	effectsRef.current = experimentalEffects;
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
		const canvas = canvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		const sceneEl = sceneRef.current;
		const handle = pendingHandleRef.current;

		if (!canvas || !sceneEl || handle === null) {
			return;
		}

		try {
			const ctx = canvas.getContext('2d') as Canvas2DWithDrawElement | null;
			if (!ctx) {
				throw new Error(
					'Failed to acquire 2D context for <HtmlInCanvas> canvas',
				);
			}

			const w = widthRef.current;
			const h = heightRef.current;

			// Layout-subtree children are not shown on-screen until rasterized here;
			// effects then read from and write back to this same surface (via pool).
			ctx.reset();
			const transform = ctx.drawElementImage(sceneEl, 0, 0, w, h);
			// Sync DOM hit-testing, IntersectionObserver and a11y to the drawn
			// position. Per the WICG/html-in-canvas explainer, the matrix returned
			// from drawElementImage should be assigned to the source element.
			sceneEl.style.transform = transform.toString();

			const capturedHandle = handle;
			pendingHandleRef.current = null;

			if (!ENABLE_EFFECTS) {
				continueRender(capturedHandle);
				return;
			}

			if (!chainState) {
				return;
			}

			runEffectChain({
				state: chainState,
				source: canvas,
				effects: effectsRef.current,
				output: canvas,
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
		} catch (error) {
			cancelRender(error);
		}
	}, [chainState, continueRender, cancelRender]);

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

		const canvas = canvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		if (!canvas) {
			return;
		}

		canvas.layoutSubtree = true;
		canvas.addEventListener('paint', onPaint);
		return () => {
			canvas.removeEventListener('paint', onPaint);
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

		const canvas = canvasRef.current as HTMLCanvasWithLayoutSubtree | null;
		canvas?.requestPaint();

		return () => {
			if (pendingHandleRef.current === handle) {
				continueRender(handle);
				pendingHandleRef.current = null;
			}
		};
	}, [frame, delayRender, continueRender]);

	const outerStyle = useMemo(() => {
		return {
			position: 'absolute' as const,
			inset: 0,
			width,
			height,
		} as React.CSSProperties;
	}, [width, height]);

	const innerStyle = useMemo(() => {
		return {
			width,
			height,
		};
	}, [width, height]);

	return (
		<Sequence
			durationInFrames={resolvedDuration}
			name="<HtmlInCanvas>"
			controls={controls}
			{...sequenceProps}
			style={style}
		>
			<canvas ref={canvasRef} width={width} height={height} style={outerStyle}>
				<div ref={sceneRef} style={innerStyle}>
					{children}
				</div>
			</canvas>
		</Sequence>
	);
};

const HtmlInCanvasWrapped = wrapInSchema(HtmlInCanvasInner, htmlInCanvasSchema);

export const HtmlInCanvas = Object.assign(HtmlInCanvasWrapped, {
	isHtmlInCanvasSupported,
}) as typeof HtmlInCanvasWrapped & {
	readonly isHtmlInCanvasSupported: typeof isHtmlInCanvasSupported;
};

HtmlInCanvas.displayName = 'HtmlInCanvas';

addSequenceStackTraces(HtmlInCanvas);
