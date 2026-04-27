import React from 'react';
import {AbsoluteFill, HtmlInCanvas, useVideoConfig} from 'remotion';
import {HtmlInCanvasScene} from './scene';

/** Async compose: upload via `createImageBitmap` then draw with 2D (still one frame — await keeps delayRender open). */
export const HtmlInCanvasComposeAsyncBitmap: React.FC = () => {
	const {width, height} = useVideoConfig();

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas
				width={width}
				height={height}
				onCompose={async ({source, target, width: w, height: h}) => {
					const bitmap = await createImageBitmap(source);
					try {
						const ctx = target.getContext('2d');
						if (!ctx) {
							return;
						}

						ctx.clearRect(0, 0, w, h);
						ctx.drawImage(bitmap, 0, 0, w, h);
					} finally {
						bitmap.close();
					}
				}}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
