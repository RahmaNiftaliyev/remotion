import type {VercelSandbox} from './types';

export async function createSnapshot({
	sandbox,
}: {
	sandbox: VercelSandbox;
}): Promise<{snapshotId: string}> {
	const snapshot = await sandbox.snapshot({expiration: 0});
	return {snapshotId: snapshot.snapshotId};
}
