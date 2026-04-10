import {cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync} from 'fs';
import {join, resolve} from 'path';

const __dirname = new URL('.', import.meta.url).pathname;
const skillsOut = resolve(__dirname, 'skills');

const packagesSkillsDir = resolve(__dirname, '..', 'skills', 'skills');
const claudeSkillsDir = resolve(__dirname, '..', '..', '.claude', 'skills');

if (existsSync(skillsOut)) {
	rmSync(skillsOut, {recursive: true});
}
mkdirSync(skillsOut, {recursive: true});

function copySkillDir(src: string, destName: string) {
	const dest = join(skillsOut, destName);
	cpSync(src, dest, {
		recursive: true,
		filter: (source) => {
			// Exclude .tsx asset files (Remotion Studio testbed, not useful for Codex)
			if (source.endsWith('.tsx')) {
				return false;
			}
			return true;
		},
	});
	console.log(`  Copied ${destName}`);
}

console.log('Building Codex plugin skills...\n');

// 1. Copy skills from packages/skills/skills/
if (existsSync(packagesSkillsDir)) {
	const skillFolders = readdirSync(packagesSkillsDir).filter((f) =>
		statSync(join(packagesSkillsDir, f)).isDirectory(),
	);

	console.log(`From packages/skills/skills/ (${skillFolders.length} skills):`);
	for (const folder of skillFolders) {
		copySkillDir(join(packagesSkillsDir, folder), folder);
	}
} else {
	console.warn('Warning: packages/skills/skills/ not found');
}

console.log('');

// 2. Copy skills from .claude/skills/
if (existsSync(claudeSkillsDir)) {
	const skillFolders = readdirSync(claudeSkillsDir).filter((f) =>
		statSync(join(claudeSkillsDir, f)).isDirectory(),
	);

	console.log(`From .claude/skills/ (${skillFolders.length} skills):`);
	for (const folder of skillFolders) {
		copySkillDir(join(claudeSkillsDir, folder), folder);
	}
} else {
	console.warn('Warning: .claude/skills/ not found');
}

console.log('\nDone! Skills assembled in packages/codex-plugin/skills/');
