import type {SequenceControls, SequenceFieldSchema} from 'remotion';

export type {SequenceControls};

export type SchemaFieldInfo = {
	key: string;
	description: string | undefined;
	typeName: string;
	supported: boolean;
	rowHeight: number;
	currentValue: unknown;
	fieldSchema: SequenceFieldSchema;
};

export const SCHEMA_FIELD_ROW_HEIGHT = 22;
export const UNSUPPORTED_FIELD_ROW_HEIGHT = 22;

const SUPPORTED_SCHEMA_TYPES = new Set([
	'number',
	'boolean',
	'rotation',
	'translate',
	'enum',
]);

export const getSchemaFields = (
	controls: SequenceControls | null,
): SchemaFieldInfo[] | null => {
	if (!controls) {
		return null;
	}

	return Object.entries(controls.schema).map(([key, fieldSchema]) => {
		const typeName = fieldSchema.type;
		const supported = SUPPORTED_SCHEMA_TYPES.has(typeName);
		return {
			key,
			description: fieldSchema.description,
			typeName,
			supported,
			rowHeight: supported
				? SCHEMA_FIELD_ROW_HEIGHT
				: UNSUPPORTED_FIELD_ROW_HEIGHT,
			currentValue: controls.currentValue[key],
			fieldSchema,
		};
	});
};
