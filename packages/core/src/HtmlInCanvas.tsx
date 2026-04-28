import React, {useCallback, useLayoutEffect, useMemo, useRef} from 'react';
import type {EffectsProp} from './canvas-effects/effect-types.js';
import {runEffectChain} from './canvas-effects/run-effect-chain.js';
import {useEffectChainState} from './canvas-effects/use-effect-chain-state.js';
import type {SequenceControls} from './CompositionManager.js';
import {delayRender} from './delay-render.js';
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

// IDL: https://github.com/WICG/html-in-canvas#idl-changes
// WebGPU's `copyElementImageToTexture` is omitted — `GPUQueue` is not in
// lib.dom.d.ts and would require pulling in `@webgpu/types`.
declare global {
	interface ElementImage {
		readonly width: number;
		readonly height: number;
		close(): void;
	}

	interface CanvasRenderingContext2D {
		drawElementImage(
			element: Element | ElementImage,
			dx: number,
			dy: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			dx: number,
			dy: number,
			dwidth: number,
			dheight: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			sx: number,
			sy: number,
			swidth: number,
			sheight: number,
			dx: number,
			dy: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			sx: number,
			sy: number,
			swidth: number,
			sheight: number,
			dx: number,
			dy: number,
			dwidth: number,
			dheight: number,
		): DOMMatrix;
	}

	interface OffscreenCanvasRenderingContext2D {
		drawElementImage(
			element: Element | ElementImage,
			dx: number,
			dy: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			dx: number,
			dy: number,
			dwidth: number,
			dheight: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			sx: number,
			sy: number,
			swidth: number,
			sheight: number,
			dx: number,
			dy: number,
		): DOMMatrix;
		drawElementImage(
			element: Element | ElementImage,
			sx: number,
			sy: number,
			swidth: number,
			sheight: number,
			dx: number,
			dy: number,
			dwidth: number,
			dheight: number,
		): DOMMatrix;
	}

	// Augmenting the base interface applies to both WebGL1 and WebGL2.
	interface WebGLRenderingContextBase {
		texElementImage2D(
			target: GLenum,
			level: GLint,
			internalformat: GLint,
			format: GLenum,
			type: GLenum,
			element: Element | ElementImage,
		): void;
		texElementImage2D(
			target: GLenum,
			level: GLint,
			internalformat: GLint,
			width: GLsizei,
			height: GLsizei,
			format: GLenum,
			type: GLenum,
			element: Element | ElementImage,
		): void;
		texElementImage2D(
			target: GLenum,
			level: GLint,
			internalformat: GLint,
			sx: GLfloat,
			sy: GLfloat,
			swidth: GLfloat,
			sheight: GLfloat,
			format: GLenum,
			type: GLenum,
			element: Element | ElementImage,
		): void;
		texElementImage2D(
			target: GLenum,
			level: GLint,
			internalformat: GLint,
			sx: GLfloat,
			sy: GLfloat,
			swidth: GLfloat,
			sheight: GLfloat,
			width: GLsizei,
			height: GLsizei,
			format: GLenum,
			type: GLenum,
			element: Element | ElementImage,
		): void;
	}

	interface HTMLCanvasElementEventMap {
		paint: Event;
	}

	interface HTMLCanvasElement {
		layoutSubtree?: boolean;
		onpaint: ((this: HTMLCanvasElement, ev: Event) => unknown) | null;
		requestPaint?(): void;
		captureElementImage(element: Element): ElementImage;
		getElementTransform(
			element: Element | ElementImage,
			drawTransform: DOMMatrix,
		): DOMMatrix;
	}
}

export type HtmlInCanvasComposeParams = {
	readonly canvas: HTMLCanvasElement;
	readonly element: HTMLDivElement;
};

export const isHtmlInCanvasSupported = (): boolean => {
	if (typeof document === 'undefined') {
		return false;
	}

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	return (
		typeof ctx?.drawElementImage === 'function' &&
		typeof canvas.requestPaint === 'function'
	);
};

export type HtmlInCanvasOnPaint = (
	params: HtmlInCanvasComposeParams,
) => void | Promise<void>;

export type HtmlInCanvasOnInit = (
	params: HtmlInCanvasComposeParams,
) => void | Promise<void>;

const defaultOnPaint: HtmlInCanvasOnPaint = ({canvas, element}) => {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to acquire 2D context for <HtmlInCanvas> canvas');
	}

	ctx.reset();
	const transform = ctx.drawElementImage(element, 0, 0);
	element.style.transform = transform.toString();
};

export type HtmlInCanvasProps = Omit<
	SequenceProps,
	'children' | 'durationInFrames' | keyof LayoutAndStyle
> &
	Omit<AbsoluteFillLayout, 'layout'> & {
		readonly durationInFrames?: number;
		readonly width?: number;
		readonly height?: number;
		readonly _experimentalEffects?: EffectsProp;
		readonly children: React.ReactNode;
		readonly onPaint?: HtmlInCanvasOnPaint;
		readonly onInit?: HtmlInCanvasOnInit;
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
	onPaint,
	onInit,
	controls,
	style,
	durationInFrames,
	...sequenceProps
}) => {
	const {durationInFrames: videoDuration} = useVideoConfig();
	const resolvedDuration = durationInFrames ?? videoDuration;

	const frame = useCurrentFrame();
	const {continueRender, cancelRender} = useDelayRender();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const divRef = useRef<HTMLDivElement | null>(null);

	const chainState = useEffectChainState(
		canvasRef.current?.width ?? 0,
		canvasRef.current?.height ?? 0,
	);

	// Refs so the paint handler always reads fresh values.
	const effectsRef = useRef(experimentalEffects);
	effectsRef.current = experimentalEffects;
	const frameRef = useRef(frame);
	frameRef.current = frame;
	const onPaintRef = useRef(onPaint);
	onPaintRef.current = onPaint;
	const onInitRef = useRef(onInit);
	onInitRef.current = onInit;
	const initializedRef = useRef(false);

	const onPaintCb = useCallback(async () => {
		const canvas = canvasRef.current;
		const element = divRef.current;

		if (!canvas || !element) {
			throw new Error('Canvas or scene element not found');
		}

		try {
			const handle = delayRender('onPaint');
			if (!initializedRef.current) {
				initializedRef.current = true;
				await onInitRef.current?.({canvas, element});
			}

			const handler = onPaintRef.current ?? defaultOnPaint;

			await handler({canvas, element});

			if (!ENABLE_EFFECTS) {
				continueRender(handle);
				return;
			}

			if (!chainState?.current) {
				throw new Error('Effect chain state not found');
			}

			const completed = await runEffectChain({
				state: chainState.current!,
				source: canvas,
				effects: effectsRef.current,
				output: canvas,
				frame: frameRef.current,
				width: canvas.width,
				height: canvas.height,
			});

			if (completed) {
				continueRender(handle);
			}
		} catch (error) {
			cancelRender(error);
		}
	}, [chainState, continueRender, cancelRender]);

	// Set up layoutSubtree and persistent paint listener. Runs as a
	// layout effect so the listener is attached before the resize effect
	// below dispatches its first synthetic paint.
	useLayoutEffect(() => {
		if (!isHtmlInCanvasSupported()) {
			cancelRender(
				new Error(
					'HTML in Canvas is not supported. Open this page in Chrome Canary with chrome://flags/#canvas-draw-element enabled.',
				),
			);
			return;
		}

		const canvas = canvasRef.current;
		if (!canvas) {
			throw new Error('Canvas not found');
		}

		canvas.layoutSubtree = true;
		canvas.addEventListener('paint', onPaintCb);

		return () => {
			canvas.removeEventListener('paint', onPaintCb);
		};
	}, [onPaintCb, cancelRender]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const handle = delayRender('waiting for first paint after canvas resize');
		canvas.addEventListener(
			'paint',
			() => {
				continueRender(handle);
			},
			{once: true},
		);

		return () => {
			continueRender(handle);
		};
	}, [width, height, continueRender]);

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
			layout="none"
			{...sequenceProps}
		>
			<canvas ref={canvasRef} width={width} height={height} style={style}>
				<div ref={divRef} style={innerStyle}>
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
