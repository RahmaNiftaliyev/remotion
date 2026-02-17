import {useEffect, useState} from 'react';
import {type StaticFile, getStaticFiles} from '../api/get-static-files';
import {watchPublicFolder} from '../api/watch-public-folder';

export const useStaticFiles = (): StaticFile[] => {
	const [files, setFiles] = useState(() => getStaticFiles());

	useEffect(() => {
		const {cancel} = watchPublicFolder((newFiles) => {
			setFiles(newFiles);
		});

		return cancel;
	}, []);

	return files;
};
