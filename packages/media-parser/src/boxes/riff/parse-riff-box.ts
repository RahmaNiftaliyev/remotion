import type {BufferIterator} from '../../buffer-iterator';
import type {ParserState} from '../../state/parser-state';
import {parseAvih} from './parse-avih';
import {parseIsft} from './parse-isft';
import {parseListBox} from './parse-list-box';
import {parseStrh} from './parse-strh';
import type {RiffBox, RiffRegularBox} from './riff-box';

export const parseRiffBox = ({
	iterator,
	size,
	id,
	state,
}: {
	iterator: BufferIterator;
	size: number;
	id: string;
	state: ParserState;
}): Promise<RiffBox> => {
	if (id === 'LIST') {
		return parseListBox({iterator, size, state});
	}

	if (id === 'ISFT') {
		return Promise.resolve(parseIsft({iterator, size}));
	}

	if (id === 'avih') {
		return Promise.resolve(parseAvih({iterator, size}));
	}

	if (id === 'strh') {
		return Promise.resolve(parseStrh({iterator, size}));
	}

	iterator.discard(size);

	const box: RiffRegularBox = {
		type: 'riff-box',
		size,
		id,
	};

	return Promise.resolve(box);
};
