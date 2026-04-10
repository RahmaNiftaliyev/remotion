import {getBiggestBoundingClientRect} from '../get-biggest-bounding-client-rect';

export const getPrecomposeRectForFilter = (
	element: HTMLElement | SVGElement,
) => {
	return getBiggestBoundingClientRect(element);
};
