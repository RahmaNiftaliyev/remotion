import type {CreateInputFromOptions} from 'mediabunny';
import {
	ALL_FORMATS,
	HLS_FORMATS,
	PathedSource,
	UrlSource,
	createInputFrom,
} from 'mediabunny';

const isHlsSource = (src: string): boolean => {
	try {
		const url = new URL(src, 'http://placeholder');
		return url.pathname.toLowerCase().endsWith('.m3u8');
	} catch {
		return src.toLowerCase().endsWith('.m3u8');
	}
};

export const createInput = ({
	src,
	credentials,
	urlSourceOptions,
}: {
	src: string;
	credentials: RequestCredentials | undefined;
	urlSourceOptions?: Partial<CreateInputFromOptions>;
}) => {
	const options: CreateInputFromOptions = {
		...urlSourceOptions,
		...(credentials ? {requestInit: {credentials}} : undefined),
	};

	if (isHlsSource(src)) {
		const source = new PathedSource(
			src,
			({path}) => new UrlSource(path, options),
		);
		return createInputFrom(source, HLS_FORMATS);
	}

	return createInputFrom(src, ALL_FORMATS, options);
};
