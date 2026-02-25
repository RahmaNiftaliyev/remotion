import {useContext} from 'react';
import {SequenceContext} from './SequenceContext.js';
import {SequenceControlOverrideContext} from './SequenceManager.js';

export const useSequenceControlOverride = (
	key: string,
): unknown | undefined => {
	const seqContext = useContext(SequenceContext);
	const {overrides} = useContext(SequenceControlOverrideContext);
	if (!seqContext) {
		return undefined;
	}

	return overrides[seqContext.id]?.[key];
};
