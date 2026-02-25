import type {CanUpdateSequencePropStatus} from '@remotion/studio-shared';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';
import {Checkbox} from '../Checkbox';
import {InputDragger} from '../NewComposition/InputDragger';
import {
	getZodNumberMaximum,
	getZodNumberMinimum,
	getZodNumberStep,
} from '../RenderModal/SchemaEditor/zod-number-constraints';
import {
	getDefaultValue,
	getInnerType,
	getZodSchemaType,
} from '../RenderModal/SchemaEditor/zod-schema-type';
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

const checkboxContainer: React.CSSProperties = {
	marginLeft: 'auto',
};

const notEditableBackground: React.CSSProperties = {
	backgroundColor: 'rgba(255, 0, 0, 0.2)',
	borderRadius: 3,
	padding: '0 4px',
};

const TimelineNumberField: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly codeValue: unknown;
	readonly canUpdate: boolean;
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({field, codeValue, canUpdate, onSave, onDragValueChange, onDragEnd}) => {
	const numberSchema =
		field.typeName === 'default'
			? getInnerType(field.fieldSchema)
			: field.fieldSchema;
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
			if (canUpdate && newVal !== codeValue) {
				onSave(field.key, newVal).catch(() => {
					setDragValue(null);
				});
			} else {
				setDragValue(null);
			}
		},
		[canUpdate, onSave, field.key, codeValue],
	);

	const onTextChange = useCallback(
		(newVal: string) => {
			if (canUpdate) {
				const parsed = Number(newVal);
				if (!Number.isNaN(parsed) && parsed !== codeValue) {
					setDragValue(parsed);
					onSave(field.key, parsed).catch(() => {
						setDragValue(null);
					});
				}
			}
		},
		[canUpdate, onSave, field.key, codeValue],
	);

	return (
		<InputDragger
			type="number"
			value={dragValue ?? (codeValue as number)}
			style={draggerStyle}
			status="ok"
			onValueChange={onValueChange}
			onValueChangeEnd={onValueChangeEnd}
			onTextChange={onTextChange}
			min={getZodNumberMinimum(numberSchema)}
			max={getZodNumberMaximum(numberSchema)}
			step={getZodNumberStep(numberSchema)}
			rightAlign
		/>
	);
};

const TimelineBooleanField: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly codeValue: unknown;
	readonly canUpdate: boolean;
	readonly onSave: (key: string, value: unknown) => Promise<void>;
}> = ({field, codeValue, canUpdate, onSave}) => {
	const checked = Boolean(codeValue);

	const onChange = useCallback(() => {
		if (canUpdate) {
			onSave(field.key, !checked);
		}
	}, [canUpdate, onSave, field.key, checked]);

	return (
		<div style={checkboxContainer}>
			<Checkbox
				checked={checked}
				onChange={onChange}
				name={field.key}
				disabled={!canUpdate}
			/>
		</div>
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
		return <span style={unsupportedLabel}>{propStatus.reason}</span>;
	}

	if (propStatus === null) {
		return (
			<span style={{...notEditableBackground}}>
				<span style={unsupportedLabel}>error</span>
			</span>
		);
	}

	const effectiveCodeValue =
		propStatus.codeValue ??
		field.currentValue ??
		(field.typeName === 'default'
			? getDefaultValue(field.fieldSchema)
			: undefined);

	const resolvedTypeName =
		field.typeName === 'default'
			? getZodSchemaType(getInnerType(field.fieldSchema))
			: field.typeName;

	if (resolvedTypeName === 'number') {
		return (
			<span style={wrapperStyle}>
				<TimelineNumberField
					field={field}
					codeValue={effectiveCodeValue}
					canUpdate={canUpdate}
					onSave={onSave}
					onDragValueChange={onDragValueChange}
					onDragEnd={onDragEnd}
				/>
			</span>
		);
	}

	if (resolvedTypeName === 'boolean') {
		return (
			<span style={wrapperStyle}>
				<TimelineBooleanField
					field={field}
					codeValue={effectiveCodeValue}
					canUpdate={canUpdate}
					onSave={onSave}
				/>
			</span>
		);
	}

	return (
		<span style={{...unsupportedLabel, fontStyle: 'normal'}}>
			{String(effectiveCodeValue)}
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
