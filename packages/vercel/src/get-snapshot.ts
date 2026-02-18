import {head} from '@vercel/blob';

type SnapshotCache = {
	snapshotId: string;
};

const getSnapshotBlobKey = () =>
	`snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`;

export async function getSnapshot(): Promise<string | null> {
	if (!process.env.VERCEL) {
		return null;
	}

	try {
		const metadata = await head(getSnapshotBlobKey());
		const response = await fetch(metadata.url);
		const cache: SnapshotCache = await response.json();

		return cache.snapshotId;
	} catch {
		return null;
	}
}
