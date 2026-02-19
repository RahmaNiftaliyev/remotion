import type {Sandbox} from '@vercel/sandbox';
import {addBundleToSandbox as addBundleInternal} from './internals/add-bundle';

export async function addBundleToSandbox({
	sandbox,
	bundleDir,
}: {
	sandbox: Sandbox;
	bundleDir: string;
}): Promise<void> {
	await addBundleInternal({sandbox, bundleDir});
}
