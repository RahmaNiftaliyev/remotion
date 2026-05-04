import type {SequenceSchema} from './sequence-field-schema';

export type ResolveValue = (key: string) => unknown;

export const flattenActiveSchema = (
	schema: SequenceSchema,
	resolve: ResolveValue,
): SequenceSchema => {
	const out: SequenceSchema = {};
	for (const key of Object.keys(schema)) {
		const field = schema[key];
		if (field.type === 'enum') {
			out[key] = field;
			const current = (resolve(key) as string | undefined) ?? field.default;
			const variant = field.variants[current];
			if (variant) {
				Object.assign(out, flattenActiveSchema(variant, resolve));
			}
		} else {
			out[key] = field;
		}
	}

	return out;
};
