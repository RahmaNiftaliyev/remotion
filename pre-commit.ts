import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {$} from 'bun';

const staged = await $`git diff --cached --name-only --diff-filter=ACMR`.text();
const unstaged = await $`git diff --name-only`.text();
const changedFiles = [
	...new Set([...staged.trim().split('\n'), ...unstaged.trim().split('\n')]),
].filter(Boolean);

if (changedFiles.length === 0) {
	process.exit(0);
}

const packageNames = new Set<string>();

for (const file of changedFiles) {
	const match = file.match(/^packages\/([^/]+)\//);
	if (!match) {
		continue;
	}

	const dir = match[1];
	const pkgJsonPath = path.join('packages', dir, 'package.json');

	if (!existsSync(pkgJsonPath)) {
		continue;
	}

	const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

	if (!pkgJson.scripts?.format) {
		continue;
	}

	packageNames.add(pkgJson.name);
}

if (packageNames.size === 0) {
	process.exit(0);
}

const filters = [...packageNames].flatMap((name) => ['--filter', name]);

await $`bun run ${filters} format`;
