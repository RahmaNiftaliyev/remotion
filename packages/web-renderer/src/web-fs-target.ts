let sessionId: string | null = null;

const getPrefix = () => {
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}

	return `__remotion_render:${sessionId}:`;
};

export const cleanupStaleOpfsFiles = async (): Promise<void> => {
	try {
		const root = await navigator.storage.getDirectory();
		for await (const [name] of root.entries()) {
			if (
				name.startsWith('__remotion_render:') &&
				!name.startsWith(getPrefix())
			) {
				await root.removeEntry(name);
			}
		}
	} catch {
		// Ignore, could already be closed
	}
};

export const createWebFsTarget = async () => {
	const directoryHandle = await navigator.storage.getDirectory();
	const filename = `${getPrefix()}${crypto.randomUUID()}`;

	const fileHandle = await directoryHandle.getFileHandle(filename, {
		create: true,
	});
	// FileSystemWritableFileStream is directly compatible with StreamTarget —
	// StreamTargetChunk matches the FileSystemWriteChunkType shape by design.
	// mediabunny's output.finalize() will close this stream automatically.
	const writable = await fileHandle.createWritable();

	const getBlob = async () => {
		const handle = await directoryHandle.getFileHandle(filename);
		return handle.getFile();
	};

	return {writable, getBlob};
};
