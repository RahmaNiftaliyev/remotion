import type {CanUpdateSequencePropStatus} from './use-schema';

export const getEffectiveVisualModeValue = ({
	codeValue,
	runtimeValue,
	dragOverrideValue,
	defaultValue,
	fallbackToDefaultValue,
}: {
	codeValue: CanUpdateSequencePropStatus | null;
	runtimeValue: unknown;
	dragOverrideValue: unknown;
	defaultValue: unknown;
	fallbackToDefaultValue: boolean;
}) => {
	if (dragOverrideValue !== undefined) {
		return dragOverrideValue;
	}

	if (!codeValue) {
		return runtimeValue;
	}

	if (!codeValue.canUpdate) {
		return runtimeValue;
	}

	if (codeValue.codeValue === undefined && fallbackToDefaultValue) {
		return defaultValue;
	}

	return codeValue.codeValue;
};
