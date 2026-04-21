type Waiter = {
	getPriority: () => number;
	fn: () => Promise<unknown>;
	resolve: (value: unknown) => void;
	reject: (err: unknown) => void;
};

const CONCURRENCY = 1;

const waiters: Waiter[] = [];
let running = 0;

const processNext = (): void => {
	if (running >= CONCURRENCY || waiters.length === 0) {
		return;
	}

	let bestIndex = 0;
	let bestPriority = waiters[0].getPriority();
	for (let i = 1; i < waiters.length; i++) {
		const priority = waiters[i].getPriority();
		if (priority < bestPriority) {
			bestPriority = priority;
			bestIndex = i;
		}
	}

	const [next] = waiters.splice(bestIndex, 1);
	running++;

	next.fn().then(
		(value) => {
			running--;
			next.resolve(value);
			processNext();
		},
		(err) => {
			running--;
			next.reject(err);
			processNext();
		},
	);
};

export const waitForTurn = <T>({
	getPriority,
	fn,
}: {
	getPriority: () => number;
	fn: () => Promise<T>;
}): Promise<T> => {
	return new Promise<T>((resolve, reject) => {
		waiters.push({
			getPriority,
			fn,
			resolve: resolve as (value: unknown) => void,
			reject,
		});
		processNext();
	});
};
