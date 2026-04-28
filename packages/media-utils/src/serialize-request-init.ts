const normalizeHeaders = (headers: HeadersInit | undefined) => {
	if (!headers) {
		return null;
	}

	if (typeof Headers !== 'undefined' && headers instanceof Headers) {
		return Array.from(headers.entries()).sort(([a], [b]) => a.localeCompare(b));
	}

	if (Array.isArray(headers)) {
		return [...headers].sort(([a], [b]) => a.localeCompare(b));
	}

	return Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
};

export const serializeRequestInit = (
	requestInit: RequestInit | undefined,
): string | null => {
	if (!requestInit) {
		return null;
	}

	const {headers, signal, ...rest} = requestInit;

	return JSON.stringify({
		...rest,
		headers: normalizeHeaders(headers),
		signal: signal ? signal.aborted : null,
	});
};
