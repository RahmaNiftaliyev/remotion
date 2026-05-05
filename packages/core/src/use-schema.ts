import {useMemo} from 'react';
import type {SequenceControls} from './CompositionManager.js';
import {getEffectiveVisualModeValue} from './get-effective-visual-mode-value.js';
import type {RemotionEnvironment} from './internals.js';
import type {
	SequenceFieldSchema,
	SequenceSchema,
} from './sequence-field-schema.js';

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

export const computeEffectiveSchemaValuesDotNotation = ({
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

export const useSchema = <T extends Record<string, unknown>>({
	schema,
	currentRuntimeValueDotNotation,
	overrideId,
	visualModeEnabled,
	dragOverrides,
	codeValues,
}: {
	schema: SequenceSchema | null;
	currentRuntimeValueDotNotation: T | null;
	overrideId: string;
	visualModeEnabled: boolean;
	dragOverrides: Record<string, Record<string, unknown>>;
	codeValues: Record<string, Record<string, CanUpdateSequencePropStatus>>;
}): {
	controls: SequenceControls | undefined;
	valuesDotNotation: T;
} => {
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

		const valuesDotNotation = computeEffectiveSchemaValuesDotNotation({
			schema,
			currentValue: currentRuntimeValueDotNotation,
			overrideValues: dragOverrides[overrideId] ?? {},
			propStatus: codeValues[overrideId],
		});

		return {
			controls,
			valuesDotNotation: valuesDotNotation as T,
		};
	}, [
		controls,
		currentRuntimeValueDotNotation,
		overrideId,
		dragOverrides,
		codeValues,
		schema,
	]);
};
