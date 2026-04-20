import { ALL_FORMATS, createInputFrom } from "mediabunny";

export const getMediaMetadata = async (src: string) => {
  const input = createInputFrom(src, ALL_FORMATS, {
    getRetryDelay: () => null,
  });

  const durationInSeconds = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error(`Video track not found in source: ${src}`);
  }
  const dimensions = {
    width: await videoTrack.getDisplayWidth(),
    height: await videoTrack.getDisplayHeight(),
  };
  const packetStats = await videoTrack.computePacketStats(50);
  const fps = packetStats?.averagePacketRate ?? null;

  return {
    durationInSeconds,
    dimensions,
    fps,
  };
};

export type MediabunnyMetadata = Awaited<ReturnType<typeof getMediaMetadata>>;
