// 道具の履歴と巻き戻し（docs/tools.md 1 章）。
import { describe, expect, it } from 'vitest';
import { current, rewind, start, typeLine, type Tool } from './session.ts';

// 打った数を足していくだけの道具
type S = { total: number };
const adder: Tool<S> = {
	run(state, line) {
		const n = Number(line);
		if (Number.isNaN(n)) return { state, out: '', err: `not a number: ${line}\n`, code: 1 };
		const total = state.total + n;
		return { state: { total }, out: `${total}\n`, err: '', code: 0 };
	}
};

describe('履歴', () => {
	it('打った物と結果と、打った後の状態が順に残る', () => {
		let s = start(adder, { total: 0 });
		s = typeLine(s, '2');
		s = typeLine(s, 'x');
		s = typeLine(s, '3');
		expect(s.entries.map((e) => [e.line, e.out, e.err, e.code])).toEqual([
			['2', '2\n', '', 0],
			['x', '', 'not a number: x\n', 1],
			['3', '5\n', '', 0]
		]);
		expect(current(s)).toEqual({ total: 5 });
	});

	it('打つ前の履歴は変わらない（値として扱える）', () => {
		const a = typeLine(start(adder, { total: 0 }), '1');
		const b = typeLine(a, '1');
		expect(a.entries).toHaveLength(1);
		expect(b.entries).toHaveLength(2);
	});
});

describe('巻き戻し', () => {
	const s = ['1', '2', '3'].reduce(typeLine, start(adder, { total: 10 }));

	it('k 件目まで戻すと、その時点の状態になる。0 なら初めの状態', () => {
		expect(current(rewind(s, 2))).toEqual({ total: 13 });
		expect(current(rewind(s, 0))).toEqual({ total: 10 });
		expect(rewind(s, 2).entries.map((e) => e.line)).toEqual(['1', '2']);
	});

	it('戻した所から打つと、先の履歴は捨てられる', () => {
		const t = typeLine(rewind(s, 1), '100');
		expect(t.entries.map((e) => e.line)).toEqual(['1', '100']);
		expect(current(t)).toEqual({ total: 111 });
	});

	it('範囲の外は端に寄せる', () => {
		expect(rewind(s, -1).entries).toHaveLength(0);
		expect(rewind(s, 99).entries).toHaveLength(3);
	});

	it('同じ物を打ち直すと、同じ結果になる', () => {
		const again = ['1', '2', '3'].reduce(typeLine, start(adder, { total: 10 }));
		expect(again).toEqual(s);
	});
});
