import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useMemo, useState} from 'react';

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
			{children}
		</SequencePropStatusContext.Provider>
	);
};
