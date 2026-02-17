import type {ZodTypesType} from '../../get-zod-if-possible';
import {
	getArrayElement,
	getEffectsInner,
	getInnerType,
	getObjectShape,
	getUnionOptions,
	getZodSchemaDescription,
	getZodSchemaType,
	isZodV3Schema,
} from './zod-schema-type';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

export const extractEnumJsonPaths = ({
	schema,
	zodRuntime,
	currentPath,
	zodTypes,
}: {
	schema: AnySchema;
	zodRuntime: unknown;
	zodTypes: ZodTypesType | null;
	currentPath: (string | number)[];
}): (string | number)[][] => {
	const def = schema._def;
	const typeName = getZodSchemaType(schema);

	switch (typeName) {
		case 'object': {
			const shape = getObjectShape(schema);
			const keys = Object.keys(shape);
			return keys
				.map((key) => {
					return extractEnumJsonPaths({
						schema: shape[key],
						zodRuntime,
						currentPath: [...currentPath, key],
						zodTypes,
					});
				})
				.flat(1);
		}

		case 'array': {
			return extractEnumJsonPaths({
				schema: getArrayElement(schema),
				zodRuntime,
				currentPath: [...currentPath, '[]'],
				zodTypes,
			});
		}

		case 'union': {
			return getUnionOptions(schema)
				.map((option: AnySchema) => {
					return extractEnumJsonPaths({
						schema: option,
						zodRuntime,
						currentPath,
						zodTypes,
					});
				})
				.flat(1);
		}

		case 'discriminatedUnion': {
			return getUnionOptions(schema)
				.map((op: AnySchema) => {
					return extractEnumJsonPaths({
						schema: op,
						zodRuntime,
						currentPath,
						zodTypes,
					});
				})
				.flat(1);
		}

		case 'literal': {
			return [currentPath];
		}

		case 'effects': {
			const description = getZodSchemaDescription(schema);
			if (
				zodTypes &&
				description === zodTypes.ZodZypesInternals.REMOTION_MATRIX_BRAND
			) {
				return [currentPath];
			}

			return extractEnumJsonPaths({
				schema: getEffectsInner(schema),
				zodRuntime,
				currentPath,
				zodTypes,
			});
		}

		case 'intersection': {
			const {left, right} = def;
			const leftValue = extractEnumJsonPaths({
				schema: left,
				zodRuntime,
				currentPath,
				zodTypes,
			});

			const rightValue = extractEnumJsonPaths({
				schema: right,
				zodRuntime,
				currentPath,
				zodTypes,
			});

			return [...leftValue, ...rightValue];
		}

		case 'tuple': {
			return def.items
				.map((item: AnySchema, i: number) =>
					extractEnumJsonPaths({
						schema: item,
						zodRuntime,
						currentPath: [...currentPath, i],
						zodTypes,
					}),
				)
				.flat(1);
		}

		case 'record': {
			return extractEnumJsonPaths({
				schema: def.valueType,
				zodRuntime,
				currentPath: [...currentPath, '{}'],
				zodTypes,
			});
		}

		case 'function': {
			throw new Error('Cannot create a value for type function');
		}

		case 'enum': {
			return [currentPath];
		}

		case 'nativeEnum': {
			return [];
		}

		case 'optional':
		case 'nullable':
		case 'catch': {
			return extractEnumJsonPaths({
				schema: getInnerType(schema),
				zodRuntime,
				currentPath,
				zodTypes,
			});
		}

		case 'default': {
			return extractEnumJsonPaths({
				schema: getInnerType(schema),
				zodRuntime,
				currentPath,
				zodTypes,
			});
		}

		case 'promise': {
			return [];
		}

		case 'branded': {
			const inner = isZodV3Schema(schema) ? def.type : schema;
			return extractEnumJsonPaths({
				schema: inner,
				zodRuntime,
				currentPath,
				zodTypes,
			});
		}

		case 'pipeline': {
			return extractEnumJsonPaths({
				schema: def.out,
				zodRuntime,
				currentPath,
				zodTypes,
			});
		}

		case 'string':
		case 'number':
		case 'bigint':
		case 'boolean':
		case 'nan':
		case 'date':
		case 'symbol':
		case 'undefined':
		case 'null':
		case 'any':
		case 'unknown':
		case 'never':
		case 'void':
		case 'map':
		case 'lazy':
		case 'set': {
			return [];
		}

		default:
			throw new Error('Not implemented: ' + typeName);
	}
};
