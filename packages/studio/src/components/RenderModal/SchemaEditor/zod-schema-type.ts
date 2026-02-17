/**
 * Normalizes zod schema type detection across v3 and v4.
 *
 * v3 schemas have `_def.typeName` (e.g. "ZodString")
 * v4 schemas have `_def.type` (e.g. "string") and `_zod` property
 *
 * This module provides a unified type name using v4-style lowercase strings,
 * and accessor helpers that abstract v3/v4 `_def` property differences.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

export type ZodSchemaType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'object'
	| 'array'
	| 'enum'
	| 'union'
	| 'discriminatedUnion'
	| 'optional'
	| 'nullable'
	| 'default'
	| 'tuple'
	| 'date'
	| 'any'
	| 'unknown'
	| 'bigint'
	| 'null'
	| 'undefined'
	| 'effects'
	| 'literal'
	| 'record'
	| 'never'
	| (string & {});

const v3TypeNameMap: Record<string, ZodSchemaType> = {
	ZodString: 'string',
	ZodNumber: 'number',
	ZodBoolean: 'boolean',
	ZodObject: 'object',
	ZodArray: 'array',
	ZodEnum: 'enum',
	ZodUnion: 'union',
	ZodDiscriminatedUnion: 'discriminatedUnion',
	ZodOptional: 'optional',
	ZodNullable: 'nullable',
	ZodDefault: 'default',
	ZodTuple: 'tuple',
	ZodDate: 'date',
	ZodAny: 'any',
	ZodUnknown: 'unknown',
	ZodBigInt: 'bigint',
	ZodNull: 'null',
	ZodUndefined: 'undefined',
	ZodEffects: 'effects',
	ZodLiteral: 'literal',
	ZodRecord: 'record',
	ZodNever: 'never',
	ZodVoid: 'void',
	ZodNaN: 'nan',
	ZodSymbol: 'symbol',
	ZodIntersection: 'intersection',
	ZodMap: 'map',
	ZodSet: 'set',
	ZodLazy: 'lazy',
	ZodFunction: 'function',
	ZodNativeEnum: 'nativeEnum',
	ZodCatch: 'catch',
	ZodPromise: 'promise',
	ZodBranded: 'branded',
	ZodPipeline: 'pipeline',
};

export const isZodV3Schema = (schema: AnySchema): boolean => {
	return '_def' in schema && 'typeName' in schema._def;
};

/**
 * Get the normalized type name for a zod schema (v3 or v4).
 *
 * In v4, discriminatedUnion is a union with a `discriminator` property on `_def`.
 * This function returns 'discriminatedUnion' for that case.
 */
export const getZodSchemaType = (schema: AnySchema): ZodSchemaType => {
	if (isZodV3Schema(schema)) {
		const typeName: string = schema._def.typeName;
		return v3TypeNameMap[typeName] ?? typeName;
	}

	// v4 schema: _def.type is a string like "string", "number", etc.
	const type: string = schema._def.type;

	// In v4, discriminatedUnion has _def.type === "union" with _def.discriminator
	if (type === 'union' && schema._def.discriminator !== undefined) {
		return 'discriminatedUnion';
	}

	return type;
};

/**
 * Get the description of a schema, handling v3 vs v4 differences.
 *
 * v3: schema._def.description
 * v4: schema.description
 */
export const getZodSchemaDescription = (
	schema: AnySchema,
): string | undefined => {
	if (isZodV3Schema(schema)) {
		return schema._def.description;
	}

	return schema.description;
};

/**
 * Get the shape of an object schema.
 * v3: _def.shape() (function)
 * v4: _def.shape (plain object)
 */
export const getObjectShape = (schema: AnySchema): Record<string, unknown> => {
	const shape = schema._def.shape;
	return typeof shape === 'function' ? shape() : shape;
};

/**
 * Get the element schema of an array.
 * v3: _def.type
 * v4: _def.element
 */
export const getArrayElement = (schema: AnySchema): AnySchema => {
	return isZodV3Schema(schema) ? schema._def.type : schema._def.element;
};

/**
 * Get the inner type for wrappers like optional, nullable, default, catch.
 * Both v3 and v4 use _def.innerType.
 */
export const getInnerType = (schema: AnySchema): AnySchema => {
	return schema._def.innerType;
};

/**
 * Get the inner schema for effects (v3 only - v4 doesn't wrap).
 * v3: _def.schema
 */
export const getEffectsInner = (schema: AnySchema): AnySchema => {
	return schema._def.schema;
};

/**
 * Get the literal value.
 * v3: _def.value (single value)
 * v4: _def.values (array of values) - take the first
 */
export const getLiteralValue = (schema: AnySchema): unknown => {
	if (isZodV3Schema(schema)) {
		return schema._def.value;
	}

	return schema._def.values?.[0];
};

/**
 * Get enum values as an array of strings.
 * v3: _def.values (string[])
 * v4: _def.entries (Record<string,string>) - convert to values array
 */
export const getEnumValues = (schema: AnySchema): string[] => {
	if (isZodV3Schema(schema)) {
		return schema._def.values;
	}

	const entries = schema._def.entries;
	return Object.values(entries);
};

/**
 * Get the union/discriminatedUnion options array.
 * Both v3 and v4 use _def.options.
 */
export const getUnionOptions = (schema: AnySchema): AnySchema[] => {
	return schema._def.options;
};

/**
 * Get the default value from a ZodDefault.
 * v3: _def.defaultValue() (function)
 * v4: _def.defaultValue (plain value)
 */
export const getDefaultValue = (schema: AnySchema): unknown => {
	const dv = schema._def.defaultValue;
	return typeof dv === 'function' ? dv() : dv;
};

/**
 * Get the discriminator key from a discriminated union.
 * v3: _def.discriminator
 * v4: _def.discriminator
 */
export const getDiscriminator = (schema: AnySchema): string => {
	return schema._def.discriminator;
};

/**
 * Get all discriminator option keys from a discriminated union.
 * v3: [..._def.optionsMap.keys()]
 * v4: iterate options and extract literal values from discriminator field
 */
export const getDiscriminatedOptionKeys = (schema: AnySchema): string[] => {
	const discriminator = getDiscriminator(schema);

	// v3 has optionsMap
	if (isZodV3Schema(schema) && schema._def.optionsMap) {
		return [...schema._def.optionsMap.keys()];
	}

	// v4: iterate options
	const options = getUnionOptions(schema);
	return options.map((option: AnySchema) => {
		const shape = getObjectShape(option);
		const discriminatorSchema = shape[discriminator] as AnySchema;
		return getLiteralValue(discriminatorSchema) as string;
	});
};

/**
 * Get the option schema matching a discriminator value.
 * v3: _def.optionsMap.get(value)
 * v4: find matching option by inspecting literal values
 */
export const getDiscriminatedOption = (
	schema: AnySchema,
	discriminatorValue: string,
): AnySchema => {
	const discriminator = getDiscriminator(schema);

	// v3 has optionsMap
	if (isZodV3Schema(schema) && schema._def.optionsMap) {
		return schema._def.optionsMap.get(discriminatorValue);
	}

	// v4: iterate options
	const options = getUnionOptions(schema);
	return options.find((option: AnySchema) => {
		const shape = getObjectShape(option);
		const discriminatorSchema = shape[discriminator] as AnySchema;
		return getLiteralValue(discriminatorSchema) === discriminatorValue;
	});
};
