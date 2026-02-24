import React, {useCallback} from 'react';
import {InputDragger} from '../../NewComposition/InputDragger';
import {Fieldset} from './Fieldset';
import {useLocalState} from './local-state';
import {SchemaLabel} from './SchemaLabel';
import {
	getZodNumberMaximum,
	getZodNumberMinimum,
	getZodNumberStep,
} from './zod-number-constraints';
import type {AnyZodSchema} from './zod-schema-type';
import type {JSONPath} from './zod-types';
import {ZodFieldValidation} from './ZodFieldValidation';
import type {UpdaterFunction} from './ZodSwitch';

const fullWidth: React.CSSProperties = {
	width: '100%',
};

export const ZodNumberEditor: React.FC<{
	readonly schema: AnyZodSchema;
	readonly jsonPath: JSONPath;
	readonly value: number;
	readonly setValue: UpdaterFunction<number>;
	readonly defaultValue: number;
	readonly onSave: UpdaterFunction<number>;
	readonly onRemove: null | (() => void);
	readonly showSaveButton: boolean;
	readonly saving: boolean;
	readonly saveDisabledByParent: boolean;
	readonly mayPad: boolean;
}> = ({
	jsonPath,
	value,
	schema,
	setValue,
	onSave,
	defaultValue,
	onRemove,
	showSaveButton,
	saving,
	saveDisabledByParent,
	mayPad,
}) => {
	const {
		localValue,
		onChange: setLocalValue,

		reset,
	} = useLocalState({
		unsavedValue: value,
		schema,
		setValue,
		savedValue: defaultValue,
	});

	const onNumberChange = useCallback(
		(newValue: number) => {
			setLocalValue(() => newValue, false, false);
		},
		[setLocalValue],
	);

	const isDefault = localValue.value === defaultValue;

	const onTextChange = useCallback(
		(newValue: string) => {
			setLocalValue(() => Number(newValue), false, false);
		},
		[setLocalValue],
	);

	const save = useCallback(() => {
		onSave(() => value, false, false);
	}, [onSave, value]);

	return (
		<Fieldset shouldPad={mayPad} success={localValue.zodValidation.success}>
			<SchemaLabel
				handleClick={null}
				isDefaultValue={isDefault}
				jsonPath={jsonPath}
				onReset={reset}
				onSave={save}
				showSaveButton={showSaveButton}
				onRemove={onRemove}
				saving={saving}
				valid={localValue.zodValidation.success}
				saveDisabledByParent={saveDisabledByParent}
				suffix={null}
			/>
			<div style={fullWidth}>
				<InputDragger
					type={'number'}
					value={localValue.value}
					style={fullWidth}
					status={localValue.zodValidation.success ? 'ok' : 'error'}
					placeholder={jsonPath.join('.')}
					onTextChange={onTextChange}
					onValueChange={onNumberChange}
					min={getZodNumberMinimum(schema)}
					max={getZodNumberMaximum(schema)}
					step={getZodNumberStep(schema)}
					rightAlign={false}
				/>
				<ZodFieldValidation path={jsonPath} localValue={localValue} />
			</div>
		</Fieldset>
	);
};
