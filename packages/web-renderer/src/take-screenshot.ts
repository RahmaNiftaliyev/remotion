import type {LogLevel} from 'remotion';
import {Internals} from 'remotion';
import {compose} from './compose';
import {
	createLayerWithDrawElementImage,
	isRootLayerCutout,
	supportsNativeHtmlInCanvas,
} from './html-in-canvas';
import type {InternalState} from './internal-state';

export const createLayer = async ({
	element,
	scale,
	logLevel,
	internalState,
	onlyBackgroundClipText,
	cutout,
	enableHtmlInCanvas = true,
	onHtmlInCanvasCapture,
}: {
	element: HTMLElement | SVGElement;
	scale: number;
	logLevel: LogLevel;
	internalState: InternalState;
	onlyBackgroundClipText: boolean;
	cutout: DOMRect;
	enableHtmlInCanvas?: boolean;
	onHtmlInCanvasCapture?: () => void;
}) => {
	if (
		enableHtmlInCanvas &&
		!onlyBackgroundClipText &&
		element instanceof HTMLElement &&
		supportsNativeHtmlInCanvas() &&
		isRootLayerCutout(element, cutout)
	) {
		try {
			const layerContext = await createLayerWithDrawElementImage({
				element,
				scale,
				cutout,
			});
			onHtmlInCanvasCapture?.();
			return layerContext;
		} catch (err) {
			Internals.Log.verbose(
				{logLevel, tag: '@remotion/web-renderer'},
				'html-in-canvas capture failed, falling back to software compose',
				err,
			);
		}
	}

	const scaledWidth = Math.ceil(cutout.width * scale);
	const scaledHeight = Math.ceil(cutout.height * scale);
	const canvas = new OffscreenCanvas(scaledWidth, scaledHeight);
	const context = canvas.getContext('2d');

	if (!context) {
		throw new Error('Could not get context');
	}

	await compose({
		element,
		context,
		logLevel,
		parentRect: cutout,
		internalState,
		onlyBackgroundClipText,
		scale,
	});

	return context;
};
