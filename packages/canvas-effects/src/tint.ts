import {createDescriptor, defineEffect} from 'remotion';

export type TintParams = {
	readonly color: string;
	readonly amount?: number;
};

const tintDef = defineEffect<TintParams, null>({
	type: 'remotion/tint',
	backend: '2d',
	setup: () => null,
	apply: ({source, target, width, height, params}) => {
		const ctx = target.getContext('2d');
		if (!ctx) {
			return;
		}

		const amount = Math.max(0, Math.min(1, params.amount ?? 0.5));

		ctx.clearRect(0, 0, width, height);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(source, 0, 0, width, height);

		// `source-atop` only paints inside non-transparent regions of the source,
		// so the tint respects the source's alpha mask.
		ctx.globalAlpha = amount;
		ctx.globalCompositeOperation = 'source-atop';
		ctx.fillStyle = params.color;
		ctx.fillRect(0, 0, width, height);

		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	},
});

// Tints the source with a flat color. `amount` controls the blend strength
// (0 = no tint, 1 = full color over opaque pixels). Operates on the 2D
// backend; tinting respects the source's alpha mask.
export const tint = (params: TintParams) => createDescriptor(tintDef, params);
