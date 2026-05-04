const cjkSubsets = new Set([
	'chinese-hongkong',
	'chinese-simplified',
	'chinese-traditional',
	'japanese',
	'korean',
]);

const isChunkSubset = (subset: string) => /^\[\d+\]$/.test(subset);

const compareChunkSubsets = (a: string, b: string) => {
	return Number(a.slice(1, -1)) - Number(b.slice(1, -1));
};

export const resolveFontSubsetKeys = ({
	availableSubsetKeys,
	metaSubsets,
	requestedSubset,
}: {
	availableSubsetKeys: string[];
	metaSubsets: string[] | undefined;
	requestedSubset: string;
}) => {
	if (availableSubsetKeys.includes(requestedSubset)) {
		return [requestedSubset];
	}

	if (!cjkSubsets.has(requestedSubset)) {
		return [requestedSubset];
	}

	if (!metaSubsets?.includes(requestedSubset)) {
		return [requestedSubset];
	}

	const chunkSubsets = availableSubsetKeys
		.filter(isChunkSubset)
		.sort(compareChunkSubsets);

	return chunkSubsets.length === 0 ? [requestedSubset] : chunkSubsets;
};
