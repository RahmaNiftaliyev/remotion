import type {ComponentType} from 'react';
import type {AnyZodObject, CalculateMetadataFunction} from 'remotion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferZodInput<T> = T extends {_zod: {input: any}}
	? T['_zod']['input']
	: // eslint-disable-next-line @typescript-eslint/no-explicit-any
		T extends {_input: any}
		? T['_input']
		: Record<string, unknown>;

export type InferProps<
	Schema extends AnyZodObject,
	Props extends Record<string, unknown>,
> = AnyZodObject extends Schema
	? {} extends Props
		? // Neither props nor schema specified
			Record<string, unknown>
		: // Only props specified
			Props
	: {} extends Props
		? // Only schema specified
			InferZodInput<Schema>
		: // Props and schema specified
			InferZodInput<Schema> & Props;

export type DefaultPropsIfHasProps<
	Schema extends AnyZodObject,
	Props,
> = AnyZodObject extends Schema
	? {} extends Props
		? {
				// Neither props nor schema specified
				defaultProps?: InferZodInput<Schema> & Props;
			}
		: {
				// Only props specified
				defaultProps: Props;
			}
	: {} extends Props
		? {
				// Only schema specified
				defaultProps: InferZodInput<Schema>;
			}
		: {
				// Props and schema specified
				defaultProps: InferZodInput<Schema> & Props;
			};

type LooseComponentType<T> = ComponentType<T> | ((props: T) => React.ReactNode);

type OptionalDimensions<
	Schema extends AnyZodObject,
	Props extends Record<string, unknown>,
> = {
	component: LooseComponentType<Props>;
	id: string;
	width?: number;
	height?: number;
	calculateMetadata: CalculateMetadataFunction<InferProps<Schema, Props>>;
};

type MandatoryDimensions<
	Schema extends AnyZodObject,
	Props extends Record<string, unknown>,
> = {
	component: LooseComponentType<Props>;
	id: string;
	width: number;
	height: number;
	calculateMetadata?: CalculateMetadataFunction<
		InferProps<Schema, Props>
	> | null;
};

export type CompositionCalculateMetadataOrExplicit<
	Schema extends AnyZodObject,
	Props extends Record<string, unknown>,
> = (
	| (OptionalDimensions<Schema, Props> & {
			fps?: number;
			durationInFrames?: number;
	  })
	| (MandatoryDimensions<Schema, Props> & {
			fps: number;
			durationInFrames: number;
	  })
) &
	DefaultPropsIfHasProps<Schema, Props>;
