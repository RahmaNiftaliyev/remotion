import {createDescriptor, defineEffect} from 'remotion';

export type HalftoneShape = 'circle' | 'square' | 'line';
export type HalftoneSampling = 'bilinear' | 'nearest';

/** Where halftone dots are pronounced: dark areas (classic ink), bright areas, or both (two-pass, like directional halftone shaders). */
export type HalftoneRegion = 'shadows' | 'highlights' | 'both';

export type HalftoneParams = {
	readonly shape?: HalftoneShape;
	readonly dotSize?: number;
	readonly rotation?: number;
	readonly offsetX?: number;
	readonly offsetY?: number;
	readonly sampling?: HalftoneSampling;
	readonly foreground?: string;
	readonly background?: string;
	/**
	 * Which luminance regions get dots. `shadows` matches classic halftone (larger dots in darker pixels).
	 * `highlights` inverts that (larger dots where the image is brighter). `both` draws shadow dots then
	 * highlight dots—use `foreground` / `highlightForeground` for the two inks.
	 */
	readonly region?: HalftoneRegion;
	/** Dot color for the highlight pass; used when `region` is `highlights` or `both`. Defaults to white. */
	readonly highlightForeground?: string;
};

type HalftoneResolved = {
	shape: HalftoneShape;
	dotSize: number;
	rotation: number;
	offsetX: number;
	offsetY: number;
	sampling: HalftoneSampling;
	foreground: string;
	background: string;
	region: HalftoneRegion;
	highlightForeground: string;
};

const resolve = (p: HalftoneParams): HalftoneResolved => ({
	shape: p.shape ?? 'circle',
	dotSize: p.dotSize ?? 10,
	rotation: p.rotation ?? 0,
	offsetX: p.offsetX ?? 0,
	offsetY: p.offsetY ?? 0,
	sampling: p.sampling ?? 'bilinear',
	foreground: p.foreground ?? 'black',
	background: p.background ?? 'white',
	region: p.region ?? 'shadows',
	highlightForeground: p.highlightForeground ?? '#ffffff',
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
		ctx.fillStyle = r.background;
		ctx.fillRect(0, 0, width, height);

		const rad = (r.rotation * Math.PI) / 180;
		const cosR = Math.cos(rad);
		const sinR = Math.sin(rad);

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

		const startCol = Math.floor((minGx + r.offsetX) / size) - 1;
		const endCol = Math.ceil((maxGx + r.offsetX) / size) + 1;
		const startRow = Math.floor((minGy + r.offsetY) / size) - 1;
		const endRow = Math.ceil((maxGy + r.offsetY) / size) + 1;

		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				const gridX = col * size - r.offsetX;
				const gridY = row * size - r.offsetY;

				const sampleX = cx + gridX * cosR - gridY * sinR;
				const sampleY = cy + gridX * sinR + gridY * cosR;

				if (
					sampleX < -size ||
					sampleX > width + size ||
					sampleY < -size ||
					sampleY > height + size
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

				// Composite onto implicit paper (white): transparent → no ink for shadows,
				// no ink for highlights. Avoids (0,0,0,0) reading as luminance 0.
				const lumShadow = lum * alpha + (1 - alpha);
				const lumHighlight = lum * alpha;

				const dotX = cx + gridX * cosR - gridY * sinR;
				const dotY = cy + gridX * sinR + gridY * cosR;

				const drawDot = (dotScale: number, fillStyle: string) => {
					if (dotScale <= 0.01) {
						return;
					}

					ctx.fillStyle = fillStyle;

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
				};

				if (r.region === 'shadows' || r.region === 'both') {
					drawDot(1 - lumShadow, r.foreground);
				}

				if (r.region === 'highlights' || r.region === 'both') {
					drawDot(lumHighlight, r.highlightForeground);
				}
			}
		}
	},
});

// Halftone effect inspired by m's Halftone for After Effects. Converts
// luminance into a grid of dots, squares, or lines. `sampling` controls
// interpolation when reading luminance between pixel centres. `region` chooses
// whether dots follow dark areas, bright areas, or both (two inks), approximating
// dual-pass halftone shading without mesh normals. Alpha is blended against white
// so transparent pixels are not interpreted as black RGB.
export const halftone = (params: HalftoneParams = {}) =>
	createDescriptor(halftoneDef, params);
