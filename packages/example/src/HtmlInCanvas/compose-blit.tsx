import React from 'react';
import {AbsoluteFill, HtmlInCanvas, useVideoConfig} from 'remotion';
import {HtmlInCanvasScene} from './scene';

/** Explicit 2D blit from rasterized DOM (`source`) to the visible canvas (`target`). */
export const HtmlInCanvasComposeBlit: React.FC = () => {
	const {width, height} = useVideoConfig();

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas
				width={width}
				height={height}
				onCompose={({source, target, width: w, height: h}) => {
					const ctx = target.getContext('2d');
					if (!ctx) {
						return;
					}

					ctx.clearRect(0, 0, w, h);
					ctx.drawImage(source, 0, 0, w, h);
				}}
			>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
