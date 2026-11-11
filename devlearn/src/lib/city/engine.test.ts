import { describe, expect, it } from 'vitest';
import { createEngine, type RenderParams } from './engine.ts';

// city-standard.md P-1：1 枚を描く呼び出しが 40 回以下。
// 本物の WebGL2 は Node に無いので、呼ばれた関数を数えるだけの偽の文脈で engine を動かす（描画の中身は確かめない）。
function fakeGL() {
	const consts = new Map<string, number>();
	let next = 1;
	const c = (k: string) => {
		if (!consts.has(k)) consts.set(k, next++);
		return consts.get(k) as number;
	};
	const calls = { draw: 0 };
	const gl: Record<string, unknown> = new Proxy(
		{},
		{
			get(_t, k) {
				if (k === 'calls') return calls;
				if (typeof k !== 'string') return undefined;
				if (/^[A-Z0-9_]+$/.test(k)) return c(k);
				return (...a: unknown[]) => {
					if (k === 'drawArrays' || k === 'drawElements') calls.draw++;
					if (k === 'getParameter') return 4;
					if (k === 'getProgramParameter') return a[1] === c('ACTIVE_UNIFORMS') ? 0 : true;
					if (k === 'getShaderParameter') return true;
					if (k === 'getExtension') return {};
					if (k === 'checkFramebufferStatus') return c('FRAMEBUFFER_COMPLETE');
					if (k.startsWith('create')) return {};
					if (k === 'getUniformLocation') return {};
					return null;
				};
			}
		}
	);
	return gl;
}

describe('描画の呼び出しの数（P-1）', () => {
	it('街の画面で一番多く描くとき（地下の仕組み・区画・道路の試し引き・夜の光だまり）でも 40 回以下', () => {
		const gl = fakeGL();
		const canvas = { getContext: () => gl } as unknown as HTMLCanvasElement;
		const E = createEngine(canvas);
		const tri = new Float32Array(12 * 3);
		for (const k of ['city', 'water', 'glow', 'dyn', 'built', 'infra', 'lots', 'preview'])
			E.setMesh(k, tri, k !== 'city');
		const calls = (gl as unknown as { calls: { draw: number } }).calls;
		const before = calls.draw;
		const light = {
			sky: [0.5, 0.6, 0.8],
			hor: [0.7, 0.7, 0.7],
			gnd: [0.3, 0.3, 0.3],
			sun: [1, 1, 1],
			amb: 0.6,
			night: 0.5,
			sd: [0.3, 0.8, 0.2]
		};
		E.render({
			w: 1280,
			h: 720,
			fov: 0.72,
			near: 1,
			far: 6000,
			eye: [100, 200, 100],
			target: [0, 0, 0],
			sunDir: [0.3, 0.8, 0.2],
			shadowR: 300,
			light,
			time: 100,
			info: 1,
			sel: 0,
			fog: 0.00032,
			tilt: 0.5,
			bloom: 1,
			aoK: 0.85,
			aoR: 2.5,
			opaque: ['city', 'water', 'dyn', 'built', 'infra', 'lots', 'preview'],
			casters: ['city', 'dyn', 'built'],
			glow: ['glow']
		} satisfies RenderParams);
		const n = calls.draw - before;
		expect(n).toBeGreaterThan(10);
		expect(n).toBeLessThanOrEqual(40);
	});
});
