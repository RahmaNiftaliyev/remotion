/**
 * Nested `<HtmlInCanvas>` platform test: **inner = Canvas 2D**, **outer = WebGL**
 *
 * Use this to compare behavior with an inner WebGL pass. The 2D path uses
 * `drawElementImage` with a 2D transform (rotate) plus a CSS filter for a
 * clearly “2D-only” look.
 */
import React, {useCallback, useRef} from 'react';
import {
	HtmlInCanvas,
	type HtmlInCanvasOnInit,
	type HtmlInCanvasOnPaint,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

type GpuState = {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	uMatrix: WebGLUniformLocation | null;
	uTex: WebGLUniformLocation | null;
	texture: WebGLTexture;
	vao: WebGLVertexArrayObject;
	buffer: WebGLBuffer;
};

const VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform mat3 u_matrix;
out vec2 v_uv;
void main() {
  vec3 p = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FS_VIGNETTE = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() {
  vec2 p = v_uv * 2.0 - 1.0;
  float edge = 1.0 - dot(p, p) * 0.45;
  vec4 c = texture(u_tex, v_uv);
  o = vec4(c.rgb * edge, c.a);
}`;

function compileGlsl(gl: WebGL2RenderingContext, vs: string, fs: string) {
	const vert = gl.createShader(gl.VERTEX_SHADER)!;
	gl.shaderSource(vert, vs);
	gl.compileShader(vert);
	const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
	gl.shaderSource(frag, fs);
	gl.compileShader(frag);
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	gl.deleteShader(vert);
	gl.deleteShader(frag);
	return program;
}

const QUAD = new Float32Array([
	-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
]);

function initOuterGpu(
	canvas: OffscreenCanvas,
	fragmentSource: string,
): {gpu: GpuState; cleanup: () => void} {
	const gl = canvas.getContext('webgl2', {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
	});
	if (!gl) {
		throw new Error('WebGL2 unavailable');
	}

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	const program = compileGlsl(gl, VS, fragmentSource);
	const uMatrix = gl.getUniformLocation(program, 'u_matrix');
	const uTex = gl.getUniformLocation(program, 'u_tex');

	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	const buffer = gl.createBuffer()!;
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

	const vao = gl.createVertexArray()!;
	gl.bindVertexArray(vao);
	const locPos = gl.getAttribLocation(program, 'a_pos');
	const locUv = gl.getAttribLocation(program, 'a_uv');
	gl.enableVertexAttribArray(locPos);
	gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0);
	gl.enableVertexAttribArray(locUv);
	gl.vertexAttribPointer(locUv, 2, gl.FLOAT, false, 16, 8);

	const gpu: GpuState = {
		gl,
		program,
		uMatrix,
		uTex,
		texture,
		vao,
		buffer,
	};

	return {
		gpu,
		cleanup: () => {
			gl.deleteProgram(program);
			gl.deleteTexture(texture);
			gl.deleteVertexArray(vao);
			gl.deleteBuffer(buffer);
		},
	};
}

export const HtmlInCanvasNestedWebGL: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const outerGpuRef = useRef<GpuState | null>(null);

	const innerW = Math.floor(width * 0.58);
	const innerH = Math.floor(height * 0.58);
	const left = Math.floor((width - innerW) / 2);
	const top = Math.floor((height - innerH) / 2);

	const rotation = interpolate(
		frame,
		[0, durationInFrames - 1],
		[0, Math.PI * 2],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		},
	);

	const innerOnPaint: HtmlInCanvasOnPaint = useCallback(
		({canvas, element, elementImage}) => {
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				throw new Error(
					'Nested 2D test: failed to get 2d context on offscreen',
				);
			}

			ctx.reset();
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// 2D-only extra: filter runs on the rasterized element image (after layout).
			ctx.filter = 'saturate(1.6) contrast(1.08)';

			ctx.save();
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate(rotation);
			ctx.translate(-canvas.width / 2, -canvas.height / 2);

			const transform = ctx.drawElementImage(
				elementImage,
				0,
				0,
				canvas.width,
				canvas.height,
			);
			element.style.transform = transform.toString();

			ctx.restore();
			ctx.filter = 'none';
		},
		[rotation],
	);

	const outerOnInit: HtmlInCanvasOnInit = useCallback(({canvas}) => {
		const {gpu, cleanup} = initOuterGpu(canvas, FS_VIGNETTE);
		outerGpuRef.current = gpu;
		return () => {
			cleanup();
			outerGpuRef.current = null;
		};
	}, []);

	const outerOnPaint: HtmlInCanvasOnPaint = useCallback(({elementImage}) => {
		const gpu = outerGpuRef.current;
		if (!gpu) {
			return;
		}

		const {gl} = gpu;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.useProgram(gpu.program);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, gpu.texture);
		gl.texElementImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			elementImage,
		);

		if (gpu.uTex) {
			gl.uniform1i(gpu.uTex, 0);
		}

		const id = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
		if (gpu.uMatrix) {
			gl.uniformMatrix3fv(gpu.uMatrix, false, id);
		}

		gl.bindVertexArray(gpu.vao);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}, []);

	return (
		<HtmlInCanvas
			width={width}
			height={height}
			onInit={outerOnInit}
			onPaint={outerOnPaint}
		>
			<div
				style={{
					position: 'relative',
					width,
					height,
					backgroundColor: '#151528',
				}}
			>
				<HtmlInCanvas
					width={innerW}
					height={innerH}
					onPaint={innerOnPaint}
					style={{
						position: 'absolute',
						left,
						top,
					}}
				>
					<div
						style={{
							width: '100%',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'white',
							fontSize: Math.min(72, innerW / 10),
							fontFamily: 'system-ui, sans-serif',
							fontWeight: 600,
							textAlign: 'center',
							backgroundColor: '#2d2640',
						}}
					>
						Inner 2D rotate + saturate / outer WebGL vignette
					</div>
				</HtmlInCanvas>
			</div>
		</HtmlInCanvas>
	);
};
