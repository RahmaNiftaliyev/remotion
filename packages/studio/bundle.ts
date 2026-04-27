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
// the worker to exist as a sibling at `dist/`. The cleaner alternative
// (aliasing `@remotion/studio` to ESM) breaks visual controls because the
// bundled ESM entries duplicate the visual-control singleton.
const esmWorker = 'dist/esm/audio-waveform-worker.mjs';
if (existsSync(esmWorker)) {
	copyFileSync(esmWorker, 'dist/audio-waveform-worker.mjs');
}
