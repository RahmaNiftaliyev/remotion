import type {Sandbox} from '@vercel/sandbox';

function getExtension(filePath: string): string {
	const lastDot = filePath.lastIndexOf('.');
	if (lastDot === -1) {
		return '';
	}

	return filePath.slice(lastDot);
}

function getUploadScript({
	sandboxFilePath,
	blobPath,
	contentType,
	blobToken,
}: {
	sandboxFilePath: string;
	blobPath: string;
	contentType: string;
	blobToken: string;
}): string {
	return `\
import { put } from "@vercel/blob";
import { readFileSync, statSync } from "fs";

try {
  const fileBuffer = readFileSync(${JSON.stringify(sandboxFilePath)});
  const size = statSync(${JSON.stringify(sandboxFilePath)}).size;
  const blob = await put(${JSON.stringify(blobPath)}, fileBuffer, {
    access: "public",
    contentType: ${JSON.stringify(contentType)},
    token: ${JSON.stringify(blobToken)},
  });

  console.log(JSON.stringify({
    type: "done",
    url: blob.downloadUrl,
    size,
  }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
`;
}

export async function uploadToVercelBlob({
	sandbox,
	sandboxFilePath,
	blobPath,
	contentType,
	blobToken,
}: {
	sandbox: Sandbox;
	sandboxFilePath: string;
	blobPath?: string;
	contentType: string;
	blobToken: string;
}): Promise<{url: string; size: number}> {
	const actualBlobPath =
		blobPath ??
		`renders/${crypto.randomUUID()}${getExtension(sandboxFilePath)}`;

	const uploadScript = getUploadScript({
		sandboxFilePath,
		blobPath: actualBlobPath,
		contentType,
		blobToken,
	});

	await sandbox.writeFiles([
		{
			path: 'upload.ts',
			content: Buffer.from(uploadScript),
		},
	]);

	const uploadCmd = await sandbox.runCommand({
		cmd: 'node',
		args: ['--strip-types', 'upload.ts'],
		detached: true,
	});

	let result: {url: string; size: number} | null = null;

	for await (const log of uploadCmd.logs()) {
		if (log.stream === 'stdout') {
			try {
				const message = JSON.parse(log.data);
				if (message.type === 'done') {
					result = {url: message.url, size: message.size};
				}
			} catch {
				// Not JSON, ignore
			}
		}
	}

	const uploadResult = await uploadCmd.wait();
	if (uploadResult.exitCode !== 0) {
		const stderr = await uploadResult.stderr();
		const stdout = await uploadResult.stdout();
		throw new Error(`Upload failed: ${stderr} ${stdout}`);
	}

	if (!result) {
		throw new Error('Upload script did not return result');
	}

	return result;
}
