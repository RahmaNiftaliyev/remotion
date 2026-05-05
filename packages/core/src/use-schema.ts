/* eslint-disable react-hooks/rules-of-hooks */
import {useContext, useMemo} from 'react';
import type {SequenceControls} from './CompositionManager.js';
import {getEffectiveVisualModeValue} from './get-effective-visual-mode-value.js';
import type {
	SequenceFieldSchema,
	SequenceSchema,
} from './sequence-field-schema.js';
import {VisualModeOverridesContext} from './SequenceManager.js';
import {useRemotionEnvironment} from './use-remotion-environment.js';

export type CanUpdateSequencePropStatus =
	| {canUpdate: true; codeValue: unknown}
	| {canUpdate: false; reason: 'computed'};

const findFieldInSchema = (
	schema: SequenceSchema,
	key: string,
): SequenceFieldSchema | undefined => {
	if (key in schema) {
		return schema[key];
	}

	for (const field of Object.values(schema)) {
		if (field.type !== 'enum') {
			continue;
		}

		for (const variant of Object.values(field.variants)) {
			const found = findFieldInSchema(variant, key);
			if (found) {
				return found;
			}
		}
	}

	return undefined;
};

const computeMergedValues = ({
	schema,
	currentValue,
	overrideValues,
	propStatus,
}: {
	schema: SequenceSchema;
	currentValue: Record<string, unknown>;
	overrideValues: Record<string, unknown>;
	propStatus: Record<string, CanUpdateSequencePropStatus> | undefined;
}): Record<string, unknown> => {
	const merged: Record<string, unknown> = {};
	for (const key of Object.keys(currentValue)) {
		const codeValueStatus = propStatus?.[key] ?? null;
		merged[key] = getEffectiveVisualModeValue({
			codeValue: codeValueStatus,
			runtimeValue: currentValue[key],
			dragOverrideValue: overrideValues[key],
			defaultValue: findFieldInSchema(schema, key)?.default,
			shouldResortToDefaultValueIfUndefined: false,
		});
	}

	return merged;
};

export const useSchema = <T extends Record<string, unknown>>(
	schema: SequenceSchema | null,
	currentRuntimeValueDotNotation: T | null,
	overrideId: string,
): {
	controls: SequenceControls | undefined;
	valuesDotNotation: T;
} => {
	const env = useRemotionEnvironment();
	const earlyReturn = useMemo(() => {
		if (!env.isStudio || env.isReadOnlyStudio) {
			return {
				controls: undefined,
				valuesDotNotation: (currentRuntimeValueDotNotation ?? {}) as T,
			};
		}

		return undefined;
	}, [env.isStudio, env.isReadOnlyStudio, currentRuntimeValueDotNotation]);

	if (earlyReturn) {
		return earlyReturn;
	}

	const {
		visualModeEnabled,
		dragOverrides: overrides,
		codeValues,
	} = useContext(VisualModeOverridesContext);

	const controls = useMemo(() => {
		if (!visualModeEnabled) {
			return undefined;
		}

		if (schema === null || currentRuntimeValueDotNotation === null) {
			return undefined;
		}

		return {
			schema,
			currentRuntimeValueDotNotation,
			overrideId,
		};
	}, [schema, currentRuntimeValueDotNotation, overrideId, visualModeEnabled]);

	return useMemo(() => {
		if (
			controls === undefined ||
			currentRuntimeValueDotNotation === null ||
			schema === null
		) {
			return {
				controls: undefined,
				valuesDotNotation: (currentRuntimeValueDotNotation ?? {}) as T,
			};
		}

		const merged = computeMergedValues({
			schema,
			currentValue: currentRuntimeValueDotNotation,
			overrideValues: overrides[overrideId] ?? {},
			propStatus: codeValues[overrideId],
		});

		return {
			controls,
			valuesDotNotation: merged as T,
		};
	}, [
		controls,
		currentRuntimeValueDotNotation,
		overrideId,
		overrides,
		codeValues,
		schema,
	]);
};
