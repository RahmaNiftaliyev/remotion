import type {AssignmentExpression, ExpressionStatement} from '@babel/types';
import {stringifyDefaultProps, type EnumPath} from '@remotion/studio-shared';
import type {ExpressionKind} from 'ast-types/lib/gen/kinds';
import * as recast from 'recast';
import {parseAst, serializeAst} from './parse-ast';

export const updateSequenceProps = async ({
	input,
	targetLine,
	key,
	value,
	enumPaths,
}: {
	input: string;
	targetLine: number;
	key: string;
	value: unknown;
	enumPaths: EnumPath[];
}): Promise<string> => {
	const ast = parseAst(input);
	let found = false;

	recast.types.visit(ast, {
		visitJSXOpeningElement(path) {
			const {node} = path;

			if (!node.loc || node.loc.start.line !== targetLine) {
				return this.traverse(path);
			}

			const attr = node.attributes?.find((a) => {
				if (a.type === 'JSXSpreadAttribute') {
					return false;
				}

				if (a.name.type === 'JSXNamespacedName') {
					return false;
				}

				return a.name.name === key;
			});

			if (!attr || attr.type === 'JSXSpreadAttribute') {
				throw new Error(`Could not find attribute "${key}" on the JSX element at line ${targetLine}`);
			}

			const parsed = (
				(
					parseAst(`a = ${stringifyDefaultProps({props: value, enumPaths})}`)
						.program.body[0] as unknown as ExpressionStatement
				).expression as AssignmentExpression
			).right as ExpressionKind;

			attr.value = recast.types.builders.jsxExpressionContainer(parsed);
			found = true;

			return this.traverse(path);
		},
	});

	if (!found) {
		throw new Error(
			'Could not find a JSX element at the specified line to update',
		);
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	type PrettierType = typeof import('prettier');
	let prettier: PrettierType | null = null;

	try {
		prettier = await import('prettier');
	} catch {
		throw new Error('Prettier cannot be found in the current project.');
	}

	const {format, resolveConfig, resolveConfigFile} = prettier as PrettierType;

	const configFilePath = await resolveConfigFile();
	if (!configFilePath) {
		throw new Error('The Prettier config file was not found');
	}

	const prettierConfig = await resolveConfig(configFilePath);
	if (!prettierConfig) {
		throw new Error(
			'The Prettier config file was not found. For this feature, the "prettier" package must be installed and a .prettierrc file must exist.',
		);
	}

	const finalFile = serializeAst(ast);

	const prettified = await format(finalFile, {
		...prettierConfig,
		filepath: 'test.tsx',
		plugins: [],
		endOfLine: 'auto',
	});
	return prettified;
};
