import React, {useCallback, useMemo, useState} from 'react';
import type {EffectsProp} from './effect-types.js';
import {useEffectChain} from './use-effect-chain.js';

export type SolidProps = {
	readonly color: string;
	readonly width: number;
	readonly height: number;
	readonly effects?: EffectsProp;
	readonly className?: string;
	readonly style?: React.CSSProperties;
	readonly pixelRatio?: number;
};

// `<Solid>` is the simplest source component: it produces a flat-color image
// to feed into the canvas-effect chain. Combined with an effect chain it can
// generate procedural content (gradients, blurs, noise patches, ...) without
// needing to mount a DOM source.
//
// Internally the source is a 1x1 canvas filled with `color`; the chain runtime
// scales it to the chain's `width`/`height` when the next stage samples it,
// which is correct because every pixel is the same color.
export const Solid: React.FC<SolidProps> = ({
	color,
	width,
	height,
	effects = [],
	className,
	style,
	pixelRatio,
}) => {
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

	const source = useCallback(() => {
		if (!sourceCanvas) {
			return null;
		}

		const ctx = sourceCanvas.getContext('2d', {colorSpace: 'srgb'});
		if (!ctx) {
			throw new Error('Failed to acquire 2D context for <Solid> source');
		}

		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		return sourceCanvas;
	}, [color, sourceCanvas]);

	useEffectChain({
		source,
		effects,
		width,
		height,
		pixelRatio,
		output: outputCanvas,
		sourceDeps: [color],
	});

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
