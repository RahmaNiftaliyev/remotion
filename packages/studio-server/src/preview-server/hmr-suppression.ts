const suppressedFiles = new Set<string>();

export function suppressHmrForFile(absolutePath: string) {
	suppressedFiles.add(absolutePath);
}

export function shouldSuppressHmr(filename: string | null): boolean {
	if (filename === null) {
		return false;
	}

	if (suppressedFiles.has(filename)) {
		suppressedFiles.delete(filename);
		return true;
	}

	return false;
}
