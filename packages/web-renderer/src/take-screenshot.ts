import type {LogLevel} from 'remotion';
import {Internals} from 'remotion';
import {compose} from './compose';
import type {HtmlInCanvasContext} from './html-in-canvas';
import {drawWithHtmlInCanvas} from './html-in-canvas';
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
	htmlInCanvasContext,
	onHtmlInCanvasLayerOutcome,
}: {
	element: HTMLElement | SVGElement;
	scale: number;
	logLevel: LogLevel;
	internalState: InternalState;
	onlyBackgroundClipText: boolean;
	cutout: DOMRect;
	htmlInCanvasContext?: HtmlInCanvasContext | null;
	onHtmlInCanvasLayerOutcome?: (outcome: HtmlInCanvasLayerOutcome) => void;
}) => {
	const scaledWidth = Math.ceil(cutout.width * scale);
	const scaledHeight = Math.ceil(cutout.height * scale);

	if (
		!onlyBackgroundClipText &&
		element instanceof HTMLElement &&
		htmlInCanvasContext &&
		onHtmlInCanvasLayerOutcome
	) {
		try {
			const offCtx = drawWithHtmlInCanvas({
				htmlInCanvasContext,
				element,
				scaledWidth,
				scaledHeight,
			});
			onHtmlInCanvasLayerOutcome({native: true});
			return offCtx;
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
