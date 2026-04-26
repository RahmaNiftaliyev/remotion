import {useEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from '../use-current-frame.js';
import {useDelayRender} from '../use-delay-render.js';
import {CanvasPool} from './canvas-pool.js';
import {flattenEffects, groupByBackend} from './effect-internals.js';
import type {EffectDefinition, EffectsProp} from './effect-types.js';
import {getGpuDevice} from './gpu-device.js';

type SourceFn = () =>
	| CanvasImageSource
	| Promise<CanvasImageSource>
	| null
	| undefined;

export type UseEffectChainOptions = {
	readonly source: SourceFn;
	readonly effects: EffectsProp;
	readonly width: number;
	readonly height: number;
	readonly pixelRatio?: number;
	readonly output: HTMLCanvasElement | null;
	// Stable React-deps to re-trigger the effect when callers change anything
	// that should invalidate the source (e.g. children, color, ...).
	readonly sourceDeps: ReadonlyArray<unknown>;
};

// Per-chain runtime state. Owned by the hook; recreated when width/height
// change (since the canvas pool is sized at construction).
type ChainState = {
	pool: CanvasPool;
	setupCache: WeakMap<EffectDefinition<unknown, unknown>, Promise<unknown>>;
	cleanupRegistry: Array<{
		definition: EffectDefinition<unknown, unknown>;
		statePromise: Promise<unknown>;
	}>;
};

const ensureSetup = (
	state: ChainState,
	def: EffectDefinition<unknown, unknown>,
	target: HTMLCanvasElement,
): Promise<unknown> => {
	const cached = state.setupCache.get(def);
	if (cached) {
		return cached;
	}

	const promise = Promise.resolve(def.setup(target));
	state.setupCache.set(def, promise);
	state.cleanupRegistry.push({definition: def, statePromise: promise});
	return promise;
};

// `useEffectChain` is the shared per-frame runtime that powers source
// components like `<Solid>` and `<HtmlInCanvas>`. Source components are
// responsible for producing a `CanvasImageSource` via the `source` callback;
// the runtime owns the rest of the pipeline (scratch canvases, ping-pong,
// cross-backend transfer via `createImageBitmap`, single `delayRender` per
// frame).
export const useEffectChain = ({
	source,
	effects,
	width,
	height,
	pixelRatio = 1,
	output,
	sourceDeps,
}: UseEffectChainOptions): void => {
	const frame = useCurrentFrame();
	const {delayRender, continueRender, cancelRender} = useDelayRender();

	const stateRef = useRef<ChainState | null>(null);
	const sizeRef = useRef<{width: number; height: number} | null>(null);

	// Reset pool if dimensions changed.
	if (
		!sizeRef.current ||
		sizeRef.current.width !== width ||
		sizeRef.current.height !== height
	) {
		stateRef.current = {
			pool: new CanvasPool(width, height),
			setupCache: new WeakMap(),
			cleanupRegistry: [],
		};
		sizeRef.current = {width, height};
	}

	const flattened = useMemo(() => flattenEffects(effects), [effects]);
	const runs = useMemo(() => groupByBackend(flattened), [flattened]);

	useEffect(() => {
		const state = stateRef.current;
		if (!state || !output) {
			return;
		}

		const handle = delayRender(`Canvas effect chain (frame ${frame})`);
		let cancelled = false;
		let resolved = false;

		const finish = () => {
			if (resolved) {
				return;
			}

			resolved = true;
			continueRender(handle);
		};

		const fail = (err: unknown) => {
			if (resolved) {
				return;
			}

			resolved = true;
			cancelRender(err);
		};

		(async () => {
			try {
				const sourceImage = await source();
				if (cancelled) {
					return;
				}

				if (!sourceImage) {
					finish();
					return;
				}

				let currentImage: CanvasImageSource = sourceImage;
				let lastTarget: HTMLCanvasElement | null = null;

				if (runs.length === 0) {
					// No effects: blit source directly into output.
					const ctx = output.getContext('2d');
					if (!ctx) {
						throw new Error('Failed to acquire 2D context for output canvas');
					}

					ctx.clearRect(0, 0, width, height);
					ctx.drawImage(currentImage, 0, 0, width, height);
					finish();
					return;
				}

				let needsGpuDevice = false;
				for (const run of runs) {
					if (run.backend === 'webgpu') {
						needsGpuDevice = true;
						break;
					}
				}

				const gpuDevice = needsGpuDevice ? await getGpuDevice() : null;
				if (cancelled) {
					return;
				}

				for (let runIndex = 0; runIndex < runs.length; runIndex++) {
					const run = runs[runIndex];
					const [a, b] = state.pool.getPair(run.backend);
					let dst = a;

					for (const eff of run.effects) {
						const def = eff.definition as EffectDefinition<unknown, unknown>;
						const setupState = await ensureSetup(state, def, dst);
						if (cancelled) {
							return;
						}

						await def.apply({
							source: currentImage,
							target: dst,
							state: setupState,
							params: eff.params,
							frame,
							width,
							height,
							pixelRatio,
							gpuDevice,
						});
						if (cancelled) {
							return;
						}

						currentImage = dst;
						dst = dst === a ? b : a;
					}

					lastTarget = (currentImage as HTMLCanvasElement | null) ?? lastTarget;

					// If another run follows with a different backend, transfer via
					// `createImageBitmap` so the next backend can sample from a
					// neutral GPU-resident handle.
					const nextRun = runs[runIndex + 1];
					if (nextRun && nextRun.backend !== run.backend && lastTarget) {
						const bitmap = await createImageBitmap(lastTarget);
						if (cancelled) {
							bitmap.close?.();
							return;
						}

						currentImage = bitmap;
					}
				}

				if (!lastTarget) {
					finish();
					return;
				}

				const outCtx = output.getContext('2d');
				if (!outCtx) {
					throw new Error('Failed to acquire 2D context for output canvas');
				}

				outCtx.clearRect(0, 0, width, height);
				outCtx.drawImage(lastTarget, 0, 0, width, height);
				finish();
			} catch (err) {
				if (!cancelled) {
					fail(err);
				}
			}
		})();

		return () => {
			cancelled = true;
			if (!resolved) {
				continueRender(handle);
			}
		};
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [
		frame,
		width,
		height,
		pixelRatio,
		output,
		runs,
		delayRender,
		continueRender,
		cancelRender,
		...sourceDeps,
	]);
	/* eslint-enable react-hooks/exhaustive-deps */

	// Cleanup on unmount: invoke `cleanup` for every cached state.
	useEffect(() => {
		return () => {
			const state = stateRef.current;
			if (!state) {
				return;
			}

			for (const entry of state.cleanupRegistry) {
				entry.statePromise.then(
					(s) => entry.definition.cleanup?.(s),
					() => undefined,
				);
			}
		};
	}, []);
};
