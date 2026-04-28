import {useEffect, useRef} from 'react';
import {ENABLE_EFFECTS} from '../enable-effects.js';
import type {EffectChainState} from './run-effect-chain.js';
import {
	cleanupEffectChainState,
	createEffectChainState,
} from './run-effect-chain.js';

export const useEffectChainState = (
	width: number,
	height: number,
): EffectChainState | null => {
	const chainStateRef = useRef<EffectChainState | null>(null);
	const sizeRef = useRef<{width: number; height: number} | null>(null);

	if (ENABLE_EFFECTS) {
		if (
			!sizeRef.current ||
			sizeRef.current.width !== width ||
			sizeRef.current.height !== height
		) {
			if (chainStateRef.current) {
				cleanupEffectChainState(chainStateRef.current);
			}

			chainStateRef.current = createEffectChainState(width, height);
			sizeRef.current = {width, height};
		}
	} else if (chainStateRef.current) {
		cleanupEffectChainState(chainStateRef.current);
		chainStateRef.current = null;
		sizeRef.current = null;
	}

	useEffect(() => {
		return () => {
			if (chainStateRef.current) {
				cleanupEffectChainState(chainStateRef.current);
			}
		};
	}, []);

	if (!ENABLE_EFFECTS) {
		return null;
	}

	return chainStateRef.current;
};
