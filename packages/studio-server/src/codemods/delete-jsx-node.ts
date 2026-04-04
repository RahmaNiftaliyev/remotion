import type {File, JSXElement, Node} from '@babel/types';
import type {SequenceNodePath} from '@remotion/studio-shared';
import * as recast from 'recast';
import {parseAst, serializeAst} from './parse-ast';

const {builders: b, namedTypes} = recast.types;

export const findJsxElementPathForDeletion = (
	ast: File,
	nodePath: SequenceNodePath,
): recast.types.NodePath | null => {
	let current = new recast.types.NodePath(ast);
	for (const segment of nodePath) {
		current = current.get(segment);
		if (current.value === null || current.value === undefined) {
			return null;
		}
	}

	if (namedTypes.JSXOpeningElement.check(current.value)) {
		const parent = current.parentPath;
		if (parent && namedTypes.JSXElement.check(parent.value)) {
			return parent;
		}

		return null;
	}

	if (namedTypes.JSXElement.check(current.value)) {
		return current;
	}

	return null;
};

const replaceNodeWithNull = (parentNode: Node, node: JSXElement): boolean => {
	// Recast AST nodes use ast-types intersections; assignments need a loose handle.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const p = parentNode as any;

	if (namedTypes.LogicalExpression.check(parentNode)) {
		if (p.left === node) {
			p.left = b.nullLiteral();
			return true;
		}

		if (p.right === node) {
			p.right = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ConditionalExpression.check(parentNode)) {
		if (p.consequent === node) {
			p.consequent = b.nullLiteral();
			return true;
		}

		if (p.alternate === node) {
			p.alternate = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ArrowFunctionExpression.check(parentNode)) {
		if (p.body === node) {
			p.body = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ReturnStatement.check(parentNode)) {
		if (p.argument === node) {
			p.argument = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.CallExpression.check(parentNode)) {
		const idx = p.arguments.indexOf(node);
		if (idx !== -1) {
			p.arguments[idx] = b.nullLiteral();
			return true;
		}
	}

	if (parentNode.type === 'OptionalCallExpression') {
		const idx = p.arguments.indexOf(node);
		if (idx !== -1) {
			p.arguments[idx] = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ArrayExpression.check(parentNode)) {
		const idx = p.elements.indexOf(node);
		if (idx !== -1) {
			p.elements[idx] = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.AssignmentExpression.check(parentNode)) {
		if (p.right === node) {
			p.right = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.VariableDeclarator.check(parentNode)) {
		if (p.init === node) {
			p.init = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ExportDefaultDeclaration.check(parentNode)) {
		if (p.declaration === node) {
			p.declaration = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.SequenceExpression.check(parentNode)) {
		const idx = p.expressions.indexOf(node);
		if (idx !== -1) {
			p.expressions[idx] = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.NewExpression.check(parentNode)) {
		const idx = p.arguments.indexOf(node);
		if (idx !== -1) {
			p.arguments[idx] = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ExpressionStatement.check(parentNode)) {
		if (p.expression === node) {
			p.expression = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.ParenthesizedExpression.check(parentNode)) {
		if (p.expression === node) {
			p.expression = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.JSXExpressionContainer.check(parentNode)) {
		if (p.expression === node) {
			p.expression = b.nullLiteral();
			return true;
		}
	}

	if (namedTypes.TSAsExpression.check(parentNode)) {
		if (p.expression === node) {
			p.expression = b.nullLiteral();
			return true;
		}
	}

	if (
		namedTypes.JSXElement.check(parentNode) ||
		namedTypes.JSXFragment.check(parentNode)
	) {
		const idx = p.children.indexOf(node);
		if (idx !== -1) {
			p.children.splice(idx, 1);
			return true;
		}
	}

	return false;
};

export const deleteJsxElementAtPath = (
	jsxPath: recast.types.NodePath,
): void => {
	const {node, parentPath} = jsxPath;
	if (!parentPath) {
		throw new Error('Cannot delete JSX element with no parent');
	}

	const jsxNode = node as JSXElement;

	if (replaceNodeWithNull(parentPath.node, jsxNode)) {
		return;
	}

	// Recast can replace this node in arbitrary parent contexts.
	jsxPath.replace(b.nullLiteral());
};

export const deleteJsxNode = async ({
	input,
	nodePath,
	prettierConfigOverride,
}: {
	input: string;
	nodePath: SequenceNodePath;
	prettierConfigOverride?: Record<string, unknown> | null;
}): Promise<{
	output: string;
	formatted: boolean;
}> => {
	const ast = parseAst(input);
	const jsxPath = findJsxElementPathForDeletion(ast, nodePath);
	if (!jsxPath) {
		throw new Error(
			'Could not find a JSX element at the specified location to delete',
		);
	}

	deleteJsxElementAtPath(jsxPath);

	const finalFile = serializeAst(ast);

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	type PrettierType = typeof import('prettier');
	let prettier: PrettierType | null = null;

	try {
		prettier = await import('prettier');
	} catch {
		return {
			output: finalFile,
			formatted: false,
		};
	}

	const {format, resolveConfig, resolveConfigFile} = prettier as PrettierType;

	let prettierConfig: Record<string, unknown> | null;

	if (prettierConfigOverride !== undefined) {
		prettierConfig = prettierConfigOverride;
	} else {
		const configFilePath = await resolveConfigFile();
		if (!configFilePath) {
			return {
				output: finalFile,
				formatted: false,
			};
		}

		prettierConfig = await resolveConfig(configFilePath);
	}

	if (!prettierConfig) {
		return {
			output: finalFile,
			formatted: false,
		};
	}

	const prettified = await format(finalFile, {
		...prettierConfig,
		filepath: 'test.tsx',
		plugins: [],
		endOfLine: 'lf',
	});

	return {
		output: prettified,
		formatted: true,
	};
};
