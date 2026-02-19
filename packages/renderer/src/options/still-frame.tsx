import type {AnyRemotionOption} from './option';

const cliFlag = 'frame' as const;

let currentFrame: number | null = null;

export const stillFrameOption = {
	name: 'Frame',
	cliFlag,
	description: () => (
		<>
			Which frame should be rendered when rendering a still. Default{' '}
			<code>0</code>. From v3.2.27, negative values are allowed, with{' '}
			<code>-1</code> being the last frame.
		</>
	),
	ssrName: 'frame' as const,
	docLink: 'https://www.remotion.dev/docs/cli/still#--frame',
	getValue: ({commandLine}) => {
		if (commandLine[cliFlag] !== undefined) {
			return {
				source: 'cli',
				value: Number(commandLine[cliFlag]),
			};
		}

		if (currentFrame !== null) {
			return {
				source: 'config',
				value: currentFrame,
			};
		}

		return {
			source: 'default',
			value: null,
		};
	},
	setConfig: (value: number | null) => {
		currentFrame = value;
	},
	type: 0 as number | null,
	id: cliFlag,
} satisfies AnyRemotionOption<number | null>;
