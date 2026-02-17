import {
	RenderInternals,
	renderStill,
	selectComposition,
} from '@remotion/renderer';
import {BrowserSafeApis} from '@remotion/renderer/client';
import {$} from 'bun';
import {beforeAll, expect, test} from 'bun:test';
import {existsSync, readFileSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

if (process.platform === 'win32') {
	process.exit(0);
}

const exampleDir = path.join(__dirname, '..', '..');
const buildDir = path.join(exampleDir, 'build');

beforeAll(async () => {
	await $`bunx remotion browser ensure`.cwd(exampleDir);
});

const isPng = (filePath: string) => {
	const buf = readFileSync(filePath);
	return (
		buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
	);
};

const isJpeg = (filePath: string) => {
	const buf = readFileSync(filePath);
	return buf[0] === 0xff && buf[1] === 0xd8;
};

test(
	'--image-format=jpeg produces a JPEG still',
	async () => {
		const outFile = path.join(tmpdir(), 'remotion-test', 'still-fmt-jpeg.jpeg');

		await $`bunx remotion still ${buildDir} --image-format=jpeg react-svg ${outFile}`.cwd(
			exampleDir,
		);

		expect(existsSync(outFile)).toBe(true);
		expect(isJpeg(outFile)).toBe(true);
		unlinkSync(outFile);
	},
	{timeout: 90000},
);

test(
	'--image-format=png produces a PNG still',
	async () => {
		const outFile = path.join(tmpdir(), 'remotion-test', 'still-fmt-png.png');

		await $`bunx remotion still ${buildDir} --image-format=png react-svg ${outFile}`.cwd(
			exampleDir,
		);

		expect(existsSync(outFile)).toBe(true);
		expect(isPng(outFile)).toBe(true);
		unlinkSync(outFile);
	},
	{timeout: 90000},
);

test(
	'Config.setStillImageFormat works via the option',
	async () => {
		const {stillImageFormatOption} = BrowserSafeApis.options;

		stillImageFormatOption.setConfig('jpeg');

		const composition = await selectComposition({
			serveUrl: buildDir,
			id: 'react-svg',
			inputProps: {},
		});

		const folder = path.join(tmpdir(), 'remotion-test', 'still-fmt-config');
		const testOut = path.join(folder, 'still.jpeg');

		await renderStill({
			composition,
			output: testOut,
			serveUrl: buildDir,
			imageFormat:
				stillImageFormatOption.getValue({commandLine: {}}).value ?? undefined,
		});

		expect(existsSync(testOut)).toBe(true);
		expect(isJpeg(testOut)).toBe(true);
		unlinkSync(testOut);
		RenderInternals.deleteDirectory(folder);

		stillImageFormatOption.setConfig(null);
	},
	{timeout: 90000},
);

test(
	'CLI --image-format takes precedence over Config.setStillImageFormat',
	async () => {
		const {stillImageFormatOption} = BrowserSafeApis.options;

		stillImageFormatOption.setConfig('jpeg');

		const resolved = stillImageFormatOption.getValue({
			commandLine: {'image-format': 'png'},
		});

		expect(resolved.value).toBe('png');
		expect(resolved.source).toBe('cli');

		const configOnly = stillImageFormatOption.getValue({
			commandLine: {},
		});

		expect(configOnly.value).toBe('jpeg');
		expect(configOnly.source).toBe('config');

		stillImageFormatOption.setConfig(null);

		const defaultVal = stillImageFormatOption.getValue({
			commandLine: {},
		});

		expect(defaultVal.value).toBeNull();
		expect(defaultVal.source).toBe('default');
	},
	{timeout: 90000},
);
