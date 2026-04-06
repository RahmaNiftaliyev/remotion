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

export const isRootLayerCutout = (
	element: HTMLElement,
	cutout: DOMRect,
): boolean => {
	return (
		cutout.x === 0 &&
		cutout.y === 0 &&
		Math.abs(cutout.width - element.offsetWidth) < 1 &&
		Math.abs(cutout.height - element.offsetHeight) < 1
	);
};

const flushTwoAnimationFrames = (): Promise<void> => {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});
};

const isNoCachedPaintRecordError = (err: unknown): boolean => {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes('cached paint record') || msg.includes('No cached paint');
};

/**
 * Renders `element` into an OffscreenCanvas using Chromium's html-in-canvas API
 * (drawElementImage), when the element can be a direct child of a layoutsubtree canvas.
 * See https://github.com/WICG/html-in-canvas
 */
export const createLayerWithDrawElementImage = async ({
	element,
	scale,
	cutout,
}: {
	element: HTMLElement;
	scale: number;
	cutout: DOMRect;
}): Promise<OffscreenCanvasRenderingContext2D> => {
	const scaledWidth = Math.ceil(cutout.width * scale);
	const scaledHeight = Math.ceil(cutout.height * scale);

	const parent = element.parentElement;
	if (!parent) {
		throw new Error('html-in-canvas: element has no parent');
	}

	const {nextSibling} = element;
	const {transform: previousTransform} = element.style;

	const layoutCanvas = document.createElement(
		'canvas',
	) as HTMLCanvasWithLayoutSubtree;
	layoutCanvas.layoutSubtree = true;

	layoutCanvas.width = scaledWidth;
	layoutCanvas.height = scaledHeight;
	layoutCanvas.style.position = 'absolute';
	layoutCanvas.style.visibility = 'hidden';
	layoutCanvas.style.pointerEvents = 'none';
	layoutCanvas.style.top = '0';
	layoutCanvas.style.left = '0';
	layoutCanvas.style.width = `${cutout.width}px`;
	layoutCanvas.style.height = `${cutout.height}px`;

	parent.removeChild(element);
	layoutCanvas.appendChild(element);
	parent.appendChild(layoutCanvas);

	const restoreDom = () => {
		layoutCanvas.removeChild(element);
		parent.removeChild(layoutCanvas);
		if (nextSibling) {
			parent.insertBefore(element, nextSibling);
		} else {
			parent.appendChild(element);
		}

		element.style.transform = previousTransform;
	};

	try {
		const maybeCtx = layoutCanvas.getContext(
			'2d',
		) as Canvas2DWithDrawElement | null;
		if (!maybeCtx || typeof maybeCtx.drawElementImage !== 'function') {
			throw new Error('html-in-canvas: drawElementImage not available');
		}

		const context = maybeCtx;

		const {requestPaint} = layoutCanvas;
		if (typeof requestPaint !== 'function') {
			throw new Error('html-in-canvas: requestPaint not available');
		}

		const schedulePaint = () => {
			requestPaint.call(layoutCanvas);
		};

		await flushTwoAnimationFrames();

		const maxDrawAttempts = 8;
		let drawAttempts = 0;
		let warmupPaintsDone = 0;
		const warmupPaintsBeforeDraw = 1;

		await new Promise<void>((resolve, reject) => {
			let settled = false;
			let timeoutId = 0;

			// `let` so armTimeout/scheduleNextPaint can close over the same reference before assignment.
			// eslint-disable-next-line prefer-const -- assigned after helper declarations for listener identity
			let onPaint: () => void;

			function armTimeout() {
				window.clearTimeout(timeoutId);
				timeoutId = window.setTimeout(() => {
					if (settled) {
						return;
					}

					layoutCanvas.removeEventListener('paint', onPaint);
					settled = true;
					reject(new Error('html-in-canvas: paint event timed out'));
				}, 5_000);
			}

			function scheduleNextPaint() {
				queueMicrotask(() => {
					if (settled) {
						return;
					}

					armTimeout();
					layoutCanvas.addEventListener('paint', onPaint, {once: true});
					schedulePaint();
				});
			}

			onPaint = () => {
				if (settled) {
					return;
				}

				window.clearTimeout(timeoutId);

				if (warmupPaintsDone < warmupPaintsBeforeDraw) {
					warmupPaintsDone++;
					scheduleNextPaint();
					return;
				}

				drawAttempts++;
				try {
					context.reset();
					context.drawElementImage(element, 0, 0, scaledWidth, scaledHeight);
					settled = true;
					resolve();
				} catch (err) {
					if (
						isNoCachedPaintRecordError(err) &&
						drawAttempts < maxDrawAttempts
					) {
						scheduleNextPaint();
						return;
					}

					settled = true;
					reject(err);
				}
			};

			armTimeout();
			layoutCanvas.addEventListener('paint', onPaint, {once: true});
			schedulePaint();
		});

		const offscreen = new OffscreenCanvas(scaledWidth, scaledHeight);
		const offCtx = offscreen.getContext('2d');
		if (!offCtx) {
			throw new Error('Could not get offscreen context');
		}

		offCtx.drawImage(layoutCanvas, 0, 0);

		return offCtx;
	} finally {
		restoreDom();
	}
};
