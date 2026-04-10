import type {AnyRemotionOption} from './option';

const cliFlag = 'sample-rate' as const;

let currentSampleRate: number = 48000;

export const sampleRateOption = {
	name: 'Sample Rate',
	cliFlag,
	description: () => (
		<>
			Controls the sample rate of the output audio. The default is{' '}
			<code>48000</code> Hz. Set to <code>44100</code> for CD-quality audio or
			to match your source audio and avoid resampling artifacts.
		</>
	),
	ssrName: 'sampleRate' as const,
	docLink: 'https://www.remotion.dev/docs/config#setsamplerate',
	type: 48000 as number,
	getValue: ({commandLine}: {commandLine: Record<string, unknown>}) => {
		if (commandLine[cliFlag] !== undefined) {
			return {value: commandLine[cliFlag] as number, source: 'cli'};
		}

		if (currentSampleRate !== 48000) {
			return {value: currentSampleRate, source: 'config file'};
		}

		return {value: 48000, source: 'default'};
	},
	setConfig: (value: number) => {
		currentSampleRate = value;
	},
	id: cliFlag,
} satisfies AnyRemotionOption<number>;
