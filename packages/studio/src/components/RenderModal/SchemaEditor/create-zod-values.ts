import type {ZodTypesType} from '../../get-zod-if-possible';
import {
	getArrayElement,
	getDefaultValue,
	getEffectsInner,
	getEnumValues,
	getInnerType,
	getLiteralValue,
	getObjectShape,
	getUnionOptions,
	getZodSchemaDescription,
	getZodSchemaType,
	isZodV3Schema,
} from './zod-schema-type';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

export const createZodValues = (
	schema: AnySchema,
	zodRuntime: unknown,
	zodTypes: ZodTypesType | null,
): unknown => {
	if (!schema) {
		throw new Error('Invalid zod schema');
	}

	const def = schema._def;
	const typeName = getZodSchemaType(schema);

	switch (typeName) {
		case 'string':
			return '';
		case 'number': {
			const checks = def.checks;
			if (checks) {
				if (isZodV3Schema(schema)) {
					for (const check of checks) {
						if (check.kind === 'min') return check.value;
						if (check.kind === 'max' && check.value < 0) return check.value;
					}
				} else {
					for (const check of checks) {
						const cd = check._zod?.def;
						if (cd?.check === 'greater_than') return cd.value;
						if (cd?.check === 'less_than' && cd.value < 0) return cd.value;
					}
				}
			}

			return 0;
		}

		case 'bigint':
			return BigInt(0);
		case 'boolean':
			return false;
		case 'nan':
			return NaN;
		case 'date':
			return new Date();
		case 'symbol':
			return Symbol('remotion');
		case 'undefined':
		case 'void':
			return undefined;
		case 'null':
			return null;
		case 'any':
			throw new Error('Cannot create a value for type z.any()');
		case 'unknown':
			throw new Error('Cannot create a value for type z.unknown()');
		case 'never':
			throw new Error('Cannot create a value for type z.never()');
		case 'object': {
			const shape = getObjectShape(schema);
			const keys = Object.keys(shape);
			const returnValue = keys.reduce(
				(existing, key) => {
					existing[key] = createZodValues(shape[key], zodRuntime, zodTypes);
					return existing;
				},
				{} as Record<string, unknown>,
			);
			return returnValue;
		}

		case 'array': {
			return [createZodValues(getArrayElement(schema), zodRuntime, zodTypes)];
		}

		case 'union': {
			const firstOption = getUnionOptions(schema)[0];
			return firstOption
				? createZodValues(firstOption, zodRuntime, zodTypes)
				: undefined;
		}

		case 'discriminatedUnion': {
			const options = getUnionOptions(schema)[0];
			return createZodValues(options, zodRuntime, zodTypes);
		}

		case 'literal': {
			return getLiteralValue(schema);
		}

		case 'effects': {
			const description = getZodSchemaDescription(schema);
			if (
				zodTypes &&
				description === zodTypes.ZodZypesInternals.REMOTION_COLOR_BRAND
			) {
				return '#ffffff';
			}

			if (
				zodTypes &&
				description === zodTypes.ZodZypesInternals.REMOTION_TEXTAREA_BRAND
			) {
				return '';
			}

			if (
				zodTypes &&
				description === zodTypes.ZodZypesInternals.REMOTION_MATRIX_BRAND
			) {
				return [
					[1, 0, 0],
					[0, 1, 0],
					[0, 0, 1],
				];
			}

			return createZodValues(getEffectsInner(schema), zodRuntime, zodTypes);
		}

		case 'intersection': {
			const {left, right} = def;
			const leftValue = createZodValues(left, zodRuntime, zodTypes);
			if (typeof leftValue !== 'object') {
				throw new Error(
					'Cannot create value for type z.intersection: Left side is not an object',
				);
			}

			const rightValue = createZodValues(right, zodRuntime, zodTypes);

			if (typeof rightValue !== 'object') {
				throw new Error(
					'Cannot create value for type z.intersection: Right side is not an object',
				);
			}

			return {...leftValue, ...rightValue};
		}

		case 'tuple': {
			const items = def.items.map((item: AnySchema) =>
				createZodValues(item, zodRuntime, zodTypes),
			);
			return items;
		}

		case 'record': {
			const values = createZodValues(def.valueType, zodRuntime, zodTypes);
			return {key: values};
		}

		case 'map': {
			const values = createZodValues(def.valueType, zodRuntime, zodTypes);
			const key = createZodValues(def.keyType, zodRuntime, zodTypes);
			return new Map([[key, values]]);
		}

		case 'lazy': {
			const type = def.getter();
			return createZodValues(type, zodRuntime, zodTypes);
		}

		case 'set': {
			const values = createZodValues(def.valueType, zodRuntime, zodTypes);
			return new Set([values]);
		}

		case 'function': {
			throw new Error('Cannot create a value for type function');
		}

		case 'enum': {
			return getEnumValues(schema)[0];
		}

		case 'nativeEnum': {
			return 0;
		}

		case 'optional':
		case 'nullable':
		case 'catch': {
			return createZodValues(getInnerType(schema), zodRuntime, zodTypes);
		}

		case 'default': {
			return getDefaultValue(schema);
		}

		case 'promise': {
			// v3: _def.type, v4: _def.innerType
			const inner = isZodV3Schema(schema) ? def.type : def.innerType;
			const value = createZodValues(inner, zodRuntime, zodTypes);
			return Promise.resolve(value);
		}

		case 'branded': {
			// v3: _def.type, v4: schema is the base type (branded doesn't wrap in v4)
			const inner = isZodV3Schema(schema) ? def.type : schema;
			return createZodValues(inner, zodRuntime, zodTypes);
		}

		case 'pipeline': {
			// v3: _def.out, v4: _def.out
			return createZodValues(def.out, zodRuntime, zodTypes);
		}

		default:
			throw new Error('Not implemented: ' + typeName);
	}
};
