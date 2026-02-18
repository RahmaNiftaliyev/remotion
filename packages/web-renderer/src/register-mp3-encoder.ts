import {canEncodeAudio} from 'mediabunny';

let mp3EncoderRegistered = false;

export const ensureMp3EncoderRegistered = async (): Promise<void> => {
	if (mp3EncoderRegistered) {
		return;
	}

	const nativeSupport = await canEncodeAudio('mp3');
	if (nativeSupport) {
		mp3EncoderRegistered = true;
		return;
	}

	const {registerMp3Encoder} = await import('@mediabunny/mp3-encoder');
	registerMp3Encoder();
	mp3EncoderRegistered = true;
};
