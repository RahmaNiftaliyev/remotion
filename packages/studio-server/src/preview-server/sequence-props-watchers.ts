import type {CanUpdateSequencePropsResponse} from '@remotion/studio-shared';
import path from 'node:path';
import {installFileWatcher} from '../file-watcher';
import {waitForLiveEventsListener} from './live-events';
import {computeSequencePropsStatus} from './routes/can-update-sequence-props';

type WatcherInfo = {
	unwatch: () => void;
};

const sequencePropsWatchers: Record<string, Record<string, WatcherInfo>> = {};

const makeWatcherKey = ({
	absolutePath,
	line,
	column,
}: {
	absolutePath: string;
	line: number;
	column: number;
}): string => {
	return `${absolutePath}:${line}:${column}`;
};

export const subscribeToSequencePropsWatchers = ({
	fileName,
	line,
	column,
	keys,
	remotionRoot,
	clientId,
}: {
	fileName: string;
	line: number;
	column: number;
	keys: string[];
	remotionRoot: string;
	clientId: string;
}): CanUpdateSequencePropsResponse => {
	const absolutePath = path.resolve(remotionRoot, fileName);
	const watcherKey = makeWatcherKey({absolutePath, line, column});

	// Unwatch any existing watcher for the same key
	if (sequencePropsWatchers[clientId]?.[watcherKey]) {
		sequencePropsWatchers[clientId][watcherKey].unwatch();
	}

	const initialResult = computeSequencePropsStatus({
		fileName,
		line,
		keys,
		remotionRoot,
	});

	const {unwatch} = installFileWatcher({
		file: absolutePath,
		onChange: (type) => {
			if (type === 'deleted') {
				return;
			}

			const result = computeSequencePropsStatus({
				fileName,
				line,
				keys,
				remotionRoot,
			});

			waitForLiveEventsListener().then((listener) => {
				listener.sendEventToClient({
					type: 'sequence-props-updated',
					fileName,
					line,
					column,
					result,
				});
			});
		},
	});

	if (!sequencePropsWatchers[clientId]) {
		sequencePropsWatchers[clientId] = {};
	}

	sequencePropsWatchers[clientId][watcherKey] = {unwatch};

	return initialResult;
};

export const unsubscribeFromSequencePropsWatchers = ({
	fileName,
	line,
	column,
	remotionRoot,
	clientId,
}: {
	fileName: string;
	line: number;
	column: number;
	remotionRoot: string;
	clientId: string;
}) => {
	const absolutePath = path.resolve(remotionRoot, fileName);
	const watcherKey = makeWatcherKey({absolutePath, line, column});

	if (!sequencePropsWatchers[clientId]) {
		return;
	}

	sequencePropsWatchers[clientId][watcherKey]?.unwatch();
	delete sequencePropsWatchers[clientId][watcherKey];
};

export const unsubscribeClientSequencePropsWatchers = (clientId: string) => {
	if (!sequencePropsWatchers[clientId]) {
		return;
	}

	Object.values(sequencePropsWatchers[clientId]).forEach((watcher) => {
		watcher.unwatch();
	});

	delete sequencePropsWatchers[clientId];
};
