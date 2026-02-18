import {put} from '@vercel/blob';

type SnapshotCache = {
	snapshotId: string;
};

const getSnapshotBlobKey = () =>
	`snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`;

export async function saveSnapshot({
	snapshotId,
}: {
	snapshotId: string;
}): Promise<void> {
	const cache: SnapshotCache = {
		snapshotId,
	};

	await put(getSnapshotBlobKey(), JSON.stringify(cache), {
		access: 'public',
		contentType: 'application/json',
		addRandomSuffix: false,
	});
}
