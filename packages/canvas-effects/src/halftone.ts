import {createDescriptor, defineEffect} from 'remotion';

/** Dot diameter scale [0–1] for uniform screen tone in transparent regions (`shadeOutside`). */
const SHADE_OUTSIDE_DOT_SCALE = 0.5;

export type HalftoneShape = 'circle' | 'square' | 'line';
export type HalftoneSampling = 'bilinear' | 'nearest';

export type HalftoneParams = {
	readonly shape?: HalftoneShape;
	readonly dotSize?: number;
	/**
	 * Distance between adjacent dot centers on the halftone grid (pitch).
	 * When omitted, matches `dotSize` so dots can touch at full coverage (same as before).
	 */
	readonly dotSpacing?: number;
	readonly rotation?: number;
	readonly offsetX?: number;
	readonly offsetY?: number;
	readonly sampling?: HalftoneSampling;
	/** Dot color. Defaults to black. */
	readonly color?: string;
	/**
	 * When false (default), halftone follows luminance on opaque pixels (classic
	 * halftone on your subject). When true, the same dot pattern fills transparent
	 * and low-alpha areas instead—e.g. the canvas around a cut-out shape—while
	 * leaving the opaque shape mostly free of those dots.
	 */
	readonly shadeOutside?: boolean;
};

type HalftoneResolved = {
	shape: HalftoneShape;
	dotSize: number;
	dotSpacing: number;
	rotation: number;
	offsetX: number;
	offsetY: number;
	sampling: HalftoneSampling;
	color: string;
	shadeOutside: boolean;
};

const resolve = (p: HalftoneParams): HalftoneResolved => ({
	shape: p.shape ?? 'circle',
	dotSize: p.dotSize ?? 20,
	dotSpacing: p.dotSpacing ?? p.dotSize ?? 20,
	rotation: p.rotation ?? 0,
	offsetX: p.offsetX ?? 0,
	offsetY: p.offsetY ?? 0,
	sampling: p.sampling ?? 'bilinear',
	color: p.color ?? 'black',
	shadeOutside: p.shadeOutside ?? false,
});

type SampleState = {
	sourceCanvas: HTMLCanvasElement;
	sourceCtx: CanvasRenderingContext2D;
};

type SampleOpts = {
	data: Uint8ClampedArray;
	sw: number;
	sh: number;
	x: number;
	y: number;
	sampling: HalftoneSampling;
};

type LuminanceAlpha = {lum: number; alpha: number};

const rgbToLum = (i: number, data: Uint8ClampedArray): number =>
	(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

/** Samples linear RGB luminance and alpha [0–1]. Alpha is used so transparent pixels are not treated as black. */
const sampleLuminanceAlpha = ({
	data,
	sw,
	sh,
	x,
	y,
	sampling,
}: SampleOpts): LuminanceAlpha => {
	if (sampling === 'nearest') {
		const px = Math.min(Math.max(Math.round(x), 0), sw - 1);
		const py = Math.min(Math.max(Math.round(y), 0), sh - 1);
		const i = (py * sw + px) * 4;
		return {
			lum: rgbToLum(i, data),
			alpha: data[i + 3] / 255,
		};
	}

	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const x1 = Math.min(x0 + 1, sw - 1);
	const y1 = Math.min(y0 + 1, sh - 1);
	const fx = x - x0;
	const fy = y - y0;

	const cx0 = Math.max(x0, 0);
	const cy0 = Math.max(y0, 0);

	const i00 = (cy0 * sw + cx0) * 4;
	const i10 = (cy0 * sw + x1) * 4;
	const i01 = (y1 * sw + cx0) * 4;
	const i11 = (y1 * sw + x1) * 4;

	const l00 = rgbToLum(i00, data);
	const l10 = rgbToLum(i10, data);
	const l01 = rgbToLum(i01, data);
	const l11 = rgbToLum(i11, data);

	const a00 = data[i00 + 3] / 255;
	const a10 = data[i10 + 3] / 255;
	const a01 = data[i01 + 3] / 255;
	const a11 = data[i11 + 3] / 255;

	const top = l00 + (l10 - l00) * fx;
	const bottom = l01 + (l11 - l01) * fx;
	const lum = top + (bottom - top) * fy;

	const topA = a00 + (a10 - a00) * fx;
	const bottomA = a01 + (a11 - a01) * fx;
	const alpha = topA + (bottomA - topA) * fy;

	return {lum, alpha};
};

const halftoneDef = defineEffect<HalftoneParams, SampleState>({
	type: 'remotion/halftone',
	backend: '2d',
	setup: () => {
		const sourceCanvas = document.createElement('canvas');
		const sourceCtx = sourceCanvas.getContext('2d', {
			willReadFrequently: true,
			colorSpace: 'srgb',
		});
		if (!sourceCtx) {
			throw new Error(
				'Failed to acquire 2D context for halftone sampling canvas.',
			);
		}

		return {sourceCanvas, sourceCtx};
	},
	apply: ({source, target, width, height, params, state}) => {
		const ctx = target.getContext('2d');
		if (!ctx) {
			throw new Error(
				'Failed to acquire 2D context for halftone effect. The canvas may have been assigned a different context type.',
			);
		}

		const r = resolve(params);

		const {sourceCanvas, sourceCtx} = state;
		if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
			sourceCanvas.width = width;
			sourceCanvas.height = height;
		}

		sourceCtx.clearRect(0, 0, width, height);
		sourceCtx.drawImage(source, 0, 0, width, height);
		const {data} = sourceCtx.getImageData(0, 0, width, height);

		ctx.clearRect(0, 0, width, height);

		const rad = (r.rotation * Math.PI) / 180;
		const cosR = Math.cos(rad);
		const sinR = Math.sin(rad);

		const spacing = r.dotSpacing;
		const size = r.dotSize;
		const halfSize = size / 2;

		// Compute grid bounds: rotate the four canvas corners into grid space,
		// then iterate over the bounding box of those rotated corners so every
		// visible cell is covered regardless of rotation angle.
		const cx = width / 2;
		const cy = height / 2;

		const corners = [
			[0, 0],
			[width, 0],
			[0, height],
			[width, height],
		];
		let minGx = Infinity;
		let maxGx = -Infinity;
		let minGy = Infinity;
		let maxGy = -Infinity;
		for (const [px, py] of corners) {
			const dx = px - cx;
			const dy = py - cy;
			const gx = dx * cosR + dy * sinR;
			const gy = -dx * sinR + dy * cosR;
			minGx = Math.min(minGx, gx);
			maxGx = Math.max(maxGx, gx);
			minGy = Math.min(minGy, gy);
			maxGy = Math.max(maxGy, gy);
		}

		// Include an extra ring of cells past the axis-aligned grid-space bounds so
		// float error, max dot extent, and rotation never clip the last row/column.
		const gridPadBefore = 2;
		const gridPadAfter = 2;
		const startCol = Math.floor((minGx + r.offsetX) / spacing) - gridPadBefore;
		const endCol = Math.ceil((maxGx + r.offsetX) / spacing) + gridPadAfter;
		const startRow = Math.floor((minGy + r.offsetY) / spacing) - gridPadBefore;
		const endRow = Math.ceil((maxGy + r.offsetY) / spacing) + gridPadAfter;

		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				const gridX = col * spacing - r.offsetX;
				const gridY = row * spacing - r.offsetY;

				const sampleX = cx + gridX * cosR - gridY * sinR;
				const sampleY = cy + gridX * sinR + gridY * cosR;

				// Margin must cover full dot extent (rotated square corners are √2·halfSize
				// from center). Small px slack avoids float gaps at canvas edges.
				const cullR = halfSize * Math.SQRT2 + 2;
				if (
					sampleX < -cullR ||
					sampleX > width + cullR ||
					sampleY < -cullR ||
					sampleY > height + cullR
				) {
					continue;
				}

				const {lum, alpha} = sampleLuminanceAlpha({
					data,
					sw: width,
					sh: height,
					x: sampleX,
					y: sampleY,
					sampling: r.sampling,
				});

				// Composite onto implicit paper (white): transparent reads as white for
				// luminance so opaque pixels alone drive classic halftone.
				const lumDefault = lum * alpha + (1 - alpha);

				const dotScale = r.shadeOutside
					? (1 - alpha) * SHADE_OUTSIDE_DOT_SCALE
					: 1 - lumDefault;

				if (dotScale <= 0.01) {
					continue;
				}

				const dotX = cx + gridX * cosR - gridY * sinR;
				const dotY = cy + gridX * sinR + gridY * cosR;

				ctx.fillStyle = r.color;

				if (r.shape === 'circle') {
					const radius = halfSize * dotScale;
					ctx.beginPath();
					ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
					ctx.fill();
				} else if (r.shape === 'square') {
					const s = size * dotScale;
					ctx.save();
					ctx.translate(dotX, dotY);
					ctx.rotate(-rad);
					ctx.fillRect(-s / 2, -s / 2, s, s);
					ctx.restore();
				} else {
					const lineHeight = size * dotScale;
					ctx.save();
					ctx.translate(dotX, dotY);
					ctx.rotate(-rad);
					ctx.fillRect(-halfSize, -lineHeight / 2, size, lineHeight);
					ctx.restore();
				}
			}
		}
	},
	cleanup: () => undefined,
});

// Halftone effect inspired by m's Halftone for After Effects. Converts
// luminance into a grid of dots, squares, or lines. `dotSpacing` sets the grid
// pitch (defaults to `dotSize`). `sampling` controls interpolation when reading
// luminance between pixel centres. `shadeOutside` fills transparent areas with a
// screen tone instead of luminance-driven ink on opaque pixels alone.
// Alpha is blended against white so transparent pixels are not interpreted as
// black RGB.
export const halftone = (params: HalftoneParams = {}) =>
	createDescriptor(halftoneDef, params);
