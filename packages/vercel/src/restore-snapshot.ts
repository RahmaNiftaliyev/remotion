import {head} from '@vercel/blob';
import {SANDBOX_CREATING_TIMEOUT} from './create-sandbox';
import {createDisposableSandbox} from './internals/disposable';
import type {VercelSandbox} from './types';

type SnapshotCache = {
	snapshotId: string;
};

const getSnapshotBlobKey = () =>
	`snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`;

export async function restoreSnapshot(): Promise<VercelSandbox> {
	let snapshotId: string | null = null;

	try {
		const metadata = await head(getSnapshotBlobKey());
		const response = await fetch(metadata.url);
		const cache: SnapshotCache = await response.json();
		snapshotId = cache.snapshotId;
	} catch {
		// ignore
	}

	if (!snapshotId) {
		throw new Error(
			'No sandbox snapshot found. Run `bun run create-snapshot` as part of the build process.',
		);
	}

	return createDisposableSandbox({
		source: {type: 'snapshot', snapshotId},
		timeout: SANDBOX_CREATING_TIMEOUT,
	});
}
