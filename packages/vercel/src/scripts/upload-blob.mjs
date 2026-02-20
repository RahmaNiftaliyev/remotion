import {put} from '@vercel/blob';
import {readFileSync, statSync} from 'fs';

const config = JSON.parse(process.argv[2]);

try {
	const fileBuffer = readFileSync(config.sandboxFilePath);
	const size = statSync(config.sandboxFilePath).size;
	const blob = await put(config.blobPath, fileBuffer, {
		access: config.access,
		contentType: config.contentType,
		token: config.blobToken,
	});

	console.log(
		JSON.stringify({
			type: 'done',
			url: blob.downloadUrl,
			size,
		}),
	);
} catch (err) {
	console.error(err.message);
	process.exit(1);
}
