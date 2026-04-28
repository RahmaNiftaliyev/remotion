import {halftone, tint} from '@remotion/canvas-effects';
import {Video} from '@remotion/media';
import {CalculateMetadataFunction, Composition} from 'remotion';
// https://www.remotion.dev/docs/mediabunny/metadata
import {getMediaMetadata} from './get-media-metadata';

const src = 'https://remotion.media/video.mp4';

export const calculateMetadataFn: CalculateMetadataFunction<
	Record<string, unknown>
> = async () => {
	const {durationInSeconds, dimensions, fps} = await getMediaMetadata(src);

	return {
		durationInFrames: Math.round(durationInSeconds * fps!),
		fps: fps!,
		width: dimensions!.width,
		height: dimensions!.height,
	};
};

export const Component = () => {
	return (
		<>
			(
			<Video
				src={src}
				debugOverlay
				_experimentalEffects={[halftone(), tint({color: 'green', amount: 1})]}
				style={{
					translate: '-3px 434px',
				}}
			/>
			)(
			<Video
				src={src}
				debugOverlay
				_experimentalEffects={[
					halftone(),
					tint({
						color: 'green',
						amount: 1,
					}),
				]}
				style={{
					translate: '75px -443px',
					scale: 2.02,
				}}
			/>
			)
		</>
	);
};

export const NewVideoComp = () => {
	return (
		<Composition
			component={Component}
			id="NewVideo"
			calculateMetadata={calculateMetadataFn}
		/>
	);
};

// In Root.tsx:
// <NewVideoComp />
