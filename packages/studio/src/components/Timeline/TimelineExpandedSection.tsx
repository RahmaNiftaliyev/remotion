import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {TSequence} from 'remotion';
import {TIMELINE_TRACK_SEPARATOR} from '../../helpers/colors';
import {
	getExpandedTrackHeight,
	getSchemaFields,
} from '../../helpers/timeline-layout';
import {callApi} from '../call-api';
import {TimelineFieldValue} from './TimelineSchemaField';
import {getOriginalLocationFromStack} from './TimelineStack/get-stack';

const expandedSectionBase: React.CSSProperties = {
	color: 'white',
	fontFamily: 'Arial, Helvetica, sans-serif',
	fontSize: 12,
	display: 'flex',
	flexDirection: 'column',
	paddingLeft: 28,
	paddingRight: 10,
	borderBottom: `1px solid ${TIMELINE_TRACK_SEPARATOR}`,
};

const fieldRow: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 8,
};

const fieldName: React.CSSProperties = {
	flex: 1,
	fontSize: 12,
};

type OriginalLocation = {
	source: string;
	line: number;
	column: number;
};

export const TimelineExpandedSection: React.FC<{
	readonly sequence: TSequence;
}> = ({sequence}) => {
	const [canUpdate, setCanUpdate] = useState<boolean | null>(null);
	const [originalLocation, setOriginalLocation] =
		useState<OriginalLocation | null>(null);

	useEffect(() => {
		if (!sequence.stack || !sequence.controls) {
			setCanUpdate(false);
			return;
		}

		getOriginalLocationFromStack(sequence.stack, 'sequence')
			.then((location) => {
				if (!location || !location.source || !location.line) {
					setCanUpdate(false);
					return undefined;
				}

				setOriginalLocation({
					source: location.source,
					line: location.line,
					column: location.column ?? 0,
				});

				return callApi('/api/can-update-sequence-props', {
					fileName: location.source,
					line: location.line,
					column: location.column ?? 0,
				});
			})
			.then((result) => {
				if (result) {
					setCanUpdate(result.canUpdate);
				}
			})
			.catch(() => {
				setCanUpdate(false);
			});
	}, [sequence.stack, sequence.controls]);

	const schemaFields = useMemo(
		() => getSchemaFields(sequence.controls),
		[sequence.controls],
	);

	const expandedHeight = useMemo(
		() => getExpandedTrackHeight(sequence.controls),
		[sequence.controls],
	);

	const onSave = useCallback(
		(key: string, value: unknown) => {
			if (!canUpdate || !originalLocation) {
				return;
			}

			callApi('/api/save-sequence-props', {
				fileName: originalLocation.source,
				line: originalLocation.line,
				column: originalLocation.column,
				key,
				value: JSON.stringify(value),
				enumPaths: [],
			}).catch((err) => {
				// eslint-disable-next-line no-console
				console.error('Failed to save sequence prop:', err);
			});
		},
		[canUpdate, originalLocation],
	);

	return (
		<div style={{...expandedSectionBase, height: expandedHeight}}>
			{schemaFields
				? schemaFields.map((field) => (
						<div key={field.key} style={{...fieldRow, height: field.rowHeight}}>
							<span style={fieldName}>{field.key}</span>
							<TimelineFieldValue
								field={field}
								canUpdate={canUpdate}
								onSave={onSave}
							/>
						</div>
					))
				: 'No schema'}
		</div>
	);
};
