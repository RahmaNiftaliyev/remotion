import {addBundleToSandbox as addBundleInternal} from './internals/add-bundle';
import type {VercelSandbox} from './types';

export async function addBundleToSandbox({
	sandbox,
	bundleDir,
}: {
	sandbox: VercelSandbox;
	bundleDir: string;
}): Promise<void> {
	await addBundleInternal({sandbox, bundleDir});
}
