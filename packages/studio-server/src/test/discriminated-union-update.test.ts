import {expect, test} from 'bun:test';
import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {SchemaFieldInfo} from '@remotion/studio-shared';
import {getSchemaFields} from '@remotion/studio-shared';
import {Internals} from 'remotion';
import {parseAst} from '../codemods/parse-ast';
import {updateSequenceProps} from '../codemods/update-sequence-props';
import {lineColumnToNodePath} from '../preview-server/routes/can-update-sequence-props';

test('Should correctly separate discriminated union for layout', () => {
	const schemaFields = getSchemaFields({
		schema: Internals.sequenceSchema,
		currentValue: {
			layout: 'none',
		},
		overrideId: '0.7123890564498035',
	});
	expect(schemaFields?.map((s) => s.key)).toEqual(['layout']);
});

test('Should be able to update a discriminated union', async () => {
	const file = readFileSync(
		path.join(__dirname, 'snapshots', 'discriminated-union.tsx'),
		'utf-8',
	);

	const ast = parseAst(file);

	const nodePath = lineColumnToNodePath(ast, 3);
	assert(nodePath, 'No node path found');

	const field: SchemaFieldInfo = {
		key: 'layout',
		description: 'Layout',
		typeName: 'enum',
		supported: true,
		rowHeight: 22,
		currentValue: 'none',
		fieldSchema: {
			type: 'enum',
			default: 'absolute-fill',
			description: 'Layout',
			variants: Internals.sequenceSchema.layout.variants,
		},
	};

	const update = await updateSequenceProps({
		input: file,
		nodePath,
		updates: [
			{
				key: 'layout',
				value: 'none',
				defaultValue: field.fieldSchema.default,
			},
		],
	});

	const expected = readFileSync(
		path.join(__dirname, 'snapshots', 'discriminated-union-expected.tsx'),
		'utf-8',
	);
	const actualLines = update.output.split('\n');
	const expectedLines = expected.split('\n');
	const maxLines = Math.max(actualLines.length, expectedLines.length);
	for (let i = 0; i < maxLines; i++) {
		if (actualLines[i] !== expectedLines[i]) {
			console.log(update.output);
			console.log(actualLines[i], expectedLines[i]);
			throw new Error(
				`Line ${i + 1} differs ${actualLines[i]} ${expectedLines[i]}`,
			);
		}
	}
});
