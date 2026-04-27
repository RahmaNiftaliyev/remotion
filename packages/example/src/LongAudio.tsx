import {Audio} from '@remotion/media';
import {getStaticFiles} from '@remotion/studio';
import {AbsoluteFill} from 'remotion';

const FILE_NAME = 'long-audio.wav';

const FFMPEG_COMMAND = `bunx remotion ffmpeg -f lavfi -i "sine=frequency=440:duration=3600" -c:a pcm_s16le public/${FILE_NAME}`;

export const LongAudio: React.FC = () => {
	const file = getStaticFiles().find((f) => f.name === FILE_NAME);

	if (!file) {
		return (
			<AbsoluteFill
				style={{
					backgroundColor: '#111',
					color: '#eee',
					fontFamily: 'monospace',
					padding: 60,
					justifyContent: 'center',
				}}
			>
				<div style={{fontSize: 32, marginBottom: 24}}>
					Missing <code>public/{FILE_NAME}</code>
				</div>
				<div style={{fontSize: 20, marginBottom: 16, opacity: 0.8}}>
					Generate a 1h test audio with:
				</div>
				<pre
					style={{
						fontSize: 22,
						background: '#222',
						padding: 24,
						borderRadius: 8,
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-all',
					}}
				>
					{FFMPEG_COMMAND}
				</pre>
			</AbsoluteFill>
		);
	}

	return <Audio src={file.src} />;
};
