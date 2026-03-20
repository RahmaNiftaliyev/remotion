import path from 'node:path';
import type {Compiler} from 'webpack';

type TimeInfoEntry =
	| {
			safeTime: number;
			timestamp?: number;
			accuracy?: number;
	  }
	| 'ignore'
	| null;

type WatchCallback = (
	err: null | Error,
	fileTimestamps?: Map<string, TimeInfoEntry>,
	dirTimestamps?: Map<string, TimeInfoEntry>,
	changedFiles?: Set<string>,
	removedFiles?: Set<string>,
) => void;

type CallbackUndelayed = (fileName: string, changeTime: number) => void;

type Watcher = {
	close: () => void;
	pause: () => void;
	getAggregatedRemovals?: () => Set<string>;
	getAggregatedChanges?: () => Set<string>;
	getFileTimeInfoEntries: () => Map<string, TimeInfoEntry>;
	getContextTimeInfoEntries: () => Map<string, TimeInfoEntry>;
	getInfo?: () => {
		changes: Set<string>;
		removals: Set<string>;
		fileTimeInfoEntries: Map<string, TimeInfoEntry>;
		contextTimeInfoEntries: Map<string, TimeInfoEntry>;
	};
};

// NodeWatchFileSystem has a .watcher (Watchpack) with EventEmitter methods
type NodeWatchFileSystem = {
	watcher: {
		once: (event: string, listener: (...args: unknown[]) => void) => void;
		pause: () => void;
		paused: boolean;
	};
	inputFileSystem: {
		purge?: (item: string) => void;
	};
	watch: (
		files: Iterable<string>,
		directories: Iterable<string>,
		missing: Iterable<string>,
		startTime: number,
		options: Record<string, unknown>,
		callback: WatchCallback,
		callbackUndelayed: CallbackUndelayed,
	) => Watcher;
};

export class WatchIgnoreNextChangePlugin {
	private filesToIgnore = new Set<string>();
	private dirsToIgnore = new Set<string>();
	private snapshotFileTimestamps = new Map<string, TimeInfoEntry>();
	private snapshotDirTimestamps = new Map<string, TimeInfoEntry>();
	private currentWatcher: Watcher | null = null;

	ignoreNextChange(file: string): void {
		this.filesToIgnore.add(file);
		const dir = path.dirname(file);
		this.dirsToIgnore.add(dir);

		// Snapshot current timestamps from the watcher BEFORE the file is written
		if (this.currentWatcher) {
			const fileEntries = this.currentWatcher.getFileTimeInfoEntries();
			const fileTs = fileEntries.get(file);
			if (fileTs !== undefined) {
				this.snapshotFileTimestamps.set(file, fileTs);
			}

			const dirEntries = this.currentWatcher.getContextTimeInfoEntries();
			const dirTs = dirEntries.get(dir);
			if (dirTs !== undefined) {
				this.snapshotDirTimestamps.set(dir, dirTs);
			}
		}
	}

	unignoreNextChange(file: string): void {
		this.filesToIgnore.delete(file);
		const dir = path.dirname(file);
		this.dirsToIgnore.delete(dir);
		this.snapshotFileTimestamps.delete(file);
		this.snapshotDirTimestamps.delete(dir);
	}

	apply(compiler: Compiler): void {
		compiler.hooks.afterEnvironment.tap('WatchIgnoreNextChangePlugin', () => {
			const wfs = compiler.watchFileSystem as unknown as NodeWatchFileSystem;
			if (!wfs?.watch) {
				return;
			}

			const originalWatch = wfs.watch.bind(wfs);

			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const self = this;

			wfs.watch = (
				files,
				directories,
				missing,
				startTime,
				options,
				callback,
				callbackUndelayed,
			) => {
				const wrappedCallbackUndelayed: CallbackUndelayed = (
					fileName,
					changeTime,
				) => {
					if (
						self.filesToIgnore.has(fileName) ||
						self.dirsToIgnore.has(fileName)
					) {
						return;
					}

					callbackUndelayed(fileName, changeTime);
				};

				const wrappedCallback: WatchCallback = (
					err,
					fileTimestamps,
					dirTimestamps,
					changedFiles,
					removedFiles,
				) => {
					const hasIgnoredFiles = self.filesToIgnore.size > 0;

					if (fileTimestamps) {
						for (const file of [...self.filesToIgnore]) {
							const wasInChanged = changedFiles?.has(file) ?? false;
							if (wasInChanged) {
								changedFiles!.delete(file);
							}

							const prev = self.snapshotFileTimestamps.get(file);
							if (prev !== undefined) {
								fileTimestamps.set(file, prev);
							}

							if (wasInChanged) {
								self.filesToIgnore.delete(file);
								self.snapshotFileTimestamps.delete(file);
							}
						}
					}

					if (dirTimestamps) {
						for (const dir of [...self.dirsToIgnore]) {
							const wasInChanged = changedFiles?.has(dir) ?? false;
							if (wasInChanged) {
								changedFiles!.delete(dir);
							}

							const prev = self.snapshotDirTimestamps.get(dir);
							if (prev !== undefined) {
								dirTimestamps.set(dir, prev);
							}

							if (wasInChanged) {
								self.dirsToIgnore.delete(dir);
								self.snapshotDirTimestamps.delete(dir);
							}
						}
					}

					if (removedFiles) {
						for (const file of self.filesToIgnore) {
							removedFiles.delete(file);
						}

						for (const dir of self.dirsToIgnore) {
							removedFiles.delete(dir);
						}
					}

					const remainingChanges = changedFiles?.size ?? 0;
					const remainingRemovals = removedFiles?.size ?? 0;

					if (
						hasIgnoredFiles &&
						remainingChanges === 0 &&
						remainingRemovals === 0
					) {
						// Don't call the callback — that would trigger _invalidate() → compile().
						// Instead, re-register the watchpack listeners and unpause,
						// so the watch loop stays alive for future changes.
						// NodeWatchFileSystem uses:
						//   this.watcher.once("change", callbackUndelayed)
						//   this.watcher.once("aggregated", (changes, removals) => { this.watcher.pause(); callback(...) })
						// After "aggregated" fires, the watcher is paused and the .once listeners are consumed.
						// We need to restore them.
						const watchpack = wfs.watcher;
						if (watchpack) {
							watchpack.once(
								'change',
								wrappedCallbackUndelayed as (...args: unknown[]) => void,
							);
							watchpack.once('aggregated', (...args: unknown[]) => {
								const changes = args[0] as Set<string>;
								const removals = args[1] as Set<string>;
								watchpack.pause();
								const fs = wfs.inputFileSystem;
								if (fs?.purge) {
									for (const item of changes) {
										fs.purge(item);
									}

									for (const item of removals) {
										fs.purge(item);
									}
								}

								const fetchedFileTimestamps = new Map<string, TimeInfoEntry>();
								const fetchedContextTimestamps = new Map<
									string,
									TimeInfoEntry
								>();
								(
									watchpack as unknown as {
										collectTimeInfoEntries: (
											a: Map<string, TimeInfoEntry>,
											b: Map<string, TimeInfoEntry>,
										) => void;
									}
								).collectTimeInfoEntries(
									fetchedFileTimestamps,
									fetchedContextTimestamps,
								);

								wrappedCallback(
									null,
									fetchedFileTimestamps,
									fetchedContextTimestamps,
									changes,
									removals,
								);
							});
							watchpack.paused = false;
						} else {
							callback(
								err,
								fileTimestamps,
								dirTimestamps,
								changedFiles,
								removedFiles,
							);
						}

						return;
					}

					callback(
						err,
						fileTimestamps,
						dirTimestamps,
						changedFiles,
						removedFiles,
					);
				};

				const watcher = originalWatch(
					files,
					directories,
					missing,
					startTime,
					options,
					wrappedCallback,
					wrappedCallbackUndelayed,
				);

				self.currentWatcher = watcher;

				const originalGetFileTimeInfoEntries =
					watcher.getFileTimeInfoEntries.bind(watcher);
				watcher.getFileTimeInfoEntries = () => {
					const entries = originalGetFileTimeInfoEntries();
					for (const file of self.filesToIgnore) {
						const prev = self.snapshotFileTimestamps.get(file);
						if (prev !== undefined) {
							entries.set(file, prev);
						}
					}

					return entries;
				};

				const originalGetContextTimeInfoEntries =
					watcher.getContextTimeInfoEntries.bind(watcher);
				watcher.getContextTimeInfoEntries = () => {
					const entries = originalGetContextTimeInfoEntries();
					for (const dir of self.dirsToIgnore) {
						const prev = self.snapshotDirTimestamps.get(dir);
						if (prev !== undefined) {
							entries.set(dir, prev);
						}
					}

					return entries;
				};

				if (watcher.getInfo) {
					const originalGetInfo = watcher.getInfo.bind(watcher);
					watcher.getInfo = () => {
						const info = originalGetInfo();
						for (const file of self.filesToIgnore) {
							info.changes.delete(file);
							const prev = self.snapshotFileTimestamps.get(file);
							if (prev !== undefined) {
								info.fileTimeInfoEntries.set(file, prev);
							}
						}

						for (const dir of self.dirsToIgnore) {
							info.changes.delete(dir);
							const prev = self.snapshotDirTimestamps.get(dir);
							if (prev !== undefined) {
								info.contextTimeInfoEntries.set(dir, prev);
							}
						}

						return info;
					};
				}

				if (watcher.getAggregatedChanges) {
					const originalGetAggregatedChanges =
						watcher.getAggregatedChanges.bind(watcher);
					watcher.getAggregatedChanges = () => {
						const changes = originalGetAggregatedChanges();
						for (const file of self.filesToIgnore) {
							changes.delete(file);
						}

						for (const dir of self.dirsToIgnore) {
							changes.delete(dir);
						}

						return changes;
					};
				}

				return watcher;
			};
		});
	}
}
