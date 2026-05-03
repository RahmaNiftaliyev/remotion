import React, {useCallback} from 'react';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';

const selectStyle: React.CSSProperties = {
	marginLeft: 8,
	background: 'transparent',
	color: 'white',
	border: '1px solid rgba(255, 255, 255, 0.2)',
	borderRadius: 3,
	fontSize: 12,
	padding: '1px 4px',
};

export const TimelineEnumField: React.FC<{
	readonly field: SchemaFieldInfo;
	readonly codeValue: unknown;
	readonly effectiveValue: unknown;
	readonly canUpdate: boolean;
	readonly onSave: (key: string, value: unknown) => Promise<void>;
	readonly onDragValueChange: (key: string, value: unknown) => void;
	readonly onDragEnd: () => void;
}> = ({
	field,
	codeValue,
	effectiveValue,
	canUpdate,
	onSave,
	onDragValueChange,
	onDragEnd,
}) => {
	const {fieldSchema} = field;
	if (fieldSchema.type !== 'enum') {
		throw new Error('TimelineEnumField rendered for non-enum field');
	}

	const variantKeys = Object.keys(fieldSchema.variants);
	const current = String(effectiveValue ?? fieldSchema.default);

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const newValue = e.target.value;
			if (!canUpdate || newValue === codeValue) {
				return;
			}

			onDragValueChange(field.key, newValue);
			onSave(field.key, newValue).finally(() => {
				onDragEnd();
			});
		},
		[canUpdate, codeValue, field.key, onSave, onDragValueChange, onDragEnd],
	);

	return (
		<select
			disabled={!canUpdate}
			value={current}
			onChange={onChange}
			style={selectStyle}
		>
			{variantKeys.map((key) => (
				<option key={key} value={key}>
					{key}
				</option>
			))}
		</select>
	);
};
