import type {
	CanUpdateSequencePropsRequest,
	CanUpdateSequencePropsResponse,
} from '@remotion/studio-shared';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {parseAst} from '../../codemods/parse-ast';
import type {ApiHandler} from '../api-types';
import {checkIfTypeScriptFile} from './can-update-default-props';

const findJsxElementAtLine = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node: any,
	targetLine: number,
): boolean => {
	if (!node || typeof node !== 'object') {
		return false;
	}

	if (node.type === 'JSXOpeningElement' && node.loc) {
		if (node.loc.start.line === targetLine) {
			return true;
		}
	}

	for (const key of Object.keys(node)) {
		if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
			continue;
		}

		const child = node[key];
		if (Array.isArray(child)) {
			for (const item of child) {
				if (findJsxElementAtLine(item, targetLine)) {
					return true;
				}
			}
		} else if (child && typeof child === 'object' && child.type) {
			if (findJsxElementAtLine(child, targetLine)) {
				return true;
			}
		}
	}

	return false;
};

export const canUpdateSequencePropsHandler: ApiHandler<
	CanUpdateSequencePropsRequest,
	CanUpdateSequencePropsResponse
> = ({input: {fileName, line, column: _column}, remotionRoot}) => {
	try {
		const absolutePath = path.resolve(remotionRoot, fileName);
		const fileRelativeToRoot = path.relative(remotionRoot, absolutePath);
		if (fileRelativeToRoot.startsWith('..')) {
			throw new Error('Cannot read a file outside the project');
		}

		checkIfTypeScriptFile(absolutePath);

		const fileContents = readFileSync(absolutePath, 'utf-8');
		const ast = parseAst(fileContents);

		const found = findJsxElementAtLine(ast, line);

		if (!found) {
			throw new Error('Could not find a JSX element at the specified location');
		}

		return Promise.resolve({
			canUpdate: true as const,
		});
	} catch (err) {
		return Promise.resolve({
			canUpdate: false as const,
			reason: (err as Error).message,
		});
	}
};
