import type {AnyRemotionOption} from './option';

let currentDuration: number | null = null;

const cliFlag = 'duration' as const;

export const overrideDurationOption = {
	name: 'Override Duration',
	cliFlag,
	description: () => (
		<>Overrides the duration in frames of the composition.</>
	),
	ssrName: null,
	docLink: 'https://www.remotion.dev/docs/config#overrideduration',
	type: null as number | null,
	getValue: ({commandLine}) => {
		if (commandLine[cliFlag] !== undefined) {
			const value = commandLine[cliFlag] as number;
			if (typeof value !== 'number') {
				throw new TypeError(
					`--duration must be a number, got ${JSON.stringify(value)}`,
				);
			}

			return {
				source: 'cli',
				value,
			};
		}

		if (currentDuration !== null) {
			return {
				source: 'config',
				value: currentDuration,
			};
		}

		return {
			source: 'default',
			value: null,
		};
	},
	setConfig: (duration) => {
		if (typeof duration !== 'number') {
			throw new TypeError(
				`overrideDuration() must receive a number, got ${JSON.stringify(duration)}`,
			);
		}

		currentDuration = duration;
	},
	id: cliFlag,
} satisfies AnyRemotionOption<number | null>;
