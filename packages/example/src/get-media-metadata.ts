import {ALL_FORMATS, createInputFrom} from 'mediabunny';

export const getMediaMetadata = async (src: string) => {
	const input = createInputFrom(src, ALL_FORMATS, {
		getRetryDelay: () => null,
	});

	const durationInSeconds = await input.computeDuration();
	const videoTrack = await input.getPrimaryVideoTrack();
	const dimensions = videoTrack
		? {
				width: await videoTrack.getDisplayWidth(),
				height: await videoTrack.getDisplayHeight(),
			}
		: null;
	const packetStats = await videoTrack?.computePacketStats(50);
	const fps = packetStats?.averagePacketRate ?? null;

	return {
		durationInSeconds,
		dimensions,
		fps,
	};
};
