import { describe, expect, it } from 'vitest';
import { net007 } from '../content/lessons/net-007.ts';
import { clone, validLesson } from '../lesson/testing/fixture.ts';
import type { Host } from '../lesson/types.ts';
import { allNodes, beatsOf, changesAt, diffHosts, insideAt, nodesAt } from './model.ts';

describe('出来事の並び', () => {
	it('概要の後に、move ごとに 1 つ。move の無いステップは 1 つ', () => {
		const b = beatsOf(net007);
		expect(b[0].step).toBe(0);
		expect(b.length - 1).toBe(6); // 6 ステップ、move は各 1 か 0
		expect(b.filter((x) => x.move).map((x) => x.step)).toEqual([2, 3, 5]);
	});
	it('1 ステップに 2 つの move があれば、出来事も 2 つ。届いた後の変化はその move に付く', () => {
		const l = clone(validLesson());
		l.explain[1].scene = [
			{ op: 'appear', id: 'b', label: 'B', at: [1, 0] },
			{ op: 'move', from: 'a', to: 'b', payload: '問い', kind: 'q' },
			{ op: 'change', id: 'b', k: '受けた', v: '問い' },
			{ op: 'move', from: 'b', to: 'a', payload: '答え', kind: 'r' },
			{ op: 'change', id: 'a', k: '値', v: '20' }
		];
		const b = beatsOf(l).filter((x) => x.step === 2);
		expect(b.length).toBe(2);
		expect(b[0].pre.map((o) => o.op)).toEqual(['appear']);
		expect(b[0].post.map((o) => o.op)).toEqual(['change']);
		expect(b[1].first).toBe(false);
		expect(b[1].last).toBe(true);
	});
});

describe('図の状態（LS-M2：届く前に結果を出さない）', () => {
	it('動いている間は、届いた後の変化をまだ当てない', () => {
		const k = beatsOf(net007).find((x) => x.step === 6)?.k ?? 0;
		const moving = nodesAt(net007, k, 'moving').find((n) => n.id === 'me');
		const after = nodesAt(net007, k, 'after').find((n) => n.id === 'me');
		expect(moving?.props.some((p) => p.k === '受け取った頁')).toBe(false);
		expect(after?.props.find((p) => p.k === '受け取った頁')?.v).toBe('<title>shop</title>');
	});
	it('同じ出来事・同じ段階なら、いつ呼んでも同じ', () => {
		expect(nodesAt(net007, 4, 'after')).toEqual(nodesAt(net007, 4, 'after'));
	});
	it('変わったことは前と後を持つ', () => {
		const k = beatsOf(net007).find((x) => x.step === 4)?.k ?? 0;
		expect(changesAt(net007, k)).toContainEqual({
			who: '要求',
			k: 'Host',
			before: null,
			after: 'shop.example.com'
		});
	});
});

describe('OS の中の差（LS-I6）', () => {
	const h = (rows: Host['rows'], name = 'devbox'): Host => ({
		name,
		town: '机',
		addr: '192.0.2.10',
		rows
	});
	it('増えた・変わった・消えたに印を付け、変わった箱を上に', () => {
		const before = [
			h([
				{ id: 'a', depth: 0, what: 'bash', state: 'pid 1' },
				{ id: 'b', depth: 1, what: 'curl', state: 'pid 2' }
			]),
			h([{ id: 'w', depth: 0, what: 'web', state: 'LISTEN' }], 'Web')
		];
		const after = [
			h([
				{ id: 'a', depth: 0, what: 'bash', state: 'pid 1' },
				{ id: 'c', depth: 1, what: 'sock', state: 'TIME-WAIT' }
			]),
			h([{ id: 'w', depth: 0, what: 'web', state: 'LISTEN ・ 200 を返した' }], 'Web')
		];
		const v = diffHosts(before, after);
		const dev = v.find((x) => x.name === 'devbox');
		expect(dev?.rows.map((r) => [r.id, r.mark])).toEqual([
			['a', 'same'],
			['b', 'gone'],
			['c', 'new']
		]);
		const web = v.find((x) => x.name === 'Web');
		expect(web?.rows[0]).toMatchObject({ mark: 'chg', was: 'LISTEN' });
	});
	it('前が無ければ、印を付けない', () => {
		expect(
			diffHosts(null, [h([{ id: 'a', depth: 0, what: 'bash', state: 'x' }])])[0].rows[0].mark
		).toBe('same');
	});
});

describe('中身の板（LS-I）', () => {
	const k2 = beatsOf(net007).find((x) => x.step === 2)?.k ?? 0;
	it('動いている間は荷物を出し「送っている途中」。OS とログは前のまま', () => {
		const v = insideAt(net007, k2, 'moving');
		expect(v.packet?.name).toMatch(/SYN/);
		expect(v.sending).toBe(true);
		expect(v.waiting).toBe(true);
		expect(v.logs.length).toBe(0);
		expect(v.hosts.flatMap((x) => x.rows).some((r) => r.id === 'csock')).toBe(false);
	});
	it('届いた後は、つながりが増え、ログが新しい順に 4 行入る', () => {
		const v = insideAt(net007, k2, 'after');
		const rows = v.hosts.flatMap((x) => x.rows);
		expect(rows.find((r) => r.id === 'csock')?.mark).toBe('new');
		expect(v.logs.length).toBe(4);
		expect(v.logs[0].text).toContain('Connected');
		expect(v.logs.every((l) => l.fresh)).toBe(true);
		expect(v.waiting).toBe(false);
	});
	it('後の出来事では、前のログは新しくない', () => {
		const k5 = beatsOf(net007).find((x) => x.step === 5)?.k ?? 0;
		const v = insideAt(net007, k5, 'after');
		expect(v.logs.filter((l) => l.fresh).length).toBe(4);
		expect(v.logs.at(-1)?.fresh).toBe(false);
	});
});

describe('概要（出来事 0）の図', () => {
	it('レッスンに出る全ての機械を、値の行なしで出す（試作の概要と同じく、始める前に全体が見える）', () => {
		const ns = nodesAt(net007, 0, 'after');
		expect(ns.map((n) => n.id).sort()).toEqual(
			allNodes(net007)
				.map((n) => n.id)
				.sort()
		);
		expect(ns.every((n) => n.props.length === 0 && !n.hot && !n.fresh)).toBe(true);
	});
});
