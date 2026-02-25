import React, {useCallback, useMemo, useRef, useState} from 'react';
import type {TSequence} from './CompositionManager.js';

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
	});

export const SequenceManagerProvider: React.FC<{
	readonly children: React.ReactNode;
}> = ({children}) => {
	const [sequences, setSequences] = useState<TSequence[]>([]);
	const [hidden, setHidden] = useState<Record<string, boolean>>({});
	const [controlOverrides, setControlOverrides] = useState<
		Record<string, Record<string, unknown>>
	>({});
	const controlOverridesRef = useRef(controlOverrides);
	controlOverridesRef.current = controlOverrides;

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

	const overrideContext: SequenceControlOverrideState = useMemo(() => {
		return {
			overrides: controlOverrides,
			setOverride,
			clearOverrides,
		};
	}, [controlOverrides, setOverride, clearOverrides]);

	return (
		<SequenceManager.Provider value={sequenceContext}>
			<SequenceVisibilityToggleContext.Provider value={hiddenContext}>
				<SequenceControlOverrideContext.Provider value={overrideContext}>
					{children}
				</SequenceControlOverrideContext.Provider>
			</SequenceVisibilityToggleContext.Provider>
		</SequenceManager.Provider>
	);
};
