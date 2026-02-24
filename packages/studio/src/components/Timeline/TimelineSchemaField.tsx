import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback} from 'react';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';
import {InputDragger} from '../NewComposition/InputDragger';
import {
	getZodNumberMaximum,
	getZodNumberMinimum,
	getZodNumberStep,
} from '../RenderModal/SchemaEditor/zod-number-constraints';

const unsupportedLabel: React.CSSProperties = {
	color: 'rgba(255, 255, 255, 0.4)',
	fontSize: 12,
	marginLeft: 'auto',
	fontStyle: 'italic',
};

const draggerStyle: React.CSSProperties = {
	width: 80,
	marginLeft: 'auto',
};

const notEditableBackground: React.CSSProperties = {
	backgroundColor: 'rgba(255, 0, 0, 0.2)',
	borderRadius: 3,
	padding: '0 4px',
};

const TimelineNumberField: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly canUpdate: boolean;
	readonly onSave: (key: string, value: unknown) => void;
}> = ({field, canUpdate, onSave}) => {
	const onValueChange = useCallback((_newVal: number) => {
		// No-op during drag; save happens on drag end
	}, []);

	const onValueChangeEnd = useCallback(
		(newVal: number) => {
			if (canUpdate) {
				onSave(field.key, newVal);
			}
		},
		[canUpdate, onSave, field.key],
	);

	const onTextChange = useCallback(
		(newVal: string) => {
			if (canUpdate) {
				const parsed = Number(newVal);
				if (!Number.isNaN(parsed)) {
					onSave(field.key, parsed);
				}
			}
		},
		[canUpdate, onSave, field.key],
	);

	return (
		<InputDragger
			type="number"
			value={field.currentValue as number}
			style={draggerStyle}
			status="ok"
			onValueChange={onValueChange}
			onValueChangeEnd={onValueChangeEnd}
			onTextChange={onTextChange}
			min={getZodNumberMinimum(field.fieldSchema)}
			max={getZodNumberMaximum(field.fieldSchema)}
			step={getZodNumberStep(field.fieldSchema)}
			rightAlign
		/>
	);
};

export const TimelineFieldValue: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly propStatus: CanUpdateSequencePropStatus | null;
	readonly onSave: (key: string, value: unknown) => void;
}> = ({field, propStatus, onSave}) => {
	const canUpdate = propStatus !== null && propStatus.canUpdate;

	if (!field.supported) {
		return (
			<span style={unsupportedLabel}>unsupported</span>
		);
	}

	if (propStatus !== null && !propStatus.canUpdate) {
		return (
			<span style={unsupportedLabel}>{propStatus.reason}</span>
		);
	}

	if (propStatus === null) {
		return (
			<span style={{...notEditableBackground}}>
				<span style={unsupportedLabel}>error</span>
			</span>
		);
	}

	if (field.typeName === 'number') {
		return (
			<TimelineNumberField
				field={field}
				canUpdate={canUpdate}
				onSave={onSave}
			/>
		);
	}

	return (
		<span style={{...unsupportedLabel, fontStyle: 'normal'}}>
			{String(field.currentValue)}
		</span>
	);
};
