import {useLayoutEffect, useMemo, useRef, useState, useCallback} from 'react';
import type {EffectsProp} from 'remotion';
import {AbsoluteFill, Internals, useCurrentFrame} from 'remotion';
import type {DrawFunction} from './TransitionSeries';
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from './types';

export const HtmlInCanvasPresentation = <
	TPassedProps extends Record<string, unknown>,
>({
	children,
	onElementImage,
	onUnmount,
	presentationProgress,
	presentationDirection,
	shader,
	_experimentalEffects,
	passedProps,
}: TransitionPresentationComponentProps<TPassedProps> & {
	readonly shader: () => HtmlInCanvasShader<TPassedProps>;
	readonly _experimentalEffects?: EffectsProp;
}) => {
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

	const [offscreenCanvas] = useState(() => new OffscreenCanvas(1, 1));

	const passedPropsRef = useRef(passedProps);
	passedPropsRef.current = passedProps;

	const frame = useCurrentFrame();
	const frameRef = useRef(frame);
	frameRef.current = frame;

	const effectsRef = useRef(_experimentalEffects);
	effectsRef.current = _experimentalEffects;

	const [instance] = useState(() => shader());

	useLayoutEffect(() => {
		instance.init(offscreenCanvas);

		return () => {
			instance.cleanup();
		};
	}, [offscreenCanvas, instance]);

	const chainState = Internals.useEffectChainState();

	const draw: DrawFunction = useCallback(
		(prevImage, nextImage, progress) => {
			if (!canvasRef.current) {
				return;
			}

			const width = prevImage?.width ?? nextImage?.width ?? 0;
			const height = prevImage?.height ?? nextImage?.height ?? 0;

			if (width === 0 || height === 0) {
				return;
			}

			offscreenCanvas.width = width;
			offscreenCanvas.height = height;

			instance.draw({
				prevImage,
				nextImage,
				width,
				height,
				time: progress,
				passedProps: passedPropsRef.current,
			});

			Internals.runEffectChain({
				state: chainState.get(width, height)!,
				source: offscreenCanvas,
				effects: effectsRef.current ?? [],
				frame: frameRef.current,
				width,
				height,
				output: canvasRef.current,
			});
		},
		[chainState, instance, offscreenCanvas],
	);

	// TODO: Implement clear()

	const presentationProgressRef = useRef(presentationProgress);
	presentationProgressRef.current = presentationProgress;

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
			onElementImage(elementImage, presentationProgressRef.current, draw);

			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('Failed to get context');
			}
		};

		canvas.addEventListener('paint', onPaint);

		return () => {
			canvas.removeEventListener('paint', onPaint);
		};
	}, [onElementImage, presentationDirection, draw]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		canvas.requestPaint?.();
	}, [presentationProgress]);

	useLayoutEffect(() => {
		return () => {
			onUnmount();
		};
	}, [onUnmount]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		// Size the canvas grid to match the device scale factor to prevent blurriness.
		const observer = new ResizeObserver(([entry]) => {
			canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
			canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
		});
		observer.observe(canvas, {box: 'device-pixel-content-box'});
	}, []);

	return (
		<AbsoluteFill>
			<canvas ref={canvasRef} style={canvasSubtreeStyle}>
				{children}
			</canvas>
		</AbsoluteFill>
	);
};

export type HtmlInCanvasShader<TPassedProps> = {
	init: (canvas: OffscreenCanvas) => void;
	clear: () => void;
	draw: (params: {
		prevImage: ElementImage | null;
		nextImage: ElementImage | null;
		width: number;
		height: number;
		time: number;
		passedProps: TPassedProps;
	}) => void;
	cleanup: () => void;
};

export const makeHtmlInCanvasPresentation = <
	TPassedProps extends Record<string, unknown>,
>(
	shader: () => HtmlInCanvasShader<TPassedProps>,
) => {
	type AugmentedProps = TPassedProps & {_experimentalEffects?: EffectsProp};
	const CompWithShader: React.FC<
		TransitionPresentationComponentProps<AugmentedProps>
	> = (props) => {
		const {passedProps, ...otherProps} = props;
		const {_experimentalEffects, ...restPassedProps} = props.passedProps;
		return (
			<HtmlInCanvasPresentation
				shader={shader}
				passedProps={restPassedProps as TPassedProps}
				_experimentalEffects={_experimentalEffects}
				{...otherProps}
			/>
		);
	};

	return (props: AugmentedProps): TransitionPresentation<AugmentedProps> => {
		return {
			component: CompWithShader,
			props,
		};
	};
};
