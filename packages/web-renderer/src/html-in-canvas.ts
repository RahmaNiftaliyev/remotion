type Canvas2DWithDrawElement = CanvasRenderingContext2D & {
	drawElementImage: (
		element: Element,
		dx: number,
		dy: number,
		dwidth: number,
		dheight: number,
	) => DOMMatrix;
};

type HTMLCanvasWithLayoutSubtree = HTMLCanvasElement & {
	layoutSubtree?: boolean;
	requestPaint?: () => void;
};

export const supportsNativeHtmlInCanvas = (): boolean => {
	if (typeof document === 'undefined') {
		return false;
	}

	const ctx = document
		.createElement('canvas')
		.getContext('2d') as Canvas2DWithDrawElement | null;
	return typeof ctx?.drawElementImage === 'function';
};

export type HtmlInCanvasContext = {
	layoutCanvas: HTMLCanvasWithLayoutSubtree;
	ctx: Canvas2DWithDrawElement;
	warmedUp: boolean;
};

const isNoCachedPaintRecordError = (err: unknown): boolean => {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes('cached paint record') || msg.includes('No cached paint');
};

const waitOneAnimationFrame = (): Promise<void> => {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
};

/**
 * Sets up a persistent layoutsubtree canvas that wraps the scaffold div.
 * The div becomes a direct child of the canvas, which is required for drawElementImage.
 * Must be called once before rendering begins; the canvas stays in the DOM for the
 * lifetime of the render.
 */
export const setupHtmlInCanvas = ({
	wrapper,
	div,
	width,
	height,
}: {
	wrapper: HTMLDivElement;
	div: HTMLDivElement;
	width: number;
	height: number;
}): HtmlInCanvasContext | null => {
	if (!supportsNativeHtmlInCanvas()) {
		return null;
	}

	const layoutCanvas = document.createElement(
		'canvas',
	) as HTMLCanvasWithLayoutSubtree;
	layoutCanvas.layoutSubtree = true;

	layoutCanvas.width = width;
	layoutCanvas.height = height;
	layoutCanvas.style.position = 'absolute';
	layoutCanvas.style.top = '0';
	layoutCanvas.style.left = '0';
	layoutCanvas.style.width = `${width}px`;
	layoutCanvas.style.height = `${height}px`;
	// The wrapper has visibility:hidden which is inherited. Override it so
	// Chromium's paint pipeline creates a paint record for the layoutsubtree
	// children. The spec says children "behave as if visible" but in practice
	// inherited visibility:hidden can suppress the internal snapshot.
	layoutCanvas.style.visibility = 'visible';

	const maybeCtx = layoutCanvas.getContext(
		'2d',
	) as Canvas2DWithDrawElement | null;
	if (!maybeCtx || typeof maybeCtx.drawElementImage !== 'function') {
		return null;
	}

	wrapper.removeChild(div);
	layoutCanvas.appendChild(div);
	wrapper.appendChild(layoutCanvas);

	return {layoutCanvas, ctx: maybeCtx, warmedUp: false};
};

const MAX_WARMUP_ATTEMPTS = 10;

/**
 * Draws the scaffold div into an OffscreenCanvas using the persistent
 * html-in-canvas context. Called per-frame; no reparenting needed because
 * the div is already a child of the layoutsubtree canvas.
 *
 * On the first call the browser may not have a paint record yet. In that case
 * we wait for animation frames and retry up to MAX_WARMUP_ATTEMPTS times before
 * giving up. After the first success, subsequent calls are synchronous.
 */
export const drawWithHtmlInCanvas = async ({
	htmlInCanvasContext,
	element,
	scaledWidth,
	scaledHeight,
}: {
	htmlInCanvasContext: HtmlInCanvasContext;
	element: HTMLElement;
	scaledWidth: number;
	scaledHeight: number;
}): Promise<OffscreenCanvasRenderingContext2D> => {
	const {ctx, layoutCanvas} = htmlInCanvasContext;

	const draw = (): OffscreenCanvasRenderingContext2D => {
		layoutCanvas.width = scaledWidth;
		layoutCanvas.height = scaledHeight;

		ctx.reset();
		ctx.drawElementImage(element, 0, 0, scaledWidth, scaledHeight);

		const offscreen = new OffscreenCanvas(scaledWidth, scaledHeight);
		const offCtx = offscreen.getContext('2d');
		if (!offCtx) {
			throw new Error('Could not get offscreen context');
		}

		offCtx.drawImage(layoutCanvas, 0, 0);
		return offCtx;
	};

	if (htmlInCanvasContext.warmedUp) {
		return draw();
	}

	let lastError: unknown;
	for (let attempt = 0; attempt < MAX_WARMUP_ATTEMPTS; attempt++) {
		try {
			const result = draw();
			htmlInCanvasContext.warmedUp = true;
			return result;
		} catch (err) {
			if (!isNoCachedPaintRecordError(err)) {
				throw err;
			}

			lastError = err;
			await waitOneAnimationFrame();
		}
	}

	throw lastError;
};

export const teardownHtmlInCanvas = ({
	htmlInCanvasContext,
	wrapper,
	div,
}: {
	htmlInCanvasContext: HtmlInCanvasContext;
	wrapper: HTMLDivElement;
	div: HTMLDivElement;
}) => {
	const {layoutCanvas} = htmlInCanvasContext;
	layoutCanvas.removeChild(div);
	wrapper.removeChild(layoutCanvas);
	wrapper.appendChild(div);
};
