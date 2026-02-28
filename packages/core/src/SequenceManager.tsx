import React, {useCallback, useMemo, useRef, useState} from 'react';
import type {TSequence} from './CompositionManager.js';
import type {ResolvedStackLocation} from './sequence-stack-traces.js';
import {
	SequenceStackTracesContext,
	SequenceStackTracesUpdateContext,
} from './sequence-stack-traces.js';

export type SequenceManagerContext = {
	registerSequence: (seq: TSequence) => void;
	unregisterSequence: (id: string) => void;
	sequences: TSequence[];
};

export const SequenceManager = React.createContext<SequenceManagerContext>({
	registerSequence: () => {
		throw new Error('SequenceManagerContext not initialized');
	},
	unregisterSequence: () => {
		throw new Error('SequenceManagerContext not initialized');
	},
	sequences: [],
});

export type SequenceVisibilityToggleState = {
	hidden: Record<string, boolean>;
	setHidden: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

export const SequenceVisibilityToggleContext =
	React.createContext<SequenceVisibilityToggleState>({
		hidden: {},
		setHidden: () => {
			throw new Error('SequenceVisibilityToggle not initialized');
		},
	});

export type SequenceControlOverrideState = {
	overrides: Record<string, Record<string, unknown>>;
	setOverride: (sequenceId: string, key: string, value: unknown) => void;
	clearOverrides: (sequenceId: string) => void;
	propStatuses: Record<string, Record<string, unknown> | null>;
	setPropStatuses: (
		sequenceId: string,
		values: Record<string, unknown> | null,
	) => void;
	codeValues: Record<string, Record<string, unknown>>;
};

export const SequenceControlOverrideContext =
	React.createContext<SequenceControlOverrideState>({
		overrides: {},
		setOverride: () => {
			throw new Error('SequenceControlOverrideContext not initialized');
		},
		clearOverrides: () => {
			throw new Error('SequenceControlOverrideContext not initialized');
		},
		propStatuses: {},
		setPropStatuses: () => {
			throw new Error('SequenceControlOverrideContext not initialized');
		},
		codeValues: {},
	});

export const SequenceManagerProvider: React.FC<{
	readonly children: React.ReactNode;
}> = ({children}) => {
	const [sequences, setSequences] = useState<TSequence[]>([]);
	const [hidden, setHidden] = useState<Record<string, boolean>>({});
	const [resolvedStacks, setResolvedStacks] = useState<
		Record<string, ResolvedStackLocation | null>
	>({});
	const [controlOverrides, setControlOverrides] = useState<
		Record<string, Record<string, unknown>>
	>({});
	const controlOverridesRef = useRef(controlOverrides);
	controlOverridesRef.current = controlOverrides;
	const [propStatusMap, setPropStatusMapState] = useState<
		Record<string, Record<string, unknown> | null>
	>({});

	const setOverride = useCallback(
		(sequenceId: string, key: string, value: unknown) => {
			setControlOverrides((prev) => ({
				...prev,
				[sequenceId]: {
					...prev[sequenceId],
					[key]: value,
				},
			}));
		},
		[],
	);

	const clearOverrides = useCallback((sequenceId: string) => {
		setControlOverrides((prev) => {
			if (!prev[sequenceId]) {
				return prev;
			}

			const next = {...prev};
			delete next[sequenceId];
			return next;
		});
	}, []);

	const setPropStatuses = useCallback(
		(sequenceId: string, values: Record<string, unknown> | null) => {
			setPropStatusMapState((prev) => {
				if (prev[sequenceId] === values) {
					return prev;
				}

				if (values === null) {
					if (!(sequenceId in prev)) {
						return prev;
					}

					const next = {...prev};
					delete next[sequenceId];
					return next;
				}

				return {...prev, [sequenceId]: values};
			});
		},
		[],
	);

	const codeValues = useMemo(() => {
		const result: Record<string, Record<string, unknown>> = {};
		for (const [id, statuses] of Object.entries(propStatusMap)) {
			if (!statuses) continue;
			const vals: Record<string, unknown> = {};
			for (const [key, status] of Object.entries(statuses)) {
				if (
					status &&
					typeof status === 'object' &&
					'canUpdate' in status &&
					(status as {canUpdate: boolean}).canUpdate &&
					'codeValue' in status
				) {
					vals[key] = (status as {codeValue: unknown}).codeValue;
				}
			}

			result[id] = vals;
		}

		return result;
	}, [propStatusMap]);

	const registerSequence = useCallback((seq: TSequence) => {
		setSequences((seqs) => {
			return [...seqs, seq];
		});
	}, []);

	const unregisterSequence = useCallback((seq: string) => {
		setSequences((seqs) => seqs.filter((s) => s.id !== seq));
	}, []);

	const sequenceContext: SequenceManagerContext = useMemo(() => {
		return {
			registerSequence,
			sequences,
			unregisterSequence,
		};
	}, [registerSequence, sequences, unregisterSequence]);

	const hiddenContext: SequenceVisibilityToggleState = useMemo(() => {
		return {
			hidden,
			setHidden,
		};
	}, [hidden]);

	const updateResolvedStackTrace = useCallback(
		(stack: string, location: ResolvedStackLocation | null) => {
			setResolvedStacks((prev) => {
				if (stack in prev) {
					return prev;
				}

				return {...prev, [stack]: location};
			});
		},
		[],
	);

	const stackTracesContext = useMemo(() => {
		return {
			resolvedStacks,
		};
	}, [resolvedStacks]);

	const overrideContext: SequenceControlOverrideState = useMemo(() => {
		return {
			overrides: controlOverrides,
			setOverride,
			clearOverrides,
			propStatuses: propStatusMap,
			setPropStatuses,
			codeValues,
		};
	}, [
		controlOverrides,
		setOverride,
		clearOverrides,
		propStatusMap,
		setPropStatuses,
		codeValues,
	]);

	return (
		<SequenceManager.Provider value={sequenceContext}>
			<SequenceVisibilityToggleContext.Provider value={hiddenContext}>
				<SequenceStackTracesContext.Provider value={stackTracesContext}>
					<SequenceStackTracesUpdateContext.Provider
						value={updateResolvedStackTrace}
					>
						<SequenceControlOverrideContext.Provider value={overrideContext}>
							{children}
						</SequenceControlOverrideContext.Provider>
					</SequenceStackTracesUpdateContext.Provider>
				</SequenceStackTracesContext.Provider>
			</SequenceVisibilityToggleContext.Provider>
		</SequenceManager.Provider>
	);
};
