import {playwright} from '@vitest/browser-playwright';
import path from 'node:path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		maxWorkers: process.env.CI ? 1 : 5,
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{
					browser: 'chromium',
					provider: playwright({
						launchOptions: {
							channel: 'chrome',
						},
						actionTimeout: 5_000,
					}),
				},
				{
					browser: 'firefox',
				},
				{
					browser: 'webkit',
				},
			],
			headless: true,
			screenshotFailures: false,
		},
	},
	esbuild: {
		target: 'es2022',
	},
	publicDir: path.join(__dirname, '..', 'example-videos', 'videos'),
});
