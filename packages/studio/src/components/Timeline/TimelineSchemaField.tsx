import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useEffect, useState} from 'react';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';
import {InputDragger} from '../NewComposition/InputDragger';
import {
	getZodNumberMaximum,
	getZodNumberMinimum,
	getZodNumberStep,
} from '../RenderModal/SchemaEditor/zod-number-constraints';
import {Spinner} from '../Spinner';

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
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onSavingChange: (saving: boolean) => void;
}> = ({field, canUpdate, onSave, onSavingChange}) => {
	const [dragValue, setDragValue] = useState<number | null>(null);

	const onValueChange = useCallback((newVal: number) => {
		setDragValue(newVal);
	}, []);

	useEffect(() => {
		setDragValue(null);
		onSavingChange(false);
	}, [field.currentValue, onSavingChange]);

	const onValueChangeEnd = useCallback(
		(newVal: number) => {
			if (canUpdate && newVal !== field.currentValue) {
				onSavingChange(true);
				onSave(field.key, newVal).catch(() => {
					onSavingChange(false);
					setDragValue(null);
				});
			} else {
				setDragValue(null);
			}
		},
		[canUpdate, onSave, onSavingChange, field.key, field.currentValue],
	);

	const onTextChange = useCallback(
		(newVal: string) => {
			if (canUpdate) {
				const parsed = Number(newVal);
				if (!Number.isNaN(parsed) && parsed !== field.currentValue) {
					setDragValue(parsed);
					onSavingChange(true);
					onSave(field.key, parsed).catch(() => {
						onSavingChange(false);
						setDragValue(null);
					});
				}
			}
		},
		[canUpdate, onSave, onSavingChange, field.key, field.currentValue],
	);

	return (
		<InputDragger
			type="number"
			value={dragValue ?? (field.currentValue as number)}
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
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onSavingChange: (saving: boolean) => void;
}> = ({field, propStatus, onSave, onSavingChange}) => {
	const canUpdate = propStatus !== null && propStatus.canUpdate;

	if (!field.supported) {
		return <span style={unsupportedLabel}>unsupported</span>;
	}

	if (propStatus !== null && !propStatus.canUpdate) {
		return <span style={unsupportedLabel}>{propStatus.reason}</span>;
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
				onSavingChange={onSavingChange}
			/>
		);
	}

	return (
		<span style={{...unsupportedLabel, fontStyle: 'normal'}}>
			{String(field.currentValue)}
		</span>
	);
};

export const TimelineFieldSavingSpinner: React.FC<{
	readonly saving: boolean;
}> = ({saving}) => {
	if (!saving) {
		return null;
	}

	return <Spinner duration={0.5} size={12} />;
};
