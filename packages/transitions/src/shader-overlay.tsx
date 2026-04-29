import React, {useImperativeHandle, useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {draw, init, type GLState} from './presentations/zoom-blur';

export type Methods = {
	draw: (
		prevImage: ElementImage | null,
		nextImage: ElementImage | null,
	) => void;
};

type Props = {
	readonly refToMethods: React.RefObject<Methods | null>;
};

export const ShaderOverlay: React.FC<Props> = ({refToMethods}) => {
	const {width, height} = useVideoConfig();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<GLState | null>(null);
	const timeRef = useRef(0);

	useLayoutEffect(() => {
		const cleanup = init(canvasRef.current!, stateRef);

		return () => {
			cleanup();
		};
	}, []);

	useImperativeHandle(refToMethods, () => {
		return {
			draw: (
				prevImage: ElementImage | null,
				nextImage: ElementImage | null,
			) => {
				if (!canvasRef.current || !stateRef.current) {
					return;
				}

				draw(
					prevImage,
					nextImage,
					stateRef.current,
					width,
					height,
					timeRef.current,
				);
			},
		};
	});

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={{width: '100%', height: '100%'}}
			/>
		</AbsoluteFill>
	);
};
