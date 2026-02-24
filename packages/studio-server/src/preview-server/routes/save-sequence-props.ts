import type {
	SaveSequencePropsRequest,
	SaveSequencePropsResponse,
} from '@remotion/studio-shared';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {updateSequenceProps} from '../../codemods/update-sequence-props';
import type {ApiHandler} from '../api-types';

export const saveSequencePropsHandler: ApiHandler<
	SaveSequencePropsRequest,
	SaveSequencePropsResponse
> = async ({
	input: {fileName, line, column: _column, key, value, enumPaths},
	remotionRoot,
}) => {
	try {
		const absolutePath = path.resolve(remotionRoot, fileName);
		const fileRelativeToRoot = path.relative(remotionRoot, absolutePath);
		if (fileRelativeToRoot.startsWith('..')) {
			throw new Error('Cannot modify a file outside the project');
		}

		const fileContents = readFileSync(absolutePath, 'utf-8');

		const updated = await updateSequenceProps({
			input: fileContents,
			targetLine: line,
			key,
			value: JSON.parse(value),
			enumPaths,
		});

		writeFileSync(absolutePath, updated);

		return {
			success: true,
		};
	} catch (err) {
		return {
			success: false,
			reason: (err as Error).message,
		};
	}
};
