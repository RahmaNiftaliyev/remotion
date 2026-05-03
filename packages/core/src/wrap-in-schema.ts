import React, {forwardRef, useContext, useState} from 'react';
import type {SequenceControls} from './CompositionManager.js';
import type {
	SchemaKeysRecord,
	SequenceSchema,
} from './sequence-field-schema.js';
import {VisualModeOverridesContext} from './SequenceManager.js';
import {useRemotionEnvironment} from './use-remotion-environment.js';
import {useSchema} from './use-schema.js';

const getNestedValue = (obj: Record<string, unknown>, key: string): unknown => {
	const parts = key.split('.');
	let current: unknown = obj;
	for (const part of parts) {
		if (
			current === null ||
			current === undefined ||
			typeof current !== 'object'
		)
			return undefined;
		current = (current as Record<string, unknown>)[part];
	}

	return current;
};

type ResolveValue = (key: string) => unknown;

const flattenActiveSchema = (
	schema: SequenceSchema,
	resolve: ResolveValue,
): SequenceSchema => {
	const out: SequenceSchema = {};
	for (const key of Object.keys(schema)) {
		const field = schema[key];
		if (field.type === 'enum') {
			out[key] = field;
			const current = (resolve(key) as string | undefined) ?? field.default;
			const variant = field.variants[current];
			if (variant) {
				Object.assign(out, flattenActiveSchema(variant, resolve));
			}
		} else {
			out[key] = field;
		}
	}

	return out;
};

const mergeValues = (
	props: Record<string, unknown>,
	values: Record<string, unknown>,
	schemaKeys: string[],
): Record<string, unknown> => {
	const merged = {...props};

	for (const key of schemaKeys) {
		const value = values[key];
		const parts = key.split('.');

		if (parts.length === 1) {
			merged[key] = value;
			continue;
		}

		// For dot-notation keys like 'style.opacity',
		// clone and set the nested path
		let current = merged;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (typeof current[part] === 'object' && current[part] !== null) {
				current[part] = {...(current[part] as Record<string, unknown>)};
			} else {
				current[part] = {};
			}

			current = current[part] as Record<string, unknown>;
		}

		current[parts[parts.length - 1]] = value;
	}

	return merged;
};

export const wrapInSchema = <S extends SequenceSchema, Props extends object>(
	Component: React.ComponentType<
		Props & {readonly _experimentalControls: SequenceControls | undefined}
	>,
	schema: S,
): React.ComponentType<Props> => {
	if (
		typeof process === 'undefined' ||
		!process.env?.EXPERIMENTAL_VISUAL_MODE_ENABLED
	) {
		return Component as unknown as React.ComponentType<Props>;
	}

	const Wrapped = forwardRef<unknown, Props>((props, ref) => {
		const env = useRemotionEnvironment();
		if (!env.isStudio || env.isReadOnlyStudio || env.isRendering) {
			return React.createElement(Component, {
				...props,
				_experimentalControls: null,
				ref,
			} as Props & {
				_experimentalControls: SequenceControls | undefined;
				ref: typeof ref;
			});
		}

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [overrideId] = useState(() => String(Math.random()));
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const {dragOverrides, codeValues} = useContext(VisualModeOverridesContext);
		const dragForThis = dragOverrides[overrideId] ?? {};
		const codeForThis = codeValues[overrideId];

		const propsRecord = props as Record<string, unknown>;
		const resolveDiscriminator: ResolveValue = (key) => {
			if (key in dragForThis) {
				return dragForThis[key];
			}

			const status = codeForThis?.[key];
			if (status && status.canUpdate) {
				return status.codeValue;
			}

			return getNestedValue(propsRecord, key);
		};

		const activeSchema = flattenActiveSchema(schema, resolveDiscriminator);
		const activeKeys = Object.keys(activeSchema);

		const schemaInput = {} as Record<string, unknown>;
		for (const key of activeKeys) {
			schemaInput[key] = getNestedValue(propsRecord, key);
		}

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const {controls, values} = useSchema(
			activeSchema as S,
			schemaInput as SchemaKeysRecord<S> &
				Record<Exclude<keyof SchemaKeysRecord<S>, keyof S>, never>,
			overrideId,
		);

		const mergedProps = mergeValues(
			propsRecord,
			values as Record<string, unknown>,
			activeKeys,
		);

		// If the parent has passed `_experimentalControls`, we should not override it.
		// @ts-expect-error
		if (props._experimentalControls) {
			return React.createElement(Component, {
				...props,
				ref,
			} as unknown as Props & {
				_experimentalControls: SequenceControls | undefined;
				ref: typeof ref;
			});
		}

		return React.createElement(Component, {
			...mergedProps,
			_experimentalControls: controls,
			ref,
		} as Props & {
			_experimentalControls: SequenceControls | undefined;
			ref: typeof ref;
		});
	});

	Wrapped.displayName = `wrapInSchema(${Component.displayName || Component.name || 'Component'})`;

	return Wrapped as unknown as React.ComponentType<Props>;
};
