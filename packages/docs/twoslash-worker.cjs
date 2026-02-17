const {createRequire} = require('module');
const {writeFileSync, existsSync, mkdirSync, readFileSync} = require('fs');
const {dirname, join} = require('path');

// Resolve from the docusaurus-plugin which has these as dependencies
const pluginDir = join(__dirname, '..', 'docusaurus-plugin');
const pluginRequire = createRequire(join(pluginDir, 'package.json'));
const {runTwoSlash} = pluginRequire('shiki-twoslash');
const {ScriptTarget, ModuleKind} = pluginRequire('typescript');

const settings = {
	defaultCompilerOptions: {
		types: ['node'],
		target: ScriptTarget.ESNext,
		module: ModuleKind.ESNext,
	},
};

// Read work items from the file passed as argument
const workFile = process.argv[2];
const items = JSON.parse(readFileSync(workFile, 'utf8'));

let completed = 0;
let errors = 0;
const timings = [];

for (const item of items) {
	const start = performance.now();
	try {
		const results = runTwoSlash(item.code, item.lang, settings);
		const dir = dirname(item.cachePath);
		if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
		writeFileSync(item.cachePath, JSON.stringify(results), 'utf8');
		completed++;
		timings.push({
			cachePath: item.cachePath,
			ms: Math.round(performance.now() - start),
		});
	} catch (error) {
		errors++;
		timings.push({
			cachePath: item.cachePath,
			ms: Math.round(performance.now() - start),
			error: error.message.slice(0, 200),
		});
	}

	// Report progress every 10 items
	if ((completed + errors) % 10 === 0) {
		process.stdout.write(
			JSON.stringify({completed, errors, total: items.length, timings}) +
				'\n',
		);
	}
}

// Final report
process.stdout.write(
	JSON.stringify({
		completed,
		errors,
		total: items.length,
		done: true,
		timings,
	}) + '\n',
);
