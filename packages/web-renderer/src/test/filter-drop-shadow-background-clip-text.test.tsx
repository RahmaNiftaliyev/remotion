import {test} from 'vitest';
import {renderStillOnWeb} from '../render-still-on-web';
import '../symbol-dispose';
import {filterDropShadowBackgroundClipText} from './fixtures/text/filter-drop-shadow-background-clip-text';
import {testImage} from './utils';

test('should render drop-shadow filter with background-clip: text', async () => {
	const blob = await (
		await renderStillOnWeb({
			licenseKey: 'free-license',
			composition: filterDropShadowBackgroundClipText,
			frame: 0,
			inputProps: {},
		})
	).blob({format: 'png'});

	await testImage({
		blob,
		testId: 'filter-drop-shadow-background-clip-text',
		threshold: 0,
		allowedMismatchedPixelRatio: 0.03,
	});
});
