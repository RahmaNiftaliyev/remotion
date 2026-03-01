import type {CanUpdateSequencePropStatus} from './use-schema';

export const getEffectiveVisualModeValue = ({
	codeValue,
	runtimeValue,
	dragOverrideValue,
}: {
	codeValue: CanUpdateSequencePropStatus | null;
	runtimeValue: unknown;
	dragOverrideValue: unknown;
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

	if (codeValue.codeValue === undefined) {
		return runtimeValue;
	}

	return codeValue.codeValue;
};
