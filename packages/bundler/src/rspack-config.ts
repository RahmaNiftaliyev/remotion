import type {Configuration} from '@rspack/core';
import {DefinePlugin, ProgressPlugin, rspack} from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import {createHash} from 'node:crypto';
import path from 'node:path';
import ReactDOM from 'react-dom';
import {NoReactInternals} from 'remotion/no-react';
import {jsonStringifyWithCircularReferences} from './stringify-with-circular-references';
import {getWebpackCacheName} from './webpack-cache';
import type {WebpackOverrideFn} from './webpack-config';

export type RspackConfiguration = Configuration;

if (!ReactDOM?.version) {
	throw new Error('Could not find "react-dom" package. Did you install it?');
}

const reactDomVersion = ReactDOM.version.split('.')[0];
if (reactDomVersion === '0') {
	throw new Error(
		`Version ${reactDomVersion} of "react-dom" is not supported by Remotion`,
	);
}

const shouldUseReactDomClient = NoReactInternals.ENABLE_V5_BREAKING_CHANGES
	? true
	: parseInt(reactDomVersion, 10) >= 18;

export const rspackConfig = async ({
	entry,
	userDefinedComponent,
	outDir,
	environment,
	webpackOverride = (f) => f,
	onProgress,
	enableCaching = true,
	maxTimelineTracks,
	remotionRoot,
	keyboardShortcutsEnabled,
	bufferStateDelayInMilliseconds,
	poll,
	experimentalClientSideRenderingEnabled,
	askAIEnabled,
}: {
	entry: string;
	userDefinedComponent: string;
	outDir: string | null;
	environment: 'development' | 'production';
	webpackOverride: WebpackOverrideFn;
	onProgress?: (f: number) => void;
	enableCaching?: boolean;
	maxTimelineTracks: number | null;
	keyboardShortcutsEnabled: boolean;
	bufferStateDelayInMilliseconds: number | null;
	remotionRoot: string;
	poll: number | null;
	askAIEnabled: boolean;
	experimentalClientSideRenderingEnabled: boolean;
}): Promise<[string, RspackConfiguration]> => {
	let lastProgress = 0;

	const isBun = typeof Bun !== 'undefined';

	const define = new DefinePlugin({
		'process.env.MAX_TIMELINE_TRACKS': maxTimelineTracks as unknown as string,
		'process.env.ASK_AI_ENABLED': askAIEnabled as unknown as string,
		'process.env.KEYBOARD_SHORTCUTS_ENABLED':
			keyboardShortcutsEnabled as unknown as string,
		'process.env.BUFFER_STATE_DELAY_IN_MILLISECONDS':
			bufferStateDelayInMilliseconds as unknown as string,
		'process.env.EXPERIMENTAL_CLIENT_SIDE_RENDERING_ENABLED':
			experimentalClientSideRenderingEnabled as unknown as string,
	});

	const swcLoaderRule = {
		loader: 'builtin:swc-loader',
		options: {
			jsc: {
				parser: {syntax: 'typescript' as const, tsx: true},
				transform: {
					react: {
						runtime: 'automatic' as const,
						development: environment === 'development',
						refresh: environment === 'development',
					},
				},
			},
			env: {targets: 'Chrome >= 85'},
		},
	};

	const swcLoaderRuleJsx = {
		loader: 'builtin:swc-loader',
		options: {
			jsc: {
				parser: {syntax: 'ecmascript' as const, jsx: true},
				transform: {
					react: {
						runtime: 'automatic' as const,
						development: environment === 'development',
						refresh: environment === 'development',
					},
				},
			},
			env: {targets: 'Chrome >= 85'},
		},
	};

	// Rspack config is structurally compatible with webpack config at runtime,
	// but the TypeScript types differ. Cast through `any` for the override.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const conf = (await webpackOverride({
		optimization: {
			minimize: false,
		},
		ignoreWarnings: [
			/Circular dependency between chunks with runtime/,
			/Critical dependency: the request of a dependency is an expression/,
			/"__dirname" is used and has been mocked/,
		],
		experiments: {
			lazyCompilation: isBun
				? false
				: environment === 'production'
					? false
					: {
							entries: false,
						},
		},
		watchOptions: {
			poll: poll ?? undefined,
			aggregateTimeout: 0,
			ignored: ['**/.git/**', '**/.turbo/**', '**/node_modules/**'],
		},
		devtool:
			environment === 'development' ? 'source-map' : 'cheap-module-source-map',
		entry: [
			require.resolve('./setup-environment'),
			userDefinedComponent,
			require.resolve('../react-shim.js'),
			entry,
		].filter(Boolean) as [string, ...string[]],
		mode: environment,
		plugins:
			environment === 'development'
				? [
						new ReactRefreshPlugin(),
						new rspack.HotModuleReplacementPlugin(),
						define,
					]
				: [
						new ProgressPlugin((p: number) => {
							if (onProgress) {
								if ((p === 1 && p > lastProgress) || p - lastProgress > 0.05) {
									lastProgress = p;
									onProgress(Number((p * 100).toFixed(2)));
								}
							}
						}),
						define,
					],
		output: {
			hashFunction: 'xxhash64',
			filename: NoReactInternals.bundleName,
			devtoolModuleFilenameTemplate: '[resource-path]',
			assetModuleFilename:
				environment === 'development' ? '[path][name][ext]' : '[hash][ext]',
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.web.js', '.js', '.jsx', '.mjs', '.cjs'],
			alias: {
				'react/jsx-runtime': require.resolve('react/jsx-runtime'),
				'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
				react: require.resolve('react'),
				'remotion/no-react': path.resolve(
					require.resolve('remotion'),
					'..',
					'..',
					'esm',
					'no-react.mjs',
				),
				'remotion/version': path.resolve(
					require.resolve('remotion'),
					'..',
					'..',
					'esm',
					'version.mjs',
				),
				remotion: path.resolve(
					require.resolve('remotion'),
					'..',
					'..',
					'esm',
					'index.mjs',
				),
				'@remotion/media-parser/worker': path.resolve(
					require.resolve('@remotion/media-parser'),
					'..',
					'esm',
					'worker.mjs',
				),
				'@remotion/studio': require.resolve('@remotion/studio'),
				'react-dom/client': shouldUseReactDomClient
					? require.resolve('react-dom/client')
					: require.resolve('react-dom'),
			},
		},
		module: {
			rules: [
				{
					test: /\.css$/i,
					use: [require.resolve('style-loader'), require.resolve('css-loader')],
					type: 'javascript/auto',
				},
				{
					test: /\.(png|svg|jpg|jpeg|webp|gif|bmp|webm|mp4|mov|mp3|m4a|wav|aac)$/,
					type: 'asset/resource',
				},
				{
					test: /\.tsx?$/,
					use: [swcLoaderRule],
				},
				{
					test: /\.(woff(2)?|otf|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
					type: 'asset/resource',
				},
				{
					test: /\.jsx?$/,
					exclude: /node_modules/,
					use: [swcLoaderRuleJsx],
				},
			],
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any)) as RspackConfiguration;

	const hash = createHash('md5')
		.update(jsonStringifyWithCircularReferences(conf))
		.digest('hex');
	const finalConf: RspackConfiguration = {
		...conf,
		cache: (enableCaching
			? {
					type: 'filesystem',
					name: getWebpackCacheName(environment, hash),
					version: hash,
				}
			: false) as unknown as RspackConfiguration['cache'],
		output: {
			...conf.output,
			...(outDir ? {path: outDir} : {}),
		},
		context: remotionRoot,
	};
	return [hash, finalConf];
};

export const createRspackCompiler = (config: RspackConfiguration) => {
	return rspack(config);
};
