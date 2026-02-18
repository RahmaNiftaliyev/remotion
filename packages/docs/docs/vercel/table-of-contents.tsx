import React from 'react';
import {Grid} from '../../components/TableOfContents/Grid';
import {TOCItem} from '../../components/TableOfContents/TOCItem';

export const TableOfContents: React.FC = () => {
	return (
		<div>
			<Grid>
				<TOCItem link="/docs/vercel/create-sandbox">
					<strong>createSandbox()</strong>
					<div>Create a sandbox with Remotion installed</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/save-snapshot">
					<strong>saveSnapshot()</strong>
					<div>Snapshot a sandbox and save to Vercel Blob</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/restore-snapshot">
					<strong>restoreSnapshot()</strong>
					<div>Restore a sandbox from a cached snapshot</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/render-video-on-vercel">
					<strong>renderVideoOnVercel()</strong>
					<div>Render a video in a sandbox</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/render-still-on-vercel">
					<strong>renderStillOnVercel()</strong>
					<div>Render a still image in a sandbox</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/upload-to-vercel-blob">
					<strong>uploadToVercelBlob()</strong>
					<div>Upload a file from the sandbox to Vercel Blob</div>
				</TOCItem>
				<TOCItem link="/docs/vercel/types">
					<strong>Types</strong>
					<div>TypeScript types reference</div>
				</TOCItem>
			</Grid>
		</div>
	);
};
