import {expect, test} from 'bun:test';
import path from 'node:path';
import type {Expression} from '@babel/types';
import {parseAst} from '../codemods/parse-ast';
import {
	extractStaticValue,
	isStaticValue,
} from '../preview-server/routes/can-update-sequence-props';
import {isStaticValue} from '../preview-server/routes/can-update-sequence-props';
import {computeSequencePropsStatus} from '../preview-server/routes/can-update-sequence-props';

const parseExpression = (code: string): Expression => {
	const ast = parseAst(`a = ${code}`);
	const stmt = ast.program.body[0];
	if (
		stmt.type !== 'ExpressionStatement' ||
		stmt.expression.type !== 'AssignmentExpression'
	) {
		throw new Error('Unexpected AST');
	}

	return stmt.expression.right;
};

test('Static values should be detected as static', () => {
	expect(isStaticValue(parseExpression('42'))).toBe(true);
	expect(isStaticValue(parseExpression('"hello"'))).toBe(true);
	expect(isStaticValue(parseExpression('true'))).toBe(true);
	expect(isStaticValue(parseExpression('false'))).toBe(true);
	expect(isStaticValue(parseExpression('null'))).toBe(true);
	expect(isStaticValue(parseExpression('-1'))).toBe(true);
	expect(isStaticValue(parseExpression('[1, 2, 3]'))).toBe(true);
	expect(isStaticValue(parseExpression('{a: 1, b: "c"}'))).toBe(true);
	expect(isStaticValue(parseExpression('[]'))).toBe(true);
	expect(isStaticValue(parseExpression('{}'))).toBe(true);
});

test('Computed values should be detected as computed', () => {
	expect(isStaticValue(parseExpression('1 + 2'))).toBe(false);
	expect(isStaticValue(parseExpression('Math.random()'))).toBe(false);
	expect(isStaticValue(parseExpression('someVar'))).toBe(false);
	expect(isStaticValue(parseExpression('foo()'))).toBe(false);
	expect(isStaticValue(parseExpression('a ? b : c'))).toBe(false);
	// eslint-disable-next-line no-template-curly-in-string
	expect(isStaticValue(parseExpression('`template ${"x"}`'))).toBe(false);
});

test('extractStaticValue should extract values from AST nodes', () => {
	expect(extractStaticValue(parseExpression('42'))).toBe(42);
	expect(extractStaticValue(parseExpression('"hello"'))).toBe('hello');
	expect(extractStaticValue(parseExpression('true'))).toBe(true);
	expect(extractStaticValue(parseExpression('false'))).toBe(false);
	expect(extractStaticValue(parseExpression('null'))).toBe(null);
	expect(extractStaticValue(parseExpression('-1'))).toBe(-1);
	expect(extractStaticValue(parseExpression('[1, 2, 3]'))).toEqual([1, 2, 3]);
	expect(extractStaticValue(parseExpression('{a: 1, b: "c"}'))).toEqual({
		a: 1,
		b: 'c',
	});
	expect(extractStaticValue(parseExpression('[]'))).toEqual([]);
	expect(extractStaticValue(parseExpression('{}'))).toEqual({});
});

test('canUpdateSequenceProps should flag computed props', () => {
	const result = computeSequencePropsStatus({
		fileName: path.join(__dirname, 'snapshots', 'light-leak-computed.txt'),
		line: 8,
		keys: ['durationInFrames', 'seed', 'hueShift', 'nonExistentProp'],
		remotionRoot: '/',
	});

	expect(result.canUpdate).toBe(true);
	if (!result.canUpdate) {
		throw new Error('Expected canUpdate to be true');
	}

	expect(result.props.durationInFrames).toEqual({
		canUpdate: true,
		codeValue: 60,
	});
	expect(result.props.hueShift).toEqual({canUpdate: true, codeValue: 30});
	expect(result.props.seed).toEqual({canUpdate: false, reason: 'computed'});
	expect(result.props.nonExistentProp).toEqual({
		canUpdate: false,
		reason: 'not-set',
	});
});
