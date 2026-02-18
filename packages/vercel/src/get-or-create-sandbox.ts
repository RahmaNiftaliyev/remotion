import {createSandbox, SANDBOX_CREATING_TIMEOUT} from './create-sandbox';
import {getSnapshot} from './get-snapshot';
import {createDisposableSandbox} from './internals/disposable';
import type {OnProgress, VercelSandbox} from './types';

export async function getOrCreateSandbox({
	bundleDir,
	onProgress,
}: {
	bundleDir: string;
	onProgress?: OnProgress;
}): Promise<VercelSandbox> {
	// During local development, a new sandbox is created from scratch always (no snapshotting)
	if (!process.env.VERCEL) {
		onProgress?.({progress: 0, message: 'Creating sandbox...'});
		return createSandbox({bundleDir, onProgress});
	}

	// In production, the snapshot is created at build time via `create-snapshot`
	const cachedSnapshotId = await getSnapshot();

	if (!cachedSnapshotId) {
		throw new Error(
			'No sandbox snapshot found. Run `bun run create-snapshot` as part of the build process.',
		);
	}

	return createDisposableSandbox({
		source: {type: 'snapshot', snapshotId: cachedSnapshotId},
		timeout: SANDBOX_CREATING_TIMEOUT,
	});
}
