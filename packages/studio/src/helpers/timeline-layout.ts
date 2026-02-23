import type {SequenceControls} from 'remotion';
import type {AnyZodSchema} from '../components/RenderModal/SchemaEditor/zod-schema-type';
import {
	getObjectShape,
	getZodSchemaType,
} from '../components/RenderModal/SchemaEditor/zod-schema-type';

export const TIMELINE_PADDING = 16;
export const TIMELINE_BORDER = 1;
export const TIMELINE_ITEM_BORDER_BOTTOM = 1;

export const TIMELINE_TRACK_EXPANDED_HEIGHT = 100;

export const SCHEMA_FIELD_ROW_HEIGHT = 26;
export const UNSUPPORTED_FIELD_ROW_HEIGHT = 26;

const SUPPORTED_SCHEMA_TYPES = new Set([
	'number',
	'string',
	'boolean',
	'enum',
	'date',
	'array',
	'object',
	'optional',
	'nullable',
	'default',
]);

export type SchemaFieldInfo = {
	key: string;
	typeName: string;
	supported: boolean;
	rowHeight: number;
	currentValue: unknown;
	fieldSchema: AnyZodSchema;
};

export const getSchemaFields = (
	controls: SequenceControls | null,
): SchemaFieldInfo[] | null => {
	if (!controls) {
		return null;
	}

	const shape = getObjectShape(controls.schema);
	return Object.entries(shape).map(([key, fieldSchema]) => {
		const typeName = getZodSchemaType(fieldSchema);
		const supported = SUPPORTED_SCHEMA_TYPES.has(typeName);
		return {
			key,
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

export const getExpandedTrackHeight = (
	controls: SequenceControls | null,
): number => {
	const fields = getSchemaFields(controls);
	if (!fields || fields.length === 0) {
		return TIMELINE_TRACK_EXPANDED_HEIGHT;
	}

	return fields.reduce((sum, f) => sum + f.rowHeight, 0);
};

export const getTimelineLayerHeight = (type: 'video' | 'other') => {
	if (type === 'video') {
		return 50;
	}

	return 25;
};
