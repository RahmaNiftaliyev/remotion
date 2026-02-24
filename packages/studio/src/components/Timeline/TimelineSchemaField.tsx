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
	readonly canUpdate: boolean | null;
	readonly onSave: (key: string, value: unknown) => void;
	readonly onSavingChange: (saving: boolean) => void;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({
	field,
	canUpdate,
	onSave,
	onSavingChange,
	onDragValueChange,
	onDragEnd,
}) => {
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
		onSavingChange(false);
		onDragEnd();
	}, [field.currentValue, onSavingChange, onDragEnd]);

	const onValueChangeEnd = useCallback(
		(newVal: number) => {
			dragging.current = false;
			if (canUpdate && newVal !== field.currentValue) {
				onSavingChange(true);
				onSave(field.key, newVal);
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
					onSave(field.key, parsed);
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
	readonly canUpdate: boolean | null;
	readonly onSave: (key: string, value: unknown) => void;
	readonly onSavingChange: (saving: boolean) => void;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({
	field,
	canUpdate,
	onSave,
	onSavingChange,
	onDragValueChange,
	onDragEnd,
}) => {
	const wrapperStyle: React.CSSProperties | undefined =
		canUpdate === null || canUpdate === false
			? notEditableBackground
			: undefined;

	if (!field.supported) {
		return (
			<span style={{...unsupportedLabel, ...wrapperStyle}}>unsupported</span>
		);
	}

	if (field.typeName === 'number') {
		return (
			<span style={wrapperStyle}>
				<TimelineNumberField
					field={field}
					canUpdate={canUpdate}
					onSave={onSave}
					onSavingChange={onSavingChange}
					onDragValueChange={onDragValueChange}
					onDragEnd={onDragEnd}
				/>
			</span>
		);
	}

	return (
		<span style={{...unsupportedLabel, fontStyle: 'normal', ...wrapperStyle}}>
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
