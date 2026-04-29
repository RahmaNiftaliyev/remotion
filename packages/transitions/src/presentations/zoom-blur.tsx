import {
	useMemo,
	useRef,
	useLayoutEffect,
	useImperativeHandle,
	useState,
} from 'react';
import type {RefObject} from 'react';
import type {EffectsProp} from 'remotion';
import {
	AbsoluteFill,
	Internals,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {
	OverlayComponentProps,
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '../types';

export type ZoomBlurProps = {
	rotation?: number;
	_experimentalEffects?: EffectsProp;
};

export const ZoomBlurPresentation: React.FC<
	TransitionPresentationComponentProps<ZoomBlurProps>
> = ({
	children,
	onElementImage,
	presentationProgress,
	presentationDirection,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasSubtreeStyle: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
		};
	}, []);

	const presentationProgressRef = useRef(presentationProgress);
	presentationProgressRef.current = presentationProgress;

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		canvas.layoutSubtree = true;

		const onPaint = () => {
			const firstChild = canvas.firstChild as HTMLElement;

			if (!firstChild) {
				return;
			}

			const isFrontend =
				presentationProgressRef.current === 0 &&
				presentationDirection === 'exiting';
			const isBackend =
				presentationProgressRef.current === 1 &&
				presentationDirection === 'entering';

			const elementImage = canvas.captureElementImage(firstChild);
			onElementImage(elementImage, presentationProgressRef.current);

			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('Failed to get context');
			}

			if (isBackend || isFrontend) {
				context.drawElementImage(elementImage, 0, 0);
			} else {
				// Since we also need to wait for the exit component
				// this can be 1 frame off, so we delay resetting
				// the canvas a bit
				requestAnimationFrame(() => {
					context.reset();
				});
			}
		};

		canvas.addEventListener('paint', onPaint);

		return () => {
			canvas.removeEventListener('paint', onPaint);
		};
	}, [onElementImage, presentationDirection]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		canvas.requestPaint?.();
	}, [presentationProgress]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		// Size the canvas grid to match the device scale factor to prevent blurriness.
		const observer = new ResizeObserver(([entry]) => {
			canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
			canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
		});
		observer.observe(canvas, {box: 'device-pixel-content-box'});
		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<AbsoluteFill>
			<canvas ref={canvasRef} style={canvasSubtreeStyle}>
				{children}
			</canvas>
		</AbsoluteFill>
	);
};

export type GLState = {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	prevTex: WebGLTexture;
	nextTex: WebGLTexture;
	uTime: WebGLUniformLocation | null;
	uPrev: WebGLUniformLocation | null;
	uNext: WebGLUniformLocation | null;
	uAspect: WebGLUniformLocation | null;
	uMaxAngle: WebGLUniformLocation | null;
};

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
	v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
	gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_prev;
uniform sampler2D u_next;
uniform float u_time;
uniform float u_aspect;
uniform float u_max_angle;

in vec2 v_uv;
out vec4 outColor;

const int SAMPLES = 16;
const float STRENGTH = 0.35;

vec2 transformUV(vec2 uv, float angle, float scale) {
	vec2 p = uv - 0.5;
	p.x *= u_aspect;
	p /= scale;
	float c = cos(-angle);
	float s = sin(-angle);
	p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
	p.x /= u_aspect;
	return p + 0.5;
}

float coverScale(float angle) {
	float c = abs(cos(angle));
	float s = abs(sin(angle));
	float ar = max(u_aspect, 1.0 / u_aspect);
	return c + ar * s;
}

vec4 zoomBlur(sampler2D tex, vec2 uv, float strength) {
	vec2 dir = uv - 0.5;
	vec4 acc = vec4(0.0);
	for (int i = 0; i < SAMPLES; i++) {
		float t = float(i) / float(SAMPLES - 1);
		float scale = 1.0 - strength * t;
		acc += texture(tex, 0.5 + dir * scale);
	}
	return acc / float(SAMPLES);
}

void main() {
	float mixT = clamp(u_time, 0.0, 1.0);

	float nextAngle = u_max_angle * mixT;
	float prevAngle = -u_max_angle * (1.0 - mixT);

	vec2 prevUV = transformUV(v_uv, prevAngle, coverScale(prevAngle));
	vec2 nextUV = transformUV(v_uv, nextAngle, coverScale(nextAngle));

	vec4 prev = zoomBlur(u_prev, prevUV, STRENGTH * (1.0 - mixT));
	vec4 next = zoomBlur(u_next, nextUV, STRENGTH * mixT);
	outColor = mix(prev, next, (1.0 - mixT));
}`;

const compileShader = (
	gl: WebGL2RenderingContext,
	source: string,
	type: number,
): WebGLShader => {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error('Failed to create shader');
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Failed to compile shader: ${log}`);
	}

	return shader;
};

const createProgram = (gl: WebGL2RenderingContext): WebGLProgram => {
	const program = gl.createProgram();
	if (!program) {
		throw new Error('Failed to create WebGL program');
	}

	const vs = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
	const fs = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Failed to link program: ${log}`);
	}

	return program;
};

const createTexture = (gl: WebGL2RenderingContext): WebGLTexture => {
	const tex = gl.createTexture();
	if (!tex) {
		throw new Error('Failed to create texture');
	}

	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array([0, 0, 0, 0]),
	);
	return tex;
};

export const init = (
	canvas: OffscreenCanvas,
	stateRef: RefObject<GLState | null>,
) => {
	const gl = canvas.getContext('webgl2', {premultipliedAlpha: true});
	if (!gl) {
		return () => {};
	}

	const program = createProgram(gl);
	const prevTex = createTexture(gl);
	const nextTex = createTexture(gl);

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const aPos = gl.getAttribLocation(program, 'a_pos');
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

	stateRef.current = {
		gl,
		program,
		prevTex,
		nextTex,
		uTime: gl.getUniformLocation(program, 'u_time'),
		uPrev: gl.getUniformLocation(program, 'u_prev'),
		uNext: gl.getUniformLocation(program, 'u_next'),
		uAspect: gl.getUniformLocation(program, 'u_aspect'),
		uMaxAngle: gl.getUniformLocation(program, 'u_max_angle'),
	};

	return () => {
		gl.deleteProgram(program);
		gl.deleteTexture(prevTex);
		gl.deleteTexture(nextTex);
		stateRef.current = null;
	};
};

export const clear = ({state}: {state: GLState}) => {
	const {gl} = state;
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
};

export const draw = ({
	prevImage,
	nextImage,
	state,
	width,
	height,
	time,
	rotation,
}: {
	prevImage: ElementImage | null;
	nextImage: ElementImage | null;
	state: GLState;
	width: number;
	height: number;
	time: number;
	rotation: number;
}) => {
	const {
		gl,
		program,
		prevTex,
		nextTex,
		uTime,
		uPrev,
		uNext,
		uAspect,
		uMaxAngle,
	} = state;
	if (
		!prevImage ||
		!nextImage ||
		prevImage.width === 0 ||
		prevImage.height === 0 ||
		nextImage.width === 0 ||
		nextImage.height === 0
	) {
		return;
	}

	gl.viewport(0, 0, width, height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(program);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, prevTex);
	if (prevImage) {
		gl.texElementImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			prevImage,
		);
	}

	gl.uniform1i(uPrev, 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, nextTex);
	if (nextImage) {
		gl.texElementImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			nextImage,
		);
	}

	gl.uniform1i(uNext, 1);

	gl.uniform1f(uTime, time);
	gl.uniform1f(uAspect, width / height);
	gl.uniform1f(uMaxAngle, rotation);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

export const ShaderOverlay: React.FC<OverlayComponentProps<ZoomBlurProps>> = ({
	refToMethods,
	passedProps: {rotation = Math.PI / 6, _experimentalEffects = []},
}) => {
	const {width, height} = useVideoConfig();
	const [offscreenCanvas] = useState(() => new OffscreenCanvas(width, height));
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<GLState | null>(null);
	const frame = useCurrentFrame();
	const frameRef = useRef(frame);
	frameRef.current = frame;

	useLayoutEffect(() => {
		const cleanup = init(offscreenCanvas, stateRef);

		return () => {
			cleanup();
		};
	}, [offscreenCanvas]);

	const chainState = Internals.useEffectChainState();

	useImperativeHandle(refToMethods, () => {
		return {
			draw: (
				prevImage: ElementImage | null,
				nextImage: ElementImage | null,
				progress: number,
			) => {
				if (!canvasRef.current || !stateRef.current) {
					return;
				}

				draw({
					prevImage,
					nextImage,
					state: stateRef.current,
					width,
					height,
					time: progress,
					rotation,
				});
				offscreenCanvas.width = width;
				offscreenCanvas.height = height;
				Internals.runEffectChain({
					state: chainState.get(width, height)!,
					source: offscreenCanvas,
					effects: _experimentalEffects,
					frame: frameRef.current,
					width,
					height,
					output: canvasRef.current,
				});
			},
			clear: () => {
				if (!stateRef.current) {
					return;
				}

				clear({state: stateRef.current});
			},
		};
	});

	const outerStyle: React.CSSProperties = useMemo(() => {
		return {
			pointerEvents: 'none',
		};
	}, []);

	const innerStyle: React.CSSProperties = useMemo(() => {
		return {
			width: '100%',
			height: '100%',
		};
	}, []);

	return (
		<AbsoluteFill style={outerStyle}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={innerStyle}
			/>
		</AbsoluteFill>
	);
};

export const zoomBlur = (
	props: ZoomBlurProps,
): TransitionPresentation<ZoomBlurProps> => {
	return {
		component: ZoomBlurPresentation,
		props: props ?? {},
		overlay: ShaderOverlay,
	};
};
