import type {
	CanUpdateSequencePropStatus,
	EventSourceEvent,
} from '@remotion/studio-shared';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Internals} from 'remotion';
import type {TSequence} from 'remotion';
import type {OriginalPosition} from '../../error-overlay/react-overlay/utils/get-source-map';
import {StudioServerConnectionCtx} from '../../helpers/client-id';
import {getSchemaFields} from '../../helpers/timeline-layout';
import {callApi} from '../call-api';

export const useSequencePropsSubscription = (
	sequence: TSequence,
	originalLocation: OriginalPosition | null,
): Record<string, CanUpdateSequencePropStatus> | null => {
	const [propStatuses, setPropStatuses] = useState<Record<
		string,
		CanUpdateSequencePropStatus
	> | null>(null);

	const {previewServerState: state, subscribeToEvent} = useContext(
		StudioServerConnectionCtx,
	);
	const clientId = state.type === 'connected' ? state.clientId : undefined;

	const schemaFields = useMemo(
		() => getSchemaFields(sequence.controls),
		[sequence.controls],
	);

	const schemaKeysString = useMemo(
		() => (schemaFields ? schemaFields.map((f) => f.key).join(',') : null),
		[schemaFields],
	);

	const validatedLocation = useMemo(() => {
		if (
			!originalLocation ||
			!originalLocation.source ||
			!originalLocation.line
		) {
			return null;
		}

		return {
			source: originalLocation.source,
			line: originalLocation.line,
			column: originalLocation.column ?? 0,
		};
	}, [originalLocation]);

	const locationSource = validatedLocation?.source ?? null;
	const locationLine = validatedLocation?.line ?? null;
	const locationColumn = validatedLocation?.column ?? null;

	const currentLocationSource = useRef(locationSource);
	currentLocationSource.current = locationSource;
	const currentLocationLine = useRef(locationLine);
	currentLocationLine.current = locationLine;
	const currentLocationColumn = useRef(locationColumn);
	currentLocationColumn.current = locationColumn;

	useEffect(() => {
		if (
			!clientId ||
			!locationSource ||
			!locationLine ||
			locationColumn === null ||
			!schemaKeysString
		) {
			setPropStatuses(null);
			return;
		}

		const keys = schemaKeysString.split(',');

		callApi('/api/subscribe-to-sequence-props', {
			fileName: locationSource,
			line: locationLine,
			column: locationColumn,
			keys,
			clientId,
		})
			.then((result) => {
				if (
					currentLocationSource.current !== locationSource ||
					currentLocationLine.current !== locationLine ||
					currentLocationColumn.current !== locationColumn
				) {
					return;
				}

				if (result.canUpdate) {
					setPropStatuses(result.props);
				} else {
					setPropStatuses(null);
				}
			})
			.catch(() => {
				setPropStatuses(null);
			});

		return () => {
			callApi('/api/unsubscribe-from-sequence-props', {
				fileName: locationSource,
				line: locationLine,
				column: locationColumn,
				clientId,
			}).catch(() => {
				// Ignore unsubscribe errors
			});
		};
	}, [
		clientId,
		locationSource,
		locationLine,
		locationColumn,
		schemaKeysString,
	]);

	useEffect(() => {
		if (!locationSource || !locationLine || locationColumn === null) {
			return;
		}

		const listener = (event: EventSourceEvent) => {
			if (event.type !== 'sequence-props-updated') {
				return;
			}

			if (
				event.fileName !== currentLocationSource.current ||
				event.line !== currentLocationLine.current ||
				event.column !== currentLocationColumn.current
			) {
				return;
			}

			if (event.result.canUpdate) {
				setPropStatuses(event.result.props);
			} else {
				setPropStatuses(null);
			}
		};

		const unsub = subscribeToEvent('sequence-props-updated', listener);
		return () => {
			unsub();
		};
	}, [locationSource, locationLine, locationColumn, subscribeToEvent]);

	const {setCodeValues} = useContext(
		Internals.SequenceControlOverrideContext,
	);
	const overrideId = sequence.controls?.overrideId ?? null;

	useEffect(() => {
		if (!propStatuses || !overrideId) {
			return;
		}

		const codeVals: Record<string, unknown> = {};
		for (const [key, status] of Object.entries(propStatuses)) {
			if (status.canUpdate) {
				codeVals[key] = status.codeValue;
			}
		}

		setCodeValues(overrideId, codeVals);

		return () => {
			setCodeValues(overrideId, {});
		};
	}, [propStatuses, overrideId, setCodeValues]);

	return propStatuses;
};
