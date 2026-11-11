import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateCity } from './gen.ts';

// 段 8-2a：試作 docs/prototype/src/gen.js を TypeScript に移したとき、処理を変えていないこと。
// 試作の JS をそのまま動かした結果と、形（頂点の並び）・建物・区画・交差点が一字も違わない。
type ProtoCity = {
	G: Float32Array;
	W: Float32Array;
	GL: Float32Array;
	B: unknown[];
	lots: unknown[];
	FEAT: unknown;
	nodes: { x: number; z: number }[];
};

const sha = (a: Float32Array) =>
	createHash('sha1')
		.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength))
		.digest('hex');

describe('街の形（gen.ts）', () => {
	const src = readFileSync('docs/prototype/src/gen.js', 'utf8');
	const proto = new Function(src + '\n;return generateCity();')() as ProtoCity;
	const mine = generateCity();

	it('動かない物・水・夜の光だまりの形が試作と同じ', () => {
		expect(sha(mine.G)).toBe(sha(proto.G));
		expect(sha(mine.W)).toBe(sha(proto.W));
		expect(sha(mine.GL)).toBe(sha(proto.GL));
	});

	it('建物・区画・目印の建物・交差点が試作と同じ', () => {
		expect(JSON.stringify(mine.B)).toBe(JSON.stringify(proto.B));
		expect(JSON.stringify(mine.lots)).toBe(JSON.stringify(proto.lots));
		expect(JSON.stringify(mine.FEAT)).toBe(JSON.stringify(proto.FEAT));
		expect(mine.nodes.map((n) => [n.x, n.z])).toEqual(proto.nodes.map((n) => [n.x, n.z]));
	});

	it('動かない物の三角形が上限内（city-standard.md P-1、90 万以下）', () => {
		expect(mine.stats.tris).toBeLessThanOrEqual(900_000);
	});
});
