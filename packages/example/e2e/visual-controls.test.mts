import fs from 'fs';
import {expect, test} from '@playwright/test';
import {EXPANDED_SIDEBAR_STATE, visualControlsFile} from './constants.mts';
import {navigateToVisualControls} from './helpers.mts';

test.use({storageState: EXPANDED_SIDEBAR_STATE});

test.describe('visual controls', () => {
	let originalContent: string;

	test.beforeEach(() => {
		originalContent = fs.readFileSync(visualControlsFile, 'utf-8');
	});

	test.afterEach(() => {
		fs.writeFileSync(visualControlsFile, originalContent);
	});

	test('should edit rotation and update source file', async ({page}) => {
		await navigateToVisualControls(page);

		// Click the Controls tab on the right panel
		const controlsTab = page.getByText('Controls', {exact: true});
		await expect(controlsTab).toBeVisible({timeout: 15_000});
		await controlsTab.click();

		// Find the rotation control's fieldset via the data-json-path label
		const rotationFieldset = page
			.locator('[data-json-path="rotation"]')
			.locator('..');
		await expect(rotationFieldset).toBeVisible({timeout: 10_000});

		// Click the dragger button to activate the number input
		const dragger = rotationFieldset.locator(
			'button.__remotion_input_dragger',
		);
		await expect(dragger).toBeVisible({timeout: 5_000});
		await dragger.click();

		// Fill the now-visible input with a new value
		const input = rotationFieldset.locator('input');
		await expect(input).toBeVisible({timeout: 5_000});

		const newRotation = '42';
		await input.fill(newRotation);
		await input.press('Enter');

		// Wait for the source file to be updated on disk
		await expect
			.poll(
				() => {
					const content = fs.readFileSync(visualControlsFile, 'utf-8');
					return content.includes(`'rotation', ${newRotation}`);
				},
				{
					message: `Expected VisualControls/index.tsx to contain rotation value ${newRotation}`,
					timeout: 10_000,
				},
			)
			.toBe(true);
	});
});
