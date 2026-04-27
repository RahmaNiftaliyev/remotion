import React, {useCallback, useEffect, useRef} from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	type HtmlInCanvasComposeParams,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {HtmlInCanvasScene} from './scene';

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

const FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() {
  o = texture(u_tex, vec2(v_uv.x, 1.0 - v_uv.y));
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

function ensureGpu(
	target: HTMLCanvasElement,
	ref: React.MutableRefObject<GpuState | null>,
): GpuState | null {
	if (ref.current) {
		return ref.current;
	}

	const gl = target.getContext('webgl2', {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
	});
	if (!gl) {
		return null;
	}

	const program = compileGlsl(gl, VS, FS);
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

	ref.current = {gl, program, uMatrix, uTex, texture, vao, buffer};
	return ref.current;
}

function disposeGpu(ref: React.MutableRefObject<GpuState | null>) {
	const g = ref.current;
	if (!g) {
		return;
	}

	const {gl} = g;
	gl.deleteProgram(g.program);
	gl.deleteTexture(g.texture);
	gl.deleteVertexArray(g.vao);
	gl.deleteBuffer(g.buffer);
	ref.current = null;
}

/** WebGL2 full-screen quad; shaders and textures memoized on a ref (see plan). Falls back to 2D blit when WebGL2 is unavailable. */
export const HtmlInCanvasComposeWebGL: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const gpuRef = useRef<GpuState | null>(null);

	const rotation = interpolate(
		frame,
		[0, durationInFrames - 1],
		[0, Math.PI * 2],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		},
	);

	useEffect(() => () => disposeGpu(gpuRef), []);

	const onCompose = useCallback(
		({source, target, width: w, height: h}: HtmlInCanvasComposeParams) => {
			const c = Math.cos(rotation);
			const s = Math.sin(rotation);
			const mat = new Float32Array([c, -s, 0, s, c, 0, 0, 0, 1]);

			const gpu = ensureGpu(target, gpuRef);
			if (!gpu) {
				const ctx = target.getContext('2d');
				if (!ctx) {
					return;
				}

				ctx.clearRect(0, 0, w, h);
				ctx.drawImage(source, 0, 0, w, h);
				return;
			}

			const {gl} = gpu;
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.useProgram(gpu.program);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, gpu.texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				source as TexImageSource,
			);

			if (gpu.uTex) {
				gl.uniform1i(gpu.uTex, 0);
			}

			if (gpu.uMatrix) {
				gl.uniformMatrix3fv(gpu.uMatrix, false, mat);
			}

			gl.bindVertexArray(gpu.vao);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		},
		[rotation],
	);

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<HtmlInCanvas width={width} height={height} onCompose={onCompose}>
				<HtmlInCanvasScene />
			</HtmlInCanvas>
		</AbsoluteFill>
	);
};
