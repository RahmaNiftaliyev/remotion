import { Sandbox } from '@vercel/sandbox';
import { createDisposableSandbox } from '../helpers';
import { getCachedSnapshot } from './snapshots';

const TIMEOUT = 5 * 60 * 1000;

export async function getSandbox(): Promise<Sandbox & AsyncDisposable> {
  const cachedSnapshotId = await getCachedSnapshot();

  if (!cachedSnapshotId) {
    throw new Error(
      'No sandbox snapshot found. Run `bun run create-snapshot` first.',
    );
  }

  return await createDisposableSandbox({
    source: { type: 'snapshot', snapshotId: cachedSnapshotId },
    timeout: TIMEOUT,
  });
}
