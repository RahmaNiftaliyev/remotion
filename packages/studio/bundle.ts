import {copyFileSync, existsSync} from 'fs';
import {buildPackage} from '../.monorepo/builder';

const external = [
	'react',
	'remotion',
	'react-dom',
	'react',
	'@remotion/media-utils',
	'@remotion/studio-shared',
	'@remotion/zod-types',
	'@remotion/renderer',
	'@remotion/player',
	'@remotion/renderer/client',
	'@remotion/renderer/pure',
	'@remotion/web-renderer',
	'@remotion/renderer/error-handling',
	'source-map',
	'zod',
	'remotion/no-react',
	'react/jsx-runtime',
	'mediabunny',
];

await buildPackage({
	formats: {
		esm: 'build',
		cjs: 'use-tsc',
	},
	external,
	entrypoints: [
		{
			path: 'src/index.ts',
			target: 'browser',
		},
		{
			path: 'src/renderEntry.tsx',
			target: 'browser',
			splitting: true,
		},
		{
			path: 'src/internals.ts',
			target: 'browser',
		},
		{
			path: 'src/previewEntry.tsx',
			target: 'browser',
		},
		{
			path: 'src/audio-waveform-worker.ts',
			target: 'browser',
		},
	],
});

// Mirror the ESM worker asset next to the CJS helper. Webpack/rspack resolves
// `new Worker(new URL('./audio-waveform-worker.mjs', import.meta.url))` from
// the helper's location, so consumers loading `@remotion/studio` via CJS need
// the worker to exist as a sibling at `dist/`.
//
// We tried two cleaner alternatives, both of which failed:
//   1. Aliasing `@remotion/studio` to its ESM build in shared-bundler-config:
//      causes a dual-package hazard with the visualControlStore singleton
//      (user code and previewEntry get separate copies, breaking the
//      Controls panel — caught by visual-controls.test.mts).
//   2. Using a bare specifier `@remotion/studio/audio-waveform-worker` with
//      a `./audio-waveform-worker` exports entry: webpack/rspack does not
//      resolve bare specifiers via package `exports` inside
//      `new URL(..., import.meta.url)` for workers; only relative paths
//      are statically analysed.
const esmWorker = 'dist/esm/audio-waveform-worker.mjs';
if (existsSync(esmWorker)) {
	copyFileSync(esmWorker, 'dist/audio-waveform-worker.mjs');
}
