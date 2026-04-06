import type {LogLevel} from 'remotion';
import {Internals} from 'remotion';
import {compose} from './compose';
import {
	createLayerWithDrawElementImage,
	isRootLayerCutout,
	supportsNativeHtmlInCanvas,
} from './html-in-canvas';
import type {InternalState} from './internal-state';

export type HtmlInCanvasLayerOutcome =
	| {native: true}
	| {native: false; reason: string};

export const createLayer = async ({
	element,
	scale,
	logLevel,
	internalState,
	onlyBackgroundClipText,
	cutout,
	enableHtmlInCanvas = true,
	onHtmlInCanvasLayerOutcome,
}: {
	element: HTMLElement | SVGElement;
	scale: number;
	logLevel: LogLevel;
	internalState: InternalState;
	onlyBackgroundClipText: boolean;
	cutout: DOMRect;
	enableHtmlInCanvas?: boolean;
	onHtmlInCanvasLayerOutcome?: (outcome: HtmlInCanvasLayerOutcome) => void;
}) => {
	if (!onlyBackgroundClipText && onHtmlInCanvasLayerOutcome) {
		if (!(element instanceof HTMLElement)) {
			onHtmlInCanvasLayerOutcome({
				native: false,
				reason:
					'Root capture element is not an HTMLElement; html-in-canvas requires the scaffold div.',
			});
		} else if (!isRootLayerCutout(element, cutout)) {
			onHtmlInCanvasLayerOutcome({
				native: false,
				reason: `Full-frame cutout required for html-in-canvas: cutout is ${cutout.width}x${cutout.height} at (${cutout.x}, ${cutout.y}) but element is ${element.offsetWidth}x${element.offsetHeight}px (origin must be 0,0 and sizes must match).`,
			});
		} else if (!enableHtmlInCanvas) {
			onHtmlInCanvasLayerOutcome({
				native: false,
				reason:
					'enableHtmlInCanvas is false; using the built-in DOM composer instead.',
			});
		} else if (!supportsNativeHtmlInCanvas()) {
			onHtmlInCanvasLayerOutcome({
				native: false,
				reason:
					'This browser context does not expose CanvasRenderingContext2D.prototype.drawElementImage. In Chromium, enable chrome://flags/#canvas-draw-element (HTML-in-Canvas) and use a version that ships the API.',
			});
		} else {
			try {
				const layerContext = await createLayerWithDrawElementImage({
					element,
					scale,
					cutout,
				});
				onHtmlInCanvasLayerOutcome({native: true});
				return layerContext;
			} catch (err) {
				const detail = err instanceof Error ? err.message : JSON.stringify(err);
				onHtmlInCanvasLayerOutcome({
					native: false,
					reason: `drawElementImage failed (${detail}); falling back to the built-in DOM composer.`,
				});
				Internals.Log.verbose(
					{logLevel, tag: '@remotion/web-renderer'},
					'html-in-canvas capture failed, falling back to software compose',
					err,
				);
			}
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
