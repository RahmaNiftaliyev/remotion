import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {RenderInternals} from '@remotion/renderer';
import type {
	SaveSequencePropsRequest,
	SaveSequencePropsResponse,
} from '@remotion/studio-shared';
import {updateSequenceProps} from '../../codemods/update-sequence-props';
import {makeHyperlink} from '../../hyperlinks/make-link';
import type {ApiHandler} from '../api-types';
import {suppressHmrForFile} from '../hmr-suppression';

export const saveSequencePropsHandler: ApiHandler<
	SaveSequencePropsRequest,
	SaveSequencePropsResponse
> = ({
	input: {fileName, line, column, key, value, enumPaths, defaultValue},
	remotionRoot,
	logLevel,
}) => {
	try {
		const absolutePath = path.resolve(remotionRoot, fileName);
		const fileRelativeToRoot = path.relative(remotionRoot, absolutePath);
		if (fileRelativeToRoot.startsWith('..')) {
			throw new Error('Cannot modify a file outside the project');
		}

		const fileContents = readFileSync(absolutePath, 'utf-8');

		const {output, oldValueString} = updateSequenceProps({
			input: fileContents,
			targetLine: line,
			key,
			value: JSON.parse(value),
			enumPaths,
			defaultValue: defaultValue !== null ? JSON.parse(defaultValue) : null,
		});

		suppressHmrForFile(absolutePath);
		writeFileSync(absolutePath, output);

		const newValueString = JSON.stringify(JSON.parse(value));
		const locationLabel = `${fileRelativeToRoot}:${line}:${column}`;
		const fileLink = makeHyperlink({
			url: `file://${absolutePath}`,
			text: locationLabel,
			fallback: locationLabel,
		});
		RenderInternals.Log.info(
			{indent: false, logLevel},
			RenderInternals.chalk.blueBright(
				`${fileLink} updated: ${key} ${oldValueString} \u2192 ${newValueString}`,
			),
		);

		return Promise.resolve({
			success: true,
		} as const);
	} catch (err) {
		return Promise.resolve({
			success: false,
			reason: (err as Error).message,
		} as const);
	}
};
