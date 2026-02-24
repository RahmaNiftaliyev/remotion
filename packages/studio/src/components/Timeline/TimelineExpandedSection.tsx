import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {TSequence} from 'remotion';
import type {OriginalPosition} from '../../error-overlay/react-overlay/utils/get-source-map';
import {TIMELINE_TRACK_SEPARATOR} from '../../helpers/colors';
import {
	getExpandedTrackHeight,
	getSchemaFields,
} from '../../helpers/timeline-layout';
import {callApi} from '../call-api';
import {TimelineFieldValue} from './TimelineSchemaField';

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

export const TimelineExpandedSection: React.FC<{
	readonly sequence: TSequence;
	readonly originalLocation: OriginalPosition | null;
}> = ({sequence, originalLocation}) => {
	const [canUpdate, setCanUpdate] = useState<boolean | null>(null);

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

	useEffect(() => {
		if (!sequence.controls || !validatedLocation) {
			setCanUpdate(false);
			return;
		}

		callApi('/api/can-update-sequence-props', {
			fileName: validatedLocation.source,
			line: validatedLocation.line,
			column: validatedLocation.column,
		})
			.then((result) => {
				setCanUpdate(result.canUpdate);
			})
			.catch(() => {
				setCanUpdate(false);
			});
	}, [sequence.controls, validatedLocation]);

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
			if (!canUpdate || !validatedLocation) {
				return;
			}

			callApi('/api/save-sequence-props', {
				fileName: validatedLocation.source,
				line: validatedLocation.line,
				column: validatedLocation.column,
				key,
				value: JSON.stringify(value),
				enumPaths: [],
			}).catch((err) => {
				// eslint-disable-next-line no-console
				console.error('Failed to save sequence prop:', err);
			});
		},
		[canUpdate, validatedLocation],
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
