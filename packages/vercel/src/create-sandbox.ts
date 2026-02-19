import {createDisposableSandbox} from './internals/disposable';
import {installBrowser} from './internals/install-browser';
import {installJsDependencies} from './internals/install-js-dependencies';
import {installSystemDependencies} from './internals/install-system-dependencies';
import {patchCompositor} from './internals/patch-compositor';
import type {CreateSandboxOnProgress, VercelSandbox} from './types';

export const SANDBOX_CREATING_TIMEOUT = 5 * 60 * 1000;

export async function createSandbox({
	onProgress,
}: {
	onProgress?: CreateSandboxOnProgress;
} = {}): Promise<VercelSandbox> {
	const report = (progress: number, message: string) => {
		onProgress?.({progress, message});
	};

	const sandbox = await createDisposableSandbox({
		runtime: 'node24',
		resources: {vcpus: 4},
		timeout: SANDBOX_CREATING_TIMEOUT,
	});

	// Preparation has 2 stages with weights:
	// - System dependencies: 75%
	// - Downloading browser: 25%
	const WEIGHT_SYS_DEPS = 0.75;
	const WEIGHT_BROWSER = 0.25;

	report(0, 'Installing system dependencies...');

	// Stage 1: Install system dependencies (75%)
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

	report(WEIGHT_SYS_DEPS, 'Installing JS dependencies...');

	// Install renderer and blob SDK
	await installJsDependencies({sandbox});

	// Patch compositor binary for glibc 2.34 compatibility (Amazon Linux 2023)
	await patchCompositor({sandbox});

	// Stage 2: Download browser (25%)
	report(WEIGHT_SYS_DEPS, 'Downloading browser...');
	await installBrowser({
		sandbox,
		onProgress: (browserProgress: number) => {
			report(
				WEIGHT_SYS_DEPS + browserProgress * WEIGHT_BROWSER,
				'Downloading browser...',
			);
			return Promise.resolve();
		},
	});

	// Write package.json (module type) so scripts can use ESM imports
	await sandbox.writeFiles([
		{
			path: 'package.json',
			content: Buffer.from(JSON.stringify({type: 'module'})),
		},
	]);

	report(1, 'Sandbox ready');

	return sandbox;
}
