import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {$} from 'bun';

const result = await $`git diff --cached --name-only --diff-filter=ACMR`.text();
const stagedFiles = result.trim().split('\n').filter(Boolean);

if (stagedFiles.length === 0) {
	process.exit(0);
}

const packageNames = new Set<string>();

for (const file of stagedFiles) {
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
