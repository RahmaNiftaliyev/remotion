import type {Sandbox} from '@vercel/sandbox';
import {getEnsureBrowserScript} from './ensure-browser-script';

export async function installBrowser({
	sandbox,
	onProgress,
}: {
	sandbox: Sandbox;
	onProgress: (progress: number) => Promise<void>;
}): Promise<void> {
	const ensureBrowserScript = getEnsureBrowserScript();
	await sandbox.writeFiles([
		{
			path: 'ensure-browser.ts',
			content: Buffer.from(ensureBrowserScript),
		},
	]);

	const ensureBrowserCmd = await sandbox.runCommand({
		cmd: 'node',
		args: ['--strip-types', 'ensure-browser.ts'],
		detached: true,
	});

	for await (const log of ensureBrowserCmd.logs()) {
		if (log.stream === 'stdout') {
			try {
				const message = JSON.parse(log.data);
				if (message.type === 'browser-progress') {
					await onProgress(message.percent ?? 0);
					continue;
				}
			} catch {
				// Not JSON, ignore
			}
		}
	}

	const ensureBrowserResult = await ensureBrowserCmd.wait();
	if (ensureBrowserResult.exitCode !== 0) {
		throw new Error(
			`ensure-browser failed: ${await ensureBrowserResult.stderr()} ${await ensureBrowserResult.stdout()}`,
		);
	}
}
