import type {Instruction} from '@remotion/paths';
import {serializeInstructions} from '@remotion/paths';
import {joinPoints} from './join-points';
import type {ShapeInfo} from './shape-info';

type ArrowDirection = 'right' | 'left' | 'up' | 'down';

export type MakeArrowProps = {
	length: number;
	headWidth: number;
	headLength: number;
	shaftWidth: number;
	direction?: ArrowDirection;
	edgeRoundness?: number | null;
	cornerRadius?: number;
};

/**
 * @description Generates an SVG path for an arrow shape.
 * @param {Number} length The total length of the arrow along its direction axis.
 * @param {Number} headWidth The width of the arrowhead at its widest point.
 * @param {Number} headLength The length of the arrowhead portion.
 * @param {Number} shaftWidth The width of the arrow shaft.
 * @param {string} direction The direction the arrow points. Default 'right'.
 * @param {Number} cornerRadius Rounds the corner using an arc. Similar to CSS's border-radius. Cannot be used together with edgeRoundness.
 * @param {null|Number} edgeRoundness Allows to modify the shape by rounding the edges using bezier curves. Default null.
 * @see [Documentation](https://www.remotion.dev/docs/shapes/make-arrow)
 */
export const makeArrow = ({
	length,
	headWidth,
	headLength,
	shaftWidth,
	direction = 'right',
	cornerRadius = 0,
	edgeRoundness = null,
}: MakeArrowProps): ShapeInfo => {
	if (length <= 0 || headWidth <= 0 || headLength <= 0 || shaftWidth <= 0) {
		throw new Error(
			'All dimension parameters ("length", "headWidth", "headLength", "shaftWidth") must be positive numbers',
		);
	}

	if (headWidth < shaftWidth) {
		throw new Error(
			`"headWidth" must be greater than or equal to "shaftWidth", got headWidth=${headWidth} and shaftWidth=${shaftWidth}`,
		);
	}

	if (headLength > length) {
		throw new Error(
			`"headLength" must be less than or equal to "length", got headLength=${headLength} and length=${length}`,
		);
	}

	const shaftTop = (headWidth - shaftWidth) / 2;
	const shaftBottom = shaftTop + shaftWidth;
	const shaftEnd = length - headLength;

	// Points for a right-pointing arrow (clockwise from top-left of shaft)
	const rightPoints: [number, number][] = [
		[0, shaftTop],
		[shaftEnd, shaftTop],
		[shaftEnd, 0],
		[length, headWidth / 2],
		[shaftEnd, headWidth],
		[shaftEnd, shaftBottom],
		[0, shaftBottom],
	];

	let points: [number, number][];
	let width: number;
	let height: number;

	if (direction === 'right') {
		points = rightPoints;
		width = length;
		height = headWidth;
	} else if (direction === 'left') {
		// Mirror x: x -> length - x
		points = rightPoints.map(([x, y]): [number, number] => [length - x, y]);
		width = length;
		height = headWidth;
	} else if (direction === 'down') {
		// Rotate 90° clockwise: swap axes so the tip points down
		points = [
			[shaftTop, 0],
			[shaftBottom, 0],
			[shaftBottom, shaftEnd],
			[headWidth, shaftEnd],
			[headWidth / 2, length],
			[0, shaftEnd],
			[shaftTop, shaftEnd],
		];
		width = headWidth;
		height = length;
	} else {
		// up: mirror of down (y -> length - y)
		points = [
			[shaftTop, length],
			[shaftBottom, length],
			[shaftBottom, headLength],
			[headWidth, headLength],
			[headWidth / 2, 0],
			[0, headLength],
			[shaftTop, headLength],
		];
		width = headWidth;
		height = length;
	}

	const instructions: Instruction[] = [
		...joinPoints([...points, points[0]], {
			edgeRoundness,
			cornerRadius,
			roundCornerStrategy: 'bezier',
		}),
		{type: 'Z'},
	];

	const path = serializeInstructions(instructions);

	return {
		path,
		instructions,
		width,
		height,
		transformOrigin: `${width / 2} ${height / 2}`,
	};
};
