import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useContext, useMemo} from 'react';
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
import {SequencePropStatusContext} from './SequencePropStatusContext';
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
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
	readonly propStatus: CanUpdateSequencePropStatus | null;
	readonly effectiveValue: unknown;
}> = ({
	field,
	onSave,
	onDragValueChange,
	onDragEnd,
	propStatus,
	effectiveValue,
}) => {
	return (
		<div style={{...fieldRow, height: field.rowHeight}}>
			<div style={fieldLabelRow}>
				<span style={fieldName}>{field.description ?? field.key}</span>
			</div>
			<TimelineFieldValue
				field={field}
				propStatus={propStatus}
				onSave={onSave}
				onDragValueChange={onDragValueChange}
				onDragEnd={onDragEnd}
				canUpdate={propStatus?.canUpdate ?? false}
				effectiveValue={effectiveValue}
			/>
		</div>
	);
};

export const TimelineExpandedSection: React.FC<{
	readonly sequence: TSequence;
	readonly originalLocation: OriginalPosition | null;
}> = ({sequence, originalLocation}) => {
	const overrideId = sequence.controls?.overrideId ?? sequence.id;
	const {propStatuses: allPropStatuses} = useContext(SequencePropStatusContext);
	const propStatuses = allPropStatuses[overrideId] ?? null;
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

	const expandedHeight = useMemo(
		() => getExpandedTrackHeight(sequence.controls),
		[sequence.controls],
	);

	const {setOverride, clearOverrides, codeValues, overrides} = useContext(
		Internals.SequenceControlOverrideContext,
	);

	const onSave = useCallback(
		(key: string, value: unknown): Promise<void> => {
			if (!propStatuses || !validatedLocation) {
				return Promise.reject(new Error('Cannot save'));
			}

			const status = propStatuses[key];
			if (!status || !status.canUpdate) {
				return Promise.reject(new Error('Cannot save'));
			}

			const field = schemaFields?.find((f) => f.key === key);
			const defaultValue =
				field && field.fieldSchema.default !== undefined
					? JSON.stringify(field.fieldSchema.default)
					: null;

			return callApi('/api/save-sequence-props', {
				fileName: validatedLocation.source,
				line: validatedLocation.line,
				column: validatedLocation.column,
				key,
				value: JSON.stringify(value),
				enumPaths: [],
				defaultValue,
			}).then(() => undefined);
		},
		[propStatuses, validatedLocation, schemaFields],
	);

	const onDragValueChange = useCallback(
		(key: string, value: unknown) => {
			setOverride(overrideId, key, value);
		},
		[setOverride, overrideId],
	);

	const onDragEnd = useCallback(() => {
		clearOverrides(overrideId);
	}, [clearOverrides, overrideId]);

	return (
		<div style={{...expandedSectionBase, height: expandedHeight}}>
			{schemaFields
				? schemaFields.map((field) => {
						const codeValue = codeValues[overrideId]?.[field.key];
						const resolvedCodeValue =
							codeValue !== undefined ? codeValue : field.fieldSchema.default;
						const dragOverride = overrides[overrideId]?.[field.key];
						const effectiveValue =
							dragOverride ?? resolvedCodeValue ?? field.currentValue;

						return (
							<TimelineFieldRow
								key={field.key}
								field={field}
								propStatus={propStatuses?.[field.key] ?? null}
								onSave={onSave}
								onDragValueChange={onDragValueChange}
								onDragEnd={onDragEnd}
								effectiveValue={effectiveValue}
							/>
						);
					})
				: 'No schema'}
		</div>
	);
};
