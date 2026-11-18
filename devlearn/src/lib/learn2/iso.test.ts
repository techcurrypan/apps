import { describe, expect, it } from 'vitest';
import type { Icon } from '../lesson/types.ts';
import { boxFaces, iso, KINDS, kindOf } from './iso.ts';

describe('機械の絵の一式（LS-D2・LS-L8）', () => {
	it('24 種以上あり、全ての Icon に絵がある', () => {
		expect(Object.keys(KINDS).length).toBeGreaterThanOrEqual(24);
		const icons: Icon[] = [
			'pc',
			'laptop',
			'phone',
			'router',
			'cloud',
			'server',
			'db',
			'file',
			'folder',
			'wall',
			'node',
			'box',
			'gear',
			'person',
			'book',
			'chart',
			'brain',
			'switch',
			'nic',
			'etcd',
			'disk',
			'lock',
			'pod',
			'api',
			'scheduler',
			'kubelet',
			'lb',
			'queue',
			'cpu',
			'wire',
			'tag'
		];
		for (const i of icons) expect(KINDS[i]).toBeDefined();
	});
	it('種類ごとに形・色・印の組が違う（同じ組は 2 つまで）', () => {
		const seen = new Map<string, number>();
		for (const k of Object.values(KINDS)) {
			const key = `${k.shape}|${k.family}|${k.glyph}`;
			seen.set(key, (seen.get(key) ?? 0) + 1);
		}
		expect(Math.max(...seen.values())).toBeLessThanOrEqual(2);
	});
	it('等角：x と y を同じだけ進めると真下へ', () => {
		const [a, b] = iso(10, 10, 0);
		expect(a).toBeCloseTo(0);
		expect(b).toBeCloseTo(10);
		expect(boxFaces(10, 10, 10).top.split(' ')).toHaveLength(4);
		expect(kindOf('nope').shape).toBe('cube');
	});
});
