/* eslint-disable react-hooks/rules-of-hooks */
import {useContext, useMemo, useState} from 'react';
import type {SequenceControls} from './CompositionManager.js';
import type {SequenceSchema} from './sequence-field-schema.js';
import {SequenceControlOverrideContext} from './SequenceManager.js';
import {useRemotionEnvironment} from './use-remotion-environment.js';

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
	const {overrides} = useContext(SequenceControlOverrideContext);

	return useMemo(() => {
		if (schema === null || currentValue === null) {
			return {
				controls: undefined,
				values: (currentValue ?? {}) as T,
			};
		}

		const overrideValues = overrides[overrideId] ?? {};
		const merged = {...currentValue} as Record<string, unknown>;
		for (const key of Object.keys(overrideValues)) {
			if (key in merged) {
				merged[key] = overrideValues[key];
			}
		}

		return {
			controls: {
				schema,
				currentValue,
				overrideId,
			},
			values: merged as T,
		};
	}, [schema, currentValue, overrides, overrideId]);
};
