import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useEffect, useRef, useState} from 'react';
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
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({field, canUpdate, onSave, onDragValueChange, onDragEnd}) => {
	const [dragValue, setDragValue] = useState<number | null>(null);
	const dragging = useRef(false);

	const onValueChange = useCallback(
		(newVal: number) => {
			dragging.current = true;
			setDragValue(newVal);
			onDragValueChange(field.key, newVal);
		},
		[onDragValueChange, field.key],
	);

	useEffect(() => {
		setDragValue(null);
		onDragEnd();
	}, [field.currentValue, onDragEnd]);

	const onValueChangeEnd = useCallback(
		(newVal: number) => {
			if (canUpdate && newVal !== field.currentValue) {
				onSave(field.key, newVal).catch(() => {
					setDragValue(null);
				});
			} else {
				setDragValue(null);
			}
		},
		[canUpdate, onSave, field.key, field.currentValue],
	);

	const onTextChange = useCallback(
		(newVal: string) => {
			if (canUpdate) {
				const parsed = Number(newVal);
				if (!Number.isNaN(parsed) && parsed !== field.currentValue) {
					setDragValue(parsed);
					onSave(field.key, parsed).catch(() => {
						setDragValue(null);
					});
				}
			}
		},
		[canUpdate, onSave, field.key, field.currentValue],
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
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
	readonly canUpdate: boolean;
	readonly propStatus: CanUpdateSequencePropStatus | null;
}> = ({field, onSave, onDragValueChange, onDragEnd, propStatus, canUpdate}) => {
	const wrapperStyle: React.CSSProperties | undefined =
		canUpdate === null || canUpdate === false
			? notEditableBackground
			: undefined;

	if (!field.supported) {
		return <span style={unsupportedLabel}>unsupported</span>;
	}

	if (propStatus !== null && !propStatus.canUpdate) {
		const label =
			propStatus.reason === 'not-set' ? 'not set' : propStatus.reason;
		return <span style={unsupportedLabel}>{label}</span>;
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
			<span style={wrapperStyle}>
				<TimelineNumberField
					field={field}
					canUpdate={canUpdate}
					onSave={onSave}
					onDragValueChange={onDragValueChange}
					onDragEnd={onDragEnd}
				/>
			</span>
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
