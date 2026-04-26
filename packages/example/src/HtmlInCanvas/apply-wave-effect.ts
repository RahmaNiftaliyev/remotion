import type {ApplyCanvasEffect} from './html-in-canvas';

// Apply a vertical wave effect: shift columns of the captured image up and
// down with a sine wave that moves over time.
export const applyWaveEffect: ApplyCanvasEffect = ({
	source,
	target,
	frame,
	width,
	height,
}) => {
	const ctx = target.getContext('2d');
	if (!ctx) {
		return;
	}

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, width, height);

	const sliceWidth = 4;
	const amplitude = 60;
	const wavelength = 240;

	for (let x = 0; x < width; x += sliceWidth) {
		const offset =
			Math.sin((x / wavelength) * Math.PI * 2 + frame / 6) * amplitude;
		ctx.drawImage(
			source,
			x,
			0,
			sliceWidth,
			height,
			x,
			offset,
			sliceWidth,
			height,
		);
	}
};
