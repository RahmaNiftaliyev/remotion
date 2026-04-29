import type {ComponentType} from 'react';
import type React from 'react';

export type PresentationDirection = 'entering' | 'exiting';

export type TransitionTiming = {
	getDurationInFrames: (options: {fps: number}) => number;
	getProgress: (options: {frame: number; fps: number}) => number;
};

export type TransitionSeriesTransitionProps<
	PresentationProps extends Record<string, unknown>,
> = {
	timing: TransitionTiming;
	presentation?: TransitionPresentation<PresentationProps>;
};

type LooseComponentType<T> = ComponentType<T> | ((props: T) => React.ReactNode);

export type OverlayMethods = {
	draw: (
		prevImage: ElementImage | null,
		nextImage: ElementImage | null,
		progress: number,
	) => void;
	clear: () => void;
};

export type MandatoryOverlayProps = {
	readonly refToMethods: React.RefObject<OverlayMethods | null>;
};

export type OverlayComponentProps<
	PresentationProps extends Record<string, unknown>,
> = Pick<
	TransitionPresentationComponentProps<PresentationProps>,
	'presentationProgress' | 'passedProps'
> &
	MandatoryOverlayProps;

export type TransitionPresentation<
	PresentationProps extends Record<string, unknown>,
> = {
	component: LooseComponentType<
		TransitionPresentationComponentProps<PresentationProps>
	>;
	props: PresentationProps;
	requiresOverlay?: LooseComponentType<
		OverlayComponentProps<PresentationProps>
	>;
};

export type TransitionPresentationComponentProps<
	PresentationProps extends Record<string, unknown>,
> = {
	presentationProgress: number;
	children: React.ReactNode;
	presentationDirection: PresentationDirection;
	passedProps: PresentationProps;
	presentationDurationInFrames: number;
	onElementImage: (elementImage: ElementImage, progress: number) => void;
};

export type TransitionSeriesOverlayProps = {
	readonly durationInFrames: number;
	readonly offset?: number;
	readonly children: React.ReactNode;
	/**
	 * @deprecated For internal use only
	 */
	readonly stack?: string;
};
