import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useCurrentFrame} from '../use-current-frame.js';
import {useDelayRender} from '../use-delay-render.js';
import type {EffectsProp} from './effect-types.js';
import {
	cleanupEffectChainState,
	createEffectChainState,
	runEffectChain,
} from './run-effect-chain.js';
import type {EffectChainState} from './run-effect-chain.js';

export type SolidProps = {
	readonly color: string;
	readonly width: number;
	readonly height: number;
	readonly effects?: EffectsProp;
	readonly className?: string;
	readonly style?: React.CSSProperties;
	readonly pixelRatio?: number;
};

export const Solid: React.FC<SolidProps> = ({
	color,
	width,
	height,
	effects = [],
	className,
	style,
	pixelRatio = 1,
}) => {
	const frame = useCurrentFrame();
	const {delayRender, continueRender, cancelRender} = useDelayRender();

	const [outputCanvas, setOutputCanvas] = useState<HTMLCanvasElement | null>(
		null,
	);

	const sourceCanvas = useMemo(() => {
		if (typeof document === 'undefined') {
			return null;
		}

		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		return canvas;
	}, []);

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

	// Fill source and run effect chain on every frame / color change.
	useEffect(() => {
		if (!outputCanvas || !sourceCanvas || !chainStateRef.current) {
			return;
		}

		const handle = delayRender(`Solid effect chain (frame ${frame})`);

		const ctx = sourceCanvas.getContext('2d', {colorSpace: 'srgb'});
		if (!ctx) {
			cancelRender(
				new Error('Failed to acquire 2D context for <Solid> source'),
			);
			return;
		}

		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);

		runEffectChain({
			state: chainStateRef.current,
			source: sourceCanvas,
			effects,
			output: outputCanvas,
			frame,
			width,
			height,
			pixelRatio,
		})
			.then((completed) => {
				if (completed) {
					continueRender(handle);
				}
			})
			.catch((err) => {
				cancelRender(err);
			});

		return () => {
			continueRender(handle);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		frame,
		color,
		effects,
		outputCanvas,
		sourceCanvas,
		width,
		height,
		pixelRatio,
		delayRender,
		continueRender,
		cancelRender,
	]);

	// Cleanup chain state on unmount.
	useEffect(() => {
		return () => {
			if (chainStateRef.current) {
				cleanupEffectChainState(chainStateRef.current);
			}
		};
	}, []);

	return (
		<canvas
			ref={setOutputCanvas}
			width={width}
			height={height}
			className={className}
			style={style}
		/>
	);
};
