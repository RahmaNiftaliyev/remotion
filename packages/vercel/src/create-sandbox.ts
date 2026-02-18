import {addBundleToSandbox} from './internals/add-bundle';
import {createDisposableSandbox} from './internals/disposable';
import {installBrowser} from './internals/install-browser';
import {installJsDependencies} from './internals/install-js-dependencies';
import {installSystemDependencies} from './internals/install-system-dependencies';
import {patchCompositor} from './internals/patch-compositor';
import {getRenderVideoScript} from './internals/render-video-script';
import type {CreateSandboxOnProgress, VercelSandbox} from './types';

export const SANDBOX_CREATING_TIMEOUT = 5 * 60 * 1000;

export async function createSandbox({
	bundleDir,
	onProgress,
}: {
	bundleDir: string;
	onProgress?: CreateSandboxOnProgress;
}): Promise<VercelSandbox> {
	const report = (progress: number, message: string) => {
		onProgress?.({progress, message});
	};

	const sandbox = await createDisposableSandbox({
		runtime: 'node24',
		resources: {vcpus: 4},
		timeout: SANDBOX_CREATING_TIMEOUT,
	});

	// Preparation has 3 stages with weights:
	// - System dependencies: 60%
	// - Copying bundle: 20%
	// - Downloading browser: 20%
	const WEIGHT_SYS_DEPS = 0.6;
	const WEIGHT_BUNDLE = 0.2;
	const WEIGHT_BROWSER = 0.2;

	report(0, 'Installing system dependencies...');

	// Stage 1: Install system dependencies (60%)
	await installSystemDependencies({
		sandbox,
		onProgress: (stageProgress: number) => {
			report(
				stageProgress * WEIGHT_SYS_DEPS,
				'Installing system dependencies...',
			);
			return Promise.resolve();
		},
	});

	report(WEIGHT_SYS_DEPS, 'Adding Remotion bundle to sandbox...');

	// Stage 2: Copy Remotion bundle (20%)
	await addBundleToSandbox({sandbox, bundleDir});

	report(WEIGHT_SYS_DEPS + WEIGHT_BUNDLE, 'Installing JS dependencies...');

	// Install renderer and blob SDK
	await installJsDependencies({sandbox});

	// Patch compositor binary for glibc 2.34 compatibility (Amazon Linux 2023)
	await patchCompositor({sandbox});

	// Stage 3: Download browser (20%)
	report(WEIGHT_SYS_DEPS + WEIGHT_BUNDLE, 'Downloading browser...');
	await installBrowser({
		sandbox,
		onProgress: (browserProgress: number) => {
			report(
				WEIGHT_SYS_DEPS + WEIGHT_BUNDLE + browserProgress * WEIGHT_BROWSER,
				'Downloading browser...',
			);
			return Promise.resolve();
		},
	});

	// Write a default render script and package.json (module type)
	const renderScript = getRenderVideoScript({
		codec: 'h264',
		outputFile: '/tmp/video.mp4',
	});
	await sandbox.writeFiles([
		{
			path: 'render.ts',
			content: Buffer.from(renderScript),
		},
		{
			path: 'package.json',
			content: Buffer.from(JSON.stringify({type: 'module'})),
		},
	]);

	report(1, 'Sandbox ready');

	return sandbox;
}
