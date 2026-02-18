import type {AnyRemotionOption} from './option';

let currentWidth: number | null = null;

const cliFlag = 'width' as const;

export const overrideWidthOption = {
	name: 'Override Width',
	cliFlag,
	description: () => <>Overrides the width of the composition.</>,
	ssrName: null,
	docLink: 'https://www.remotion.dev/docs/config#overridewidth',
	type: null as number | null,
	getValue: ({commandLine}) => {
		if (commandLine[cliFlag] !== undefined) {
			const value = commandLine[cliFlag] as number;
			if (typeof value !== 'number') {
				throw new TypeError(
					`--width must be a number, got ${JSON.stringify(value)}`,
				);
			}

			return {
				source: 'cli',
				value,
			};
		}

		if (currentWidth !== null) {
			return {
				source: 'config',
				value: currentWidth,
			};
		}

		return {
			source: 'default',
			value: null,
		};
	},
	setConfig: (width) => {
		if (typeof width !== 'number') {
			throw new TypeError(
				`overrideWidth() must receive a number, got ${JSON.stringify(width)}`,
			);
		}

		currentWidth = width;
	},
	id: cliFlag,
} satisfies AnyRemotionOption<number | null>;
