type Waiter = {
	getPriority: () => number;
	getStale: () => boolean;
	fn: () => Promise<unknown>;
	onDone: (result: unknown, triggerNext: () => void) => void;
	onError: (err: unknown, triggerNext: () => void) => void;
};

export class StaleWaiterError extends Error {
	constructor() {
		super('Waiter became stale before it got its turn');
		this.name = 'StaleWaiterError';
	}
}

const CONCURRENCY = 1;

const waiters: Waiter[] = [];
let running = 0;

const processNext = (): void => {
	console.log('processNext', running, waiters.length);
	if (running >= CONCURRENCY) {
		return;
	}

	for (let i = waiters.length - 1; i >= 0; i--) {
		if (waiters[i].getStale()) {
			const [stale] = waiters.splice(i, 1);
			stale.onError(new StaleWaiterError(), processNext);
			console.log('stale');
		}
	}

	if (waiters.length === 0) {
		console.log('no waiters');
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

	console.log('calling', bestPriority);
	next.fn().then(
		(value) => {
			console.log('onDone', value);
			running--;
			next.onDone(value, processNext);
		},
		(err) => {
			console.log('onError', err);

			running--;
			next.onError(err, processNext);
		},
	);
};

export const waitForTurn = <T>({
	getPriority,
	getStale,
	fn,
	onDone,
	onError,
}: {
	getPriority: () => number;
	getStale: () => boolean;
	fn: () => Promise<T>;
	onDone: (result: T, triggerNext: () => void) => void;
	onError: (err: unknown, triggerNext: () => void) => void;
}): void => {
	waiters.push({
		getPriority,
		getStale,
		fn,
		onDone: onDone as (result: unknown, triggerNext: () => void) => void,
		onError: onError as (err: unknown, triggerNext: () => void) => void,
	});
	processNext();
};
