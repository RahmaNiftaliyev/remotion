import type {AnyZodObject} from 'remotion';

export type PropsIfHasProps<
	Schema extends AnyZodObject,
	Props,
> = AnyZodObject extends Schema
	? {} extends Props
		? {
				// Neither props nor schema specified
				inputProps?: Record<string, unknown> & Props;
			}
		: {
				// Only props specified
				inputProps: Props;
			}
	: {} extends Props
		? {
				// Only schema specified
				inputProps: Record<string, unknown>;
			}
		: {
				// Props and schema specified
				inputProps: Record<string, unknown> & Props;
			};
