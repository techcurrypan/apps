import { describe, expect, it } from 'vitest';
import { NAME_DROP, REACH, drawList, isFloor, type SceneObj } from './draw';

// learn-standard.md 16.1 S2・S5：構図の置き場から、描く物の並び（奥から手前）を作る
const objs: Record<string, SceneObj> = {
	app: { kind: 'laptop', name: 'アプリ' },
	kern: { kind: 'func', name: 'カーネル', tone: 'blue' },
	nic: { kind: 'nic', name: 'NIC' }
};

describe('drawList', () => {
	it('構図にある物だけを、奥（y が小さい）から手前へ並べる', () => {
		const l = drawList(objs, { nic: [800, 400], app: [200, 300] }, null, 5000);
		expect(l.map((d) => d.id)).toEqual(['app', 'nic']);
		expect(l[1]).toMatchObject({ id: 'nic', kind: 'nic', x: 800, y: 400, s: 1, op: 1 });
	});
	it('移り変わりの途中は sceneAt の値（消える物も薄くなりながら描く）', () => {
		const l = drawList(objs, { kern: [500, 300] }, { app: [200, 300], kern: [300, 300] }, 450);
		const k = l.find((d) => d.id === 'kern');
		expect(k?.x).toBeCloseTo(400);
		expect(l.find((d) => d.id === 'app')?.op).toBeCloseTo(0.5);
	});
	it('物の表に無い ID は描かない（データの誤りで落ちない）', () => {
		expect(drawList(objs, { ghost: [1, 1] }, null, 0)).toEqual([]);
	});
	it('同じ y なら ID の順（描く順が毎回同じ）', () => {
		const l = drawList(objs, { nic: [100, 300], app: [900, 300] }, null, 5000);
		expect(l.map((d) => d.id)).toEqual(['app', 'nic']);
	});
	it('台（platform・frame）は y に関わらず先に描く（上に乗る Pod や変数を隠さない）', () => {
		const o2 = {
			...objs,
			n: { kind: 'platform', name: 'node-2' },
			p: { kind: 'pod', name: 'web-a' }
		} as const;
		const l = drawList(o2, { p: [500, 372], n: [500, 380] }, null, 5000);
		expect(l.map((d) => d.id)).toEqual(['n', 'p']);
	});
	it('リスト（list。メモリの型）も物として並べ、名前の札の下がりと線の止まりを持つ', () => {
		const o3 = { xs: { kind: 'list', name: 'list', term: 'list' } } as const;
		const l = drawList(o3, { xs: [600, 300] }, null, 5000);
		expect(l[0]).toMatchObject({ id: 'xs', kind: 'list' });
		expect(NAME_DROP.list).toBeGreaterThan(40);
		expect(REACH.list).toBeGreaterThan(60);
	});
});

describe('床の物（isFloor）', () => {
	it('台とフレームは床。参照の矢印は床の上・乗る物の下に描く', () => {
		expect(isFloor('platform')).toBe(true);
		expect(isFloor('frame')).toBe(true);
		expect(isFloor('var')).toBe(false);
		expect(isFloor('list')).toBe(false);
	});
});
