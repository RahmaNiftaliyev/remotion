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
	readonly canUpdate: boolean | null;
	readonly onSave: (key: string, value: unknown) => void;
}> = ({field, canUpdate, onSave}) => {
	const onValueChange = useCallback(
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
}> = ({field, canUpdate, onSave}) => {
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
