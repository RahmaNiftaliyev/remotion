import type {SequenceControls, SequenceFieldSchema} from 'remotion';
import {Internals} from 'remotion';

export type {SequenceControls};

export type SchemaFieldInfo = {
	key: string;
	description: string | undefined;
	typeName: string;
	supported: boolean;
	rowHeight: number;
	currentRuntimeValue: unknown;
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

export const getFieldsToShow = (
	controls: SequenceControls | null,
): SchemaFieldInfo[] | null => {
	if (!controls) {
		return null;
	}

	const activeSchema = Internals.flattenActiveSchema(
		controls.schema,
		(key) => controls.currentRuntimeValueDotNotation[key],
	);

	return Object.entries(activeSchema).map(([key, fieldSchema]) => {
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
			currentRuntimeValue: controls.currentRuntimeValueDotNotation[key],
			fieldSchema,
		};
	});
};
