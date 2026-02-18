import {put} from '@vercel/blob';
import type {Sandbox} from '@vercel/sandbox';

type SnapshotCache = {
	snapshotId: string;
};

const getSnapshotBlobKey = () =>
	`snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`;

export async function saveSnapshot({
	sandbox,
	expiration = 0,
}: {
	sandbox: Sandbox;
	expiration?: number;
}): Promise<{snapshotId: string}> {
	const snapshot = await sandbox.snapshot({expiration});
	const {snapshotId} = snapshot;

	const cache: SnapshotCache = {
		snapshotId,
	};

	await put(getSnapshotBlobKey(), JSON.stringify(cache), {
		access: 'public',
		contentType: 'application/json',
		addRandomSuffix: false,
	});

	return {snapshotId};
}
