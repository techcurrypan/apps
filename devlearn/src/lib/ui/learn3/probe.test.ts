import { describe, expect, it } from 'vitest';
import { isPart, makeL3, type L3Ctx } from './probe.ts';

function ctx(over: Partial<L3Ctx> = {}): L3Ctx & { log: string[] } {
	const log: string[] = [];
	return {
		log,
		steps: [
			{ kind: 'intro', first: ['app', 'kernel'] },
			{ kind: 'problem', first: ['skb', 'nope'] }
		],
		termName: (id) => ({ app: 'アプリ', kernel: 'カーネル', skb: 'skb' })[id],
		kindName: (k) => ({ intro: '準備', problem: '問題' })[k] ?? k,
		state: () => ({ step: 1, t: 1200, playing: true }),
		go: (i) => log.push(`go ${i}`),
		mode: (m) => log.push(`mode ${m}`),
		root: () => null,
		...over
	};
}

describe('isPart（台・板に乗る部材は主な物に数えない。cluster の Pod・memory の変数の名札）', () => {
	it('Pod と data-part の付いた物は部材', () => {
		expect(isPart({ term: 'pod' })).toBe(true);
		expect(isPart({ term: 'variable', part: '' })).toBe(true);
		expect(isPart({ term: 'frame' })).toBe(false);
	});
});

describe('window.__l3（測る道具の窓口。scripts/lib/learn3-measure.ts の PROTO_SHIM と同じ形）', () => {
	it('ステップの数・今のステップ・時刻・再生中を返す', () => {
		const a = makeL3(ctx());
		expect([a.steps, a.step, a.t, a.playing]).toEqual([2, 1, 1200, true]);
	});
	it('kindLabel は種類の札、fresh は初めて出る言葉の名前（一覧に無い ID は出さない）', () => {
		const a = makeL3(ctx());
		expect(a.kindLabel(0)).toBe('準備');
		expect(a.fresh(1)).toEqual(['skb']);
	});
	it('go は見るに切り替えてから動く。mode の recall は quiz', () => {
		const c = ctx();
		const a = makeL3(c);
		a.go(1);
		a.mode('recall');
		expect(c.log).toEqual(['mode watch', 'go 1', 'mode quiz']);
	});
	it('図が無ければ物は空', () => {
		expect(makeL3(ctx()).objs()).toEqual([]);
	});
});
