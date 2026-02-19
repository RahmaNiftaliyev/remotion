import {build} from 'bun';
import {mkdirSync, writeFileSync} from 'fs';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
	throw new Error('This script must be run using NODE_ENV=production');
}

console.time('Generated.');

const scriptMap: Record<string, string> = {
	'render-video-script': 'src/scripts/render-video.ts',
	'render-still-script': 'src/scripts/render-still.ts',
	'ensure-browser-script': 'src/scripts/ensure-browser.ts',
	'upload-blob-script': 'src/scripts/upload-blob.ts',
};

const generatedDir = path.join('src', 'generated');
mkdirSync(generatedDir, {recursive: true});
for (const name of Object.keys(scriptMap)) {
	writeFileSync(
		path.join(generatedDir, `${name}.d.ts`),
		'export declare const script: string;\n',
	);
}

const output = await build({
	entrypoints: ['src/index.ts'],
	naming: '[name].mjs',
	target: 'node',
	external: [
		'remotion',
		'remotion/no-react',
		'remotion/version',
		'@vercel/sandbox',
		'@vercel/blob',
	],
	plugins: [
		{
			name: 'script-embed',
			setup(build) {
				build.onResolve(
					{
						filter:
							/(render-video-script|render-still-script|ensure-browser-script|upload-blob-script)$/,
					},
					(args) => {
						const name = args.path.match(
							/(render-video-script|render-still-script|ensure-browser-script|upload-blob-script)$/,
						)?.[1];
						return {
							path: name!,
							namespace: 'script-embed',
						};
					},
				);

				build.onLoad(
					{namespace: 'script-embed', filter: /.*/},
					async (args) => {
						const file = scriptMap[args.path];
						const content = await Bun.file(file).text();
						return {
							contents: `export const script = ${JSON.stringify(content)};`,
							loader: 'ts',
						};
					},
				);
			},
		},
	],
});

if (!output.success) {
	console.log(output.logs.join('\n'));
	process.exit(1);
}

for (const file of output.outputs) {
	const str = await file.text();
	const out = path.join('dist', 'esm', file.path);

	await Bun.write(out, str);
}

console.timeEnd('Generated.');
