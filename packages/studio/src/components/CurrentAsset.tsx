import {formatBytes} from '@remotion/studio-shared';
import React, {useContext, useMemo} from 'react';
import {Internals} from 'remotion';
import {getStaticFiles} from '../api/get-static-files';
import {BACKGROUND, BORDER_COLOR} from '../helpers/colors';

export const CURRENT_ASSET_HEIGHT = 80;

const container: React.CSSProperties = {
	height: CURRENT_ASSET_HEIGHT,
	display: 'block',
	borderBottom: `1px solid ${BORDER_COLOR}`,
	padding: 12,
	color: 'white',
	backgroundColor: BACKGROUND,
};

const title: React.CSSProperties = {
	fontWeight: 'bold',
	fontSize: 12,
	whiteSpace: 'nowrap',
	lineHeight: '18px',
	backgroundColor: BACKGROUND,
};

const subtitle: React.CSSProperties = {
	fontSize: 12,
	opacity: 0.8,
	whiteSpace: 'nowrap',
	lineHeight: '18px',
	backgroundColor: BACKGROUND,
};

const row: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'row',
	lineHeight: '18px',
	backgroundColor: BACKGROUND,
};

export const CurrentAsset: React.FC = () => {
	const {canvasContent} = useContext(Internals.CompositionManager);

	const assetName =
		canvasContent?.type === 'asset' ? canvasContent.asset : null;

	const sizeInBytes = useMemo(() => {
		if (!assetName) {
			return null;
		}

		const staticFiles = getStaticFiles();
		const file = staticFiles.find((f) => f.name === assetName);
		return file?.sizeInBytes ?? null;
	}, [assetName]);

	if (!assetName) {
		return <div style={container} />;
	}

	const fileName = assetName.split('/').pop() ?? assetName;

	return (
		<div style={container}>
			<div style={row}>
				<div>
					<div style={title}>{fileName}</div>
					{sizeInBytes !== null ? (
						<div style={subtitle}>{formatBytes(sizeInBytes)}</div>
					) : null}
				</div>
			</div>
		</div>
	);
};
