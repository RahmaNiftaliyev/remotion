import type {AnyRemotionOption} from './option';

let currentFps: number | null = null;

const cliFlag = 'fps' as const;

export const overrideFpsOption = {
	name: 'Override FPS',
	cliFlag,
	description: () => <>Overrides the frames per second of the composition.</>,
	ssrName: null,
	docLink: 'https://www.remotion.dev/docs/config#overridefps',
	type: null as number | null,
	getValue: ({commandLine}) => {
		if (commandLine[cliFlag] !== undefined) {
			const value = commandLine[cliFlag] as number;
			if (typeof value !== 'number') {
				throw new TypeError(
					`--fps must be a number, got ${JSON.stringify(value)}`,
				);
			}

			return {
				source: 'cli',
				value,
			};
		}

		if (currentFps !== null) {
			return {
				source: 'config',
				value: currentFps,
			};
		}

		return {
			source: 'default',
			value: null,
		};
	},
	setConfig: (fps) => {
		if (typeof fps !== 'number') {
			throw new TypeError(
				`overrideFps() must receive a number, got ${JSON.stringify(fps)}`,
			);
		}

		currentFps = fps;
	},
	id: cliFlag,
} satisfies AnyRemotionOption<number | null>;
