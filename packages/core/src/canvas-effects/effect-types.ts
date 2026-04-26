// Public types for the canvas-effects system.
//
// An effect is a description of how to transform an input image into an output
// image, executed inside a per-frame chain runtime owned by a source component
// (`<Solid>`, `<HtmlInCanvas>`, ...). The chain runtime owns scratch canvases
// and ping-pongs between them, so effects do not allocate per frame.
//
// Cross-backend contract: all canvases store premultiplied alpha and are
// sRGB-encoded. Effects that perform color math in linear space are responsible
// for converting to/from sRGB themselves.

export type Backend = '2d' | 'webgl2' | 'webgpu';

// `GPUDevice` is left as `unknown` to avoid pulling `@webgpu/types` into core.
// Effects that target the `webgpu` backend should narrow this themselves
// (e.g. via a local type assertion or by depending on `@webgpu/types`).
type AnyGpuDevice = unknown;

export type EffectApplyParams<P, S> = {
	readonly source: CanvasImageSource;
	readonly target: HTMLCanvasElement;
	readonly state: S;
	readonly params: P;
	readonly frame: number;
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
	readonly gpuDevice: AnyGpuDevice | null;
};

export type EffectDefinition<P, S = unknown> = {
	readonly type: string;
	readonly backend: Backend;
	readonly setup: (target: HTMLCanvasElement) => S | Promise<S>;
	readonly apply: (params: EffectApplyParams<P, S>) => void | Promise<void>;
	readonly cleanup?: (state: S) => void;
};

export type EffectDescriptor<P = unknown> = {
	readonly definition: EffectDefinition<P, unknown>;
	readonly params: P;
};

// Public prop type for `effects`: callers may interleave single descriptors
// with arrays of descriptors. The runtime calls `.flat()` once before
// processing, which lets a single factory call (e.g. `blur(...)`) expand into
// multiple passes (e.g. horizontal + vertical) without leaking that detail to
// the call site.
//
// The element type uses `EffectDescriptor<any>` instead of
// `EffectDescriptor<unknown>` because TypeScript treats the `params` field of
// `EffectApplyParams` contravariantly (it is the parameter of `apply`), which
// would otherwise prevent a concrete `EffectDescriptor<MyParams>` from being
// assigned into a slot typed as `EffectDescriptor<unknown>`. The chain
// runtime handles params opaquely, so the variance loss is benign here.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type EffectsProp = ReadonlyArray<
	EffectDescriptor<any> | ReadonlyArray<EffectDescriptor<any>>
>;
/* eslint-enable @typescript-eslint/no-explicit-any */
