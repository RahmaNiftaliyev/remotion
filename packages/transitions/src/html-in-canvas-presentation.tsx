import {
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type {EffectsProp} from 'remotion';
import {
	AbsoluteFill,
	Internals,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {HtmlInCanvasShader} from './presentations/zoom-blur';
import type {
	MandatoryOverlayComponentProps,
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from './types';

export const HtmlInCanvasPresentation: React.FC<
	TransitionPresentationComponentProps<Record<string, unknown>>
> = ({
	children,
	onElementImage,
	onUnmount,
	presentationProgress,
	presentationDirection,
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
			onElementImage(elementImage, presentationProgressRef.current);

			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('Failed to get context');
			}
		};

		canvas.addEventListener('paint', onPaint);

		return () => {
			canvas.removeEventListener('paint', onPaint);
		};
	}, [onElementImage, presentationDirection]);

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

	return (
		<AbsoluteFill>
			<canvas ref={canvasRef} style={canvasSubtreeStyle}>
				{children}
			</canvas>
		</AbsoluteFill>
	);
};

export const HtmlInCanvasOverlay: React.FC<
	MandatoryOverlayComponentProps<Record<string, unknown>>
> = ({refToMethods, passedProps, shader}) => {
	const {width, height} = useVideoConfig();
	const [offscreenCanvas] = useState(() => new OffscreenCanvas(width, height));
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const frame = useCurrentFrame();
	const frameRef = useRef(frame);
	frameRef.current = frame;
	const passedPropsRef = useRef(passedProps);
	passedPropsRef.current = passedProps;

	const [instance] = useState(() => shader());

	useLayoutEffect(() => {
		instance.init(offscreenCanvas);

		return () => {
			instance.cleanup();
		};
	}, [offscreenCanvas, instance]);

	const chainState = Internals.useEffectChainState();

	useImperativeHandle(refToMethods, () => {
		return {
			draw: (
				prevImage: ElementImage | null,
				nextImage: ElementImage | null,
				progress: number,
			) => {
				if (!canvasRef.current) {
					return;
				}

				instance.draw({
					prevImage,
					nextImage,
					width,
					height,
					time: progress,
					passedProps: passedPropsRef.current,
				});
				offscreenCanvas.width = width;
				offscreenCanvas.height = height;
				Internals.runEffectChain({
					state: chainState.get(width, height)!,
					source: offscreenCanvas,
					effects: passedPropsRef.current._experimentalEffects ?? [],
					frame: frameRef.current,
					width,
					height,
					output: canvasRef.current,
				});
			},
			clear: () => {
				instance.clear();
			},
		};
	}, [chainState, height, instance, offscreenCanvas, width]);

	const outerStyle: React.CSSProperties = useMemo(() => {
		return {
			pointerEvents: 'none',
		};
	}, []);

	const innerStyle: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
		};
	}, []);

	return (
		<AbsoluteFill style={outerStyle}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={innerStyle}
			/>
		</AbsoluteFill>
	);
};

export const makeHtmlInCanvasPresentation = <
	TPassedProps extends Record<string, unknown>,
>(
	shader: () => HtmlInCanvasShader<TPassedProps>,
) => {
	type AugmentedProps = TPassedProps & {_experimentalEffects?: EffectsProp};
	return (props: AugmentedProps): TransitionPresentation<AugmentedProps> => {
		return {
			component: HtmlInCanvasPresentation,
			props,
			shader,
		};
	};
};
