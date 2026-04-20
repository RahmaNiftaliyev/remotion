import type {CreateInputFromOptions} from 'mediabunny';
import {ALL_FORMATS, createInputFrom} from 'mediabunny';

export const createInput = ({
	src,
	credentials,
	urlSourceOptions,
}: {
	src: string;
	credentials: RequestCredentials | undefined;
	urlSourceOptions?: Partial<CreateInputFromOptions>;
}) => {
	return createInputFrom(src, ALL_FORMATS, {
		...urlSourceOptions,
		...(credentials ? {requestInit: {credentials}} : undefined),
	});
};
