import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {Internals} from 'remotion';

type PropStatusMap = Record<
	string,
	Record<string, CanUpdateSequencePropStatus> | null
>;

type SequencePropStatusContextType = {
	propStatuses: PropStatusMap;
	setPropStatuses: (
		overrideId: string,
		statuses: Record<string, CanUpdateSequencePropStatus> | null,
	) => void;
};

export const SequencePropStatusContext =
	React.createContext<SequencePropStatusContextType>({
		propStatuses: {},
		setPropStatuses: () => {
			throw new Error('SequencePropStatusContext not initialized');
		},
	});

const extractCodeValues = (
	statuses: Record<string, CanUpdateSequencePropStatus>,
): Record<string, unknown> => {
	const codeVals: Record<string, unknown> = {};
	for (const [key, status] of Object.entries(statuses)) {
		if (status.canUpdate) {
			codeVals[key] = status.codeValue;
		}
	}

	return codeVals;
};

const CodeValueBridge: React.FC<{
	readonly propStatuses: PropStatusMap;
}> = ({propStatuses}) => {
	const {setCodeValues} = useContext(Internals.SequenceControlOverrideContext);

	useEffect(() => {
		for (const [overrideId, statuses] of Object.entries(propStatuses)) {
			if (statuses) {
				const extracted = extractCodeValues(statuses);
				console.log('CodeValueBridge', overrideId, extracted);
				setCodeValues(overrideId, extracted);
			}
		}
	}, [propStatuses, setCodeValues]);

	return null;
};

export const SequencePropStatusProvider: React.FC<{
	readonly children: React.ReactNode;
}> = ({children}) => {
	const [propStatuses, setPropStatusesState] = useState<PropStatusMap>({});

	const setPropStatuses = useCallback(
		(
			overrideId: string,
			statuses: Record<string, CanUpdateSequencePropStatus> | null,
		) => {
			setPropStatusesState((prev) => {
				if (prev[overrideId] === statuses) {
					return prev;
				}

				if (statuses === null) {
					if (!(overrideId in prev)) {
						return prev;
					}

					const next = {...prev};
					delete next[overrideId];
					return next;
				}

				return {...prev, [overrideId]: statuses};
			});
		},
		[],
	);

	const value = useMemo(
		() => ({propStatuses, setPropStatuses}),
		[propStatuses, setPropStatuses],
	);

	return (
		<SequencePropStatusContext.Provider value={value}>
			<CodeValueBridge propStatuses={propStatuses} />
			{children}
		</SequencePropStatusContext.Provider>
	);
};
