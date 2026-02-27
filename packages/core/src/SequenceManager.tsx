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
	codeValues: Record<string, Record<string, unknown>>;
	setCodeValues: (sequenceId: string, values: Record<string, unknown>) => void;
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
		codeValues: {},
		setCodeValues: () => {
			throw new Error('SequenceControlOverrideContext not initialized');
		},
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
	const [codeValueOverrides, setCodeValueOverrides] = useState<
		Record<string, Record<string, unknown>>
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

	const setCodeValues = useCallback(
		(sequenceId: string, values: Record<string, unknown>) => {
			setCodeValueOverrides((prev) => ({
				...prev,
				[sequenceId]: values,
			}));
		},
		[],
	);

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
			codeValues: codeValueOverrides,
			setCodeValues,
		};
	}, [
		controlOverrides,
		setOverride,
		clearOverrides,
		codeValueOverrides,
		setCodeValues,
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
