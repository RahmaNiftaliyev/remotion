import fs from 'fs';
import {
	ORIGINAL_CONTENT_FILE,
	ORIGINAL_VISUAL_CONTROLS_FILE,
	PID_FILE,
	rootFile,
	visualControlsFile,
} from './constants.mts';

export default async function globalTeardown(): Promise<void> {
	if (fs.existsSync(PID_FILE)) {
		const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// Process might already be dead
		}

		fs.unlinkSync(PID_FILE);
	}

	if (fs.existsSync(ORIGINAL_CONTENT_FILE)) {
		fs.writeFileSync(
			rootFile,
			fs.readFileSync(ORIGINAL_CONTENT_FILE, 'utf-8'),
		);
		fs.unlinkSync(ORIGINAL_CONTENT_FILE);
	}

	if (fs.existsSync(ORIGINAL_VISUAL_CONTROLS_FILE)) {
		fs.writeFileSync(
			visualControlsFile,
			fs.readFileSync(ORIGINAL_VISUAL_CONTROLS_FILE, 'utf-8'),
		);
		fs.unlinkSync(ORIGINAL_VISUAL_CONTROLS_FILE);
	}
}
