import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {Internals} from 'remotion';
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
	readonly canUpdate: boolean | null;
	readonly onSave: (key: string, value: unknown) => void;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({field, canUpdate, onSave, onDragValueChange, onDragEnd}) => {
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
				canUpdate={canUpdate}
				onSave={onSave}
				onSavingChange={onSavingChange}
				onDragValueChange={onDragValueChange}
				onDragEnd={onDragEnd}
			/>
		</div>
	);
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

	const {setOverride, clearOverrides} = useContext(
		Internals.SequenceControlOverrideContext,
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

	const onDragValueChange = useCallback(
		(key: string, value: unknown) => {
			setOverride(sequence.id, key, value);
		},
		[setOverride, sequence.id],
	);

	const onDragEnd = useCallback(() => {
		clearOverrides(sequence.id);
	}, [clearOverrides, sequence.id]);

	return (
		<div style={{...expandedSectionBase, height: expandedHeight}}>
			{schemaFields
				? schemaFields.map((field) => (
						<TimelineFieldRow
							key={field.key}
							field={field}
							canUpdate={canUpdate}
							onSave={onSave}
							onDragValueChange={onDragValueChange}
							onDragEnd={onDragEnd}
						/>
					))
				: 'No schema'}
		</div>
	);
};
