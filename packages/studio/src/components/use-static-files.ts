import React, {createContext, useContext, useEffect, useState} from 'react';
import {type StaticFile, getStaticFiles} from '../api/get-static-files';
import {watchPublicFolder} from '../api/watch-public-folder';

const StaticFilesContext = createContext<StaticFile[]>([]);

export const StaticFilesProvider: React.FC<{
	readonly children: React.ReactNode;
}> = ({children}) => {
	const [files, setFiles] = useState(() => getStaticFiles());

	useEffect(() => {
		const {cancel} = watchPublicFolder((newFiles) => {
			setFiles(newFiles);
		});

		return cancel;
	}, []);

	return React.createElement(
		StaticFilesContext.Provider,
		{value: files},
		children,
	);
};

export const useStaticFiles = (): StaticFile[] => {
	return useContext(StaticFilesContext);
};
