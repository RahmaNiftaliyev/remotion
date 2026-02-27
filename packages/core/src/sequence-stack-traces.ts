import React from 'react';

export type ResolvedStackLocation = {
	line: number | null;
	column: number | null;
	source: string | null;
};

export type SequenceStackTracesContextType = {
	resolvedStacks: Record<string, ResolvedStackLocation | null>;
};

export const SequenceStackTracesContext =
	React.createContext<SequenceStackTracesContextType>({
		resolvedStacks: {},
	});

export type UpdateResolvedStackTraceFn = (
	stack: string,
	location: ResolvedStackLocation | null,
) => void;

export const SequenceStackTracesUpdateContext =
	React.createContext<UpdateResolvedStackTraceFn>(() => {});
