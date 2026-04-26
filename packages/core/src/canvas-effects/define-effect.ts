import type {EffectDefinition, EffectDescriptor} from './effect-types.js';

// Identity helper for declaring an effect definition with proper type
// inference. Wrapping the literal in `defineEffect(...)` lets TypeScript infer
// `<P, S>` from the `setup` and `apply` signatures while still enforcing the
// shape of the definition.
export const defineEffect = <P, S>(
	definition: EffectDefinition<P, S>,
): EffectDefinition<P, S> => definition;

// Factory helper for constructing per-frame descriptors from a definition.
// Effect authors typically expose a small wrapper (e.g.
// `export const blur = (params) => createDescriptor(blurDef, params)`) so users
// don't reach into the internal definition object. The state type `S` is
// erased to `unknown` in the descriptor because consumers (the chain runtime,
// other effects in the chain) treat state as opaque; only the definition's
// own `setup`, `apply`, and `cleanup` functions ever see the real shape.
export const createDescriptor = <P, S>(
	definition: EffectDefinition<P, S>,
	params: P,
): EffectDescriptor<P> => ({
	definition: definition as unknown as EffectDefinition<P, unknown>,
	params,
});
