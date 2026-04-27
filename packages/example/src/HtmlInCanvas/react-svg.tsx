import {halftone, tint} from '@remotion/canvas-effects';
import React from 'react';
import {HtmlInCanvas, useVideoConfig} from 'remotion';
import ReactSvg from '../ReactSvg';

/** ReactSvg scene rasterized with drawElementImage, then halftone + tint on the canvas. */
export const HtmlInCanvasReactSvg: React.FC<{
	readonly transparent: boolean;
}> = ({transparent}) => {
	const {width, height} = useVideoConfig();

	return (
		<HtmlInCanvas
			width={width}
			height={height}
			effects={[
				halftone({
					dotSize: 20,
					background: 'white',
				}),
				tint({color: 'green', amount: 0.1}),
			]}
		>
			<ReactSvg transparent={transparent} />
		</HtmlInCanvas>
	);
};
