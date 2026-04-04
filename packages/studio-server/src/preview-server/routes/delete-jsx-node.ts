import {readFileSync} from 'node:fs';
import path from 'node:path';
import {RenderInternals} from '@remotion/renderer';
import type {
	DeleteJsxNodeRequest,
	DeleteJsxNodeResponse,
} from '@remotion/studio-shared';
import {deleteJsxNode} from '../../codemods/delete-jsx-node';
import {writeFileAndNotifyFileWatchers} from '../../file-watcher';
import type {ApiHandler} from '../api-types';
import {
	printUndoHint,
	pushToUndoStack,
	suppressUndoStackInvalidation,
} from '../undo-stack';
import {suppressBundlerUpdateForFile} from '../watch-ignore-next-change';

export const deleteJsxNodeHandler: ApiHandler<
	DeleteJsxNodeRequest,
	DeleteJsxNodeResponse
> = async ({input: {fileName, nodePath}, remotionRoot, logLevel}) => {
	try {
		RenderInternals.Log.trace(
			{indent: false, logLevel},
			`[delete-jsx-node] Received request for fileName="${fileName}"`,
		);
		const absolutePath = path.resolve(remotionRoot, fileName);
		const fileRelativeToRoot = path.relative(remotionRoot, absolutePath);
		if (fileRelativeToRoot.startsWith('..')) {
			throw new Error('Cannot modify a file outside the project');
		}

		const fileContents = readFileSync(absolutePath, 'utf-8');

		const {output, formatted} = await deleteJsxNode({
			input: fileContents,
			nodePath,
		});

		pushToUndoStack({
			filePath: absolutePath,
			oldContents: fileContents,
			logLevel,
			remotionRoot,
			description: {
				undoMessage: 'Undid JSX node deletion',
				redoMessage: 'Redid JSX node deletion',
			},
			entryType: 'delete-jsx-node',
		});
		suppressUndoStackInvalidation(absolutePath);
		suppressBundlerUpdateForFile(absolutePath);
		writeFileAndNotifyFileWatchers(absolutePath, output);

		RenderInternals.Log.verbose(
			{indent: false, logLevel},
			`[delete-jsx-node] Wrote ${fileRelativeToRoot}${formatted ? ' (formatted)' : ''}`,
		);

		printUndoHint(logLevel);

		return {
			success: true,
		};
	} catch (err) {
		return {
			success: false,
			reason: (err as Error).message,
			stack: (err as Error).stack as string,
		};
	}
};
