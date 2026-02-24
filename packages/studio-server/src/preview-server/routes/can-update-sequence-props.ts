import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {File} from '@babel/types';
import type {
	CanUpdateSequencePropsRequest,
	CanUpdateSequencePropsResponse,
} from '@remotion/studio-shared';
import * as recast from 'recast';
import {parseAst} from '../../codemods/parse-ast';
import type {ApiHandler} from '../api-types';

const findJsxElementAtLine = (ast: File, targetLine: number): boolean => {
	let found = false;

	recast.types.visit(ast, {
		visitJSXOpeningElement(nodePath) {
			const {node} = nodePath;
			if (node.loc && node.loc.start.line === targetLine) {
				found = true;
				return false;
			}

			return this.traverse(nodePath);
		},
	});

	return found;
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
