import React from 'react';
import {AbsoluteFill} from 'remotion';

export const Minimal: React.FC = () => {
	return (
		<AbsoluteFill style={{backgroundColor: '#111', justifyContent: 'center', alignItems: 'center'}}>
			<div style={{color: '#fff', fontFamily: 'sans-serif', fontSize: 24}}>minimal repro</div>
		</AbsoluteFill>
	);
};
