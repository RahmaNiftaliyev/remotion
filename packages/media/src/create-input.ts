import type {UrlSourceOptions} from 'mediabunny';
import {
	ALL_FORMATS,
	HLS_FORMATS,
	Input,
	PathedSource,
	UrlSource,
} from 'mediabunny';

export const isHlsSource = (src: string): boolean => {
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
	urlSourceOptions?: Partial<UrlSourceOptions>;
}): Input => {
	const requestInit = credentials ? {credentials} : undefined;
	const sourceOptions: UrlSourceOptions | undefined =
		requestInit || urlSourceOptions
			? {
					...urlSourceOptions,
					...(requestInit ? {requestInit} : undefined),
				}
			: undefined;

	if (isHlsSource(src)) {
		return new Input({
			source: new PathedSource(src, ({path}) => {
				return new UrlSource(path, sourceOptions);
			}),
			formats: HLS_FORMATS,
		});
	}

	return new Input({
		source: new UrlSource(src, sourceOptions),
		formats: ALL_FORMATS,
	});
};
