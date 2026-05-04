import {test} from 'bun:test';
import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {SchemaFieldInfo} from '@remotion/studio-shared';
import {parseAst} from '../codemods/parse-ast';
import {updateSequenceProps} from '../codemods/update-sequence-props';
import {lineColumnToNodePath} from '../preview-server/routes/can-update-sequence-props';

test('Should be able to update a discriminated union', async () => {
	const file = readFileSync(
		path.join(__dirname, 'snapshots', 'discriminated-union.txt'),
		'utf-8',
	);

	const ast = parseAst(file);

	const nodePath = lineColumnToNodePath(ast, 177);
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
			variants: {
				'absolute-fill': {
					'style.translate': {
						type: 'translate',
						step: 1,
						default: '0px 0px',
						description: 'Position',
					},
					'style.scale': {
						type: 'number',
						min: 0.05,
						max: 100,
						step: 0.01,
						default: 1,
						description: 'Scale',
					},
					'style.rotate': {
						type: 'rotation',
						step: 1,
						default: '0deg',
						description: 'Rotation',
					},
					'style.opacity': {
						type: 'number',
						min: 0,
						max: 1,
						step: 0.01,
						default: 1,
						description: 'Opacity',
					},
				},
				none: {},
			},
		},
	};

	const update = await updateSequenceProps({
		input: file,
		nodePath,
		key: 'layout',
		value: 'none',
		defaultValue: 'absolute-fill',
	});

	const expected = readFileSync(
		path.join(__dirname, 'snapshots', 'discriminated-union-expected.txt'),
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
