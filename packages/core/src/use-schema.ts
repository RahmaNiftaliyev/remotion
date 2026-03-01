/* eslint-disable react-hooks/rules-of-hooks */
import {useContext, useMemo, useState} from 'react';
import type {SequenceControls} from './CompositionManager.js';
import {getEffectiveVisualModeValue} from './get-effective-visual-mode-value.js';
import type {SequenceSchema} from './sequence-field-schema.js';
import {SequenceControlOverrideContext} from './SequenceManager.js';
import {useRemotionEnvironment} from './use-remotion-environment.js';

export type CanUpdateSequencePropStatus =
	| {canUpdate: true; codeValue: unknown}
	| {canUpdate: false; reason: 'computed'};

export const useSchema = <T extends Record<string, unknown>>(
	schema: SequenceSchema | null,
	currentValue: T | null,
): {
	controls: SequenceControls | undefined;
	values: T;
} => {
	const env = useRemotionEnvironment();
	const earlyReturn = useMemo(() => {
		if (!env.isStudio || env.isReadOnlyStudio) {
			return {
				controls: undefined,
				values: (currentValue ?? {}) as T,
			};
		}

		return undefined;
	}, [env.isStudio, env.isReadOnlyStudio, currentValue]);

	if (earlyReturn) {
		return earlyReturn;
	}

	// Intentional conditional hook call, useRemotionEnvironment is stable.
	const [overrideId] = useState(() => String(Math.random()));
	const {dragOverrides: overrides, propStatuses} = useContext(
		SequenceControlOverrideContext,
	);

	const controls = useMemo(() => {
		if (schema === null || currentValue === null) {
			return undefined;
		}

		return {
			schema,
			currentValue,
			overrideId,
		};
	}, [schema, currentValue, overrideId]);

	return useMemo(() => {
		if (controls === undefined || currentValue === null) {
			return {
				controls: undefined,
				values: (currentValue ?? {}) as T,
			};
		}

		const overrideValues = overrides[overrideId] ?? {};
		const propStatus = propStatuses[overrideId];

		const overrideKeys = Object.keys(overrideValues);
		const propStatusKeys = Object.keys(propStatus ?? {});
		const currentValueKeys = Object.keys(currentValue);

		const keysToUpdate = new Set([
			...overrideKeys,
			...propStatusKeys,
			...currentValueKeys,
		]).values();

		const merged = {} as Record<string, unknown>;

		// Apply code values over runtime values, falling back to schema default
		for (const key of keysToUpdate) {
			const codeValueStatus = propStatus?.[key] ?? null;

			merged[key] = getEffectiveVisualModeValue({
				codeValue: codeValueStatus,
				runtimeValue: currentValue[key],
				dragOverrideValue: overrideValues[key],
			});
		}

		return {
			controls,
			values: merged as T,
		};
	}, [controls, currentValue, overrideId, overrides, propStatuses]);
};
