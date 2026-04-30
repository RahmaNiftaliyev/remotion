/**
 * Minimal WebGPU + HtmlInCanvas sample (same code as /docs/remotion/html-in-canvas).
 */
import React, {useCallback, useRef} from 'react';
import {
	AbsoluteFill,
	HtmlInCanvas,
	HtmlInCanvasOnInit,
	HtmlInCanvasOnPaint,
	useVideoConfig,
} from 'remotion';

// Narrow types so `OffscreenCanvas#getContext('webgpu')` and
// `GPUQueue#copyElementImageToTexture` typecheck (see compose-webgpu.tsx).
type GpuCanvasContext = {
	configure(d: {
		device: GPUDevice;
		format: string;
		alphaMode: 'premultiplied' | 'opaque';
	}): void;
	getCurrentTexture(): GPUTexture;
};

type GpuNavigator = {
	requestAdapter(): Promise<GPUAdapter | null>;
	getPreferredCanvasFormat(): string;
};

const WGSL = `
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}
@vertex
fn vs(@builtin(vertex_index) i: u32) -> VsOut {
  var p = array(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  var uv = array(vec2f(0.0, 2.0), vec2f(0.0, 0.0), vec2f(2.0, 0.0));
  var o: VsOut;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = uv[i];
  return o;
}
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;
@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  return textureSample(tex, samp, in.uv);
}
`;

type GpuState = {
	device: GPUDevice;
	context: GpuCanvasContext;
	pipeline: GPURenderPipeline;
	sampler: GPUSampler;
	texture: GPUTexture;
	bindGroup: GPUBindGroup;
	width: number;
	height: number;
};

export const HtmlInCanvasDocsMinimalWebGPU: React.FC = () => {
	const {width, height} = useVideoConfig();
	const gpuRef = useRef<GpuState | null>(null);

	const onInit: HtmlInCanvasOnInit = useCallback(async ({canvas}) => {
		if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
			throw new Error('WebGPU not available');
		}

		const gpuApi = (navigator as unknown as {gpu: GpuNavigator}).gpu;
		const adapter = await gpuApi.requestAdapter();
		if (!adapter) {
			throw new Error('No WebGPU adapter');
		}

		const device = await adapter.requestDevice();
		const context = (
			canvas as unknown as {
				getContext(id: 'webgpu'): GpuCanvasContext | null;
			}
		).getContext('webgpu');
		if (!context) {
			throw new Error('WebGPU context unavailable on OffscreenCanvas');
		}

		const format = gpuApi.getPreferredCanvasFormat() as GPUTextureFormat;
		context.configure({device, format, alphaMode: 'premultiplied'});

		const module = device.createShaderModule({code: WGSL});
		const pipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: {module, entryPoint: 'vs'},
			fragment: {
				module,
				entryPoint: 'fs',
				targets: [{format}] as GPUColorTargetState[],
			},
			primitive: {topology: 'triangle-list'},
		});

		const TextureUsage = (
			globalThis as unknown as {
				GPUTextureUsage: {COPY_DST: number; TEXTURE_BINDING: number};
			}
		).GPUTextureUsage;

		const texture = device.createTexture({
			size: {width: canvas.width, height: canvas.height},
			format: 'rgba8unorm',
			usage: TextureUsage.COPY_DST | TextureUsage.TEXTURE_BINDING,
		});

		const sampler = device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
		});

		const bindGroup = device.createBindGroup({
			layout: (
				pipeline as unknown as {
					getBindGroupLayout(i: number): GPUBindGroupLayout;
				}
			).getBindGroupLayout(0),
			entries: [
				{binding: 0, resource: sampler},
				{binding: 1, resource: texture.createView()},
			],
		});

		gpuRef.current = {
			device,
			context,
			pipeline,
			sampler,
			texture,
			bindGroup,
			width: canvas.width,
			height: canvas.height,
		};

		return () => {
			texture.destroy();
			gpuRef.current = null;
		};
	}, []);

	const onPaint: HtmlInCanvasOnPaint = useCallback(({elementImage}) => {
		const gpu = gpuRef.current;
		if (!gpu) {
			return;
		}

		const {device, context, pipeline, texture, bindGroup} = gpu;

		const queue = device.queue as unknown as {
			copyElementImageToTexture(
				source: unknown,
				width: number,
				height: number,
				destination: {texture: GPUTexture},
			): void;
		};
		queue.copyElementImageToTexture(elementImage, gpu.width, gpu.height, {
			texture,
		});

		const encoder = device.createCommandEncoder();
		const view = context.getCurrentTexture().createView();
		const pass = encoder.beginRenderPass({
			colorAttachments: [
				{
					view,
					clearValue: {r: 0, g: 0, b: 0, a: 0},
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
		});
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(3);
		pass.end();
		device.queue.submit([encoder.finish()]);
	}, []);

	return (
		<HtmlInCanvas
			width={width}
			height={height}
			onInit={onInit}
			onPaint={onPaint}
		>
			<AbsoluteFill
				style={{
					justifyContent: 'center',
					alignItems: 'center',
					fontSize: 120,
				}}
			>
				<h1>Hello</h1>
			</AbsoluteFill>
		</HtmlInCanvas>
	);
};
