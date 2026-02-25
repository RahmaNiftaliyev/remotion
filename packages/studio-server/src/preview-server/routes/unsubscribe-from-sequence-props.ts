import type {UnsubscribeFromSequencePropsRequest} from '@remotion/studio-shared';
import type {ApiHandler} from '../api-types';
import {unsubscribeFromSequencePropsWatchers} from '../sequence-props-watchers';

export const unsubscribeFromSequenceProps: ApiHandler<
	UnsubscribeFromSequencePropsRequest,
	undefined
> = ({input: {fileName, line, column, clientId}, remotionRoot}) => {
	unsubscribeFromSequencePropsWatchers({
		fileName,
		line,
		column,
		remotionRoot,
		clientId,
	});
	return Promise.resolve(undefined);
};
