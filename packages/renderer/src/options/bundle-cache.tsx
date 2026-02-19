import type {AnyRemotionOption} from './option';

const cliFlag = 'bundle-cache' as const;

let cachingEnabled = true;

export const bundleCacheOption = {
	name: 'Webpack Bundle Caching',
	cliFlag,
	description: () => (
		<>
			Enable or disable Webpack caching. This flag is enabled by default, use{' '}
			<code>--bundle-cache=false</code> to disable caching.
		</>
	),
	ssrName: null,
	docLink: 'https://www.remotion.dev/docs/config#setcachingenabled',
	getValue: ({commandLine}) => {
		if (commandLine[cliFlag] !== undefined && commandLine[cliFlag] !== null) {
			return {
				source: 'cli',
				value: Boolean(commandLine[cliFlag]),
			};
		}

		return {
			source: cachingEnabled ? 'default' : 'config',
			value: cachingEnabled,
		};
	},
	setConfig: (value: boolean) => {
		cachingEnabled = value;
	},
	type: true as boolean,
	id: cliFlag,
} satisfies AnyRemotionOption<boolean>;
