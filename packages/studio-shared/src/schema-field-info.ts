import type {SequenceFieldSchema} from 'remotion';

export type SchemaFieldInfo = {
	key: string;
	description: string | undefined;
	typeName: string;
	supported: boolean;
	rowHeight: number;
	currentValue: unknown;
	fieldSchema: SequenceFieldSchema;
};
