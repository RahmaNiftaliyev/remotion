import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {TSequence} from 'remotion';
import type {OriginalPosition} from '../../error-overlay/react-overlay/utils/get-source-map';
import {TIMELINE_TRACK_SEPARATOR} from '../../helpers/colors';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';
import {
	getExpandedTrackHeight,
	getSchemaFields,
} from '../../helpers/timeline-layout';
import {callApi} from '../call-api';
import {
	TimelineFieldSavingSpinner,
	TimelineFieldValue,
} from './TimelineSchemaField';

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
	fontSize: 12,
};

const fieldLabelRow: React.CSSProperties = {
	flex: 1,
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	gap: 6,
};

const TimelineFieldRow: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly propStatus: CanUpdateSequencePropStatus | null;
	readonly onSave: (key: string, value: unknown) => Promise<void>;
}> = ({field, propStatus, onSave}) => {
	const [saving, setSaving] = useState(false);

	const onSavingChange = useCallback((s: boolean) => {
		setSaving(s);
	}, []);

	return (
		<div style={{...fieldRow, height: field.rowHeight}}>
			<div style={fieldLabelRow}>
				<span style={fieldName}>{field.key}</span>
				<TimelineFieldSavingSpinner saving={saving} />
			</div>
			<TimelineFieldValue
				field={field}
				propStatus={propStatus}
				onSave={onSave}
				onSavingChange={onSavingChange}
			/>
		</div>
	);
};

export const TimelineExpandedSection: React.FC<{
	readonly sequence: TSequence;
	readonly originalLocation: OriginalPosition | null;
}> = ({sequence, originalLocation}) => {
	const [propStatuses, setPropStatuses] = useState<Record<
		string,
		CanUpdateSequencePropStatus
	> | null>(null);

	const schemaFields = useMemo(
		() => getSchemaFields(sequence.controls),
		[sequence.controls],
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

	useEffect(() => {
		if (!sequence.controls || !validatedLocation || !schemaFields) {
			setPropStatuses(null);
			return;
		}

		callApi('/api/can-update-sequence-props', {
			fileName: validatedLocation.source,
			line: validatedLocation.line,
			column: validatedLocation.column,
			keys: schemaFields.map((f) => f.key),
		})
			.then((result) => {
				if (result.canUpdate) {
					setPropStatuses(result.props);
				} else {
					setPropStatuses(null);
				}
			})
			.catch(() => {
				setPropStatuses(null);
			});
	}, [sequence.controls, validatedLocation, schemaFields]);

	const expandedHeight = useMemo(
		() => getExpandedTrackHeight(sequence.controls),
		[sequence.controls],
	);

	const onSave = useCallback(
		(key: string, value: unknown): Promise<void> => {
			if (!propStatuses || !validatedLocation) {
				return Promise.resolve();
			}

			const status = propStatuses[key];
			if (!status || !status.canUpdate) {
				return Promise.resolve();
			}

			return callApi('/api/save-sequence-props', {
				fileName: validatedLocation.source,
				line: validatedLocation.line,
				column: validatedLocation.column,
				key,
				value: JSON.stringify(value),
				enumPaths: [],
			}).then(() => undefined);
		},
		[propStatuses, validatedLocation],
	);

	return (
		<div style={{...expandedSectionBase, height: expandedHeight}}>
			{schemaFields
				? schemaFields.map((field) => (
						<TimelineFieldRow
							key={field.key}
							field={field}
							propStatus={propStatuses?.[field.key] ?? null}
							onSave={onSave}
						/>
					))
				: 'No schema'}
		</div>
	);
};
