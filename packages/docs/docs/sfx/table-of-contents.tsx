import React from 'react';
import {Grid} from '../../components/TableOfContents/Grid';
import {TOCItem} from '../../components/TableOfContents/TOCItem';
import {PlayButton} from './PlayButton';

export const TableOfContents: React.FC = () => {
	return (
		<div>
			<Grid>
				<TOCItem link="/docs/sfx/whip">
					<strong>whip</strong>
					<div>URL for a whip sound effect</div>
					<div style={{marginTop: 8}}>
						<PlayButton src="https://remotion.media/whip.wav" size={32} />
					</div>
				</TOCItem>
				<TOCItem link="/docs/sfx/whoosh">
					<strong>whoosh</strong>
					<div>URL for a whoosh sound effect</div>
					<div style={{marginTop: 8}}>
						<PlayButton src="https://remotion.media/whoosh.wav" size={32} />
					</div>
				</TOCItem>
			</Grid>
		</div>
	);
};
