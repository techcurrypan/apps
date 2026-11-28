import { describe, expect, it } from 'vitest';
import type { Term } from './terms';
import type { Layout } from './scene/layout';
import { checkV3, type V3Lesson } from './check-v3';

// explanation-standard.md 第 3 章 検査 41〜48（第 3 版・言葉と構図）
const T = (id: string, m: string[], d: string): Term => ({
	id,
	t: m[0],
	m,
	d,
	field: 'x',
	first: 'x-101'
});
const words = 'あいうえおかきくけこさしすせそ'.split('');
const DICT: Term[] = [
	T('send', ['send'], '送るよう頼む関数。'),
	T('fd', ['fd'], '接続の番号札。'),
	T('buf', ['buf'], '送る中身の置き場。'),
	T('kernel', ['カーネル'], 'OS の中心。'),
	T('nic', ['NIC'], '線につながる部品。'),
	T('app', ['アプリ'], '動くプログラム。'),
	T('cwnd', ['cwnd'], '一度に送ってよい量。'),
	...words.slice(0, 6).map((w, i) => T(`w${i}`, [`言葉${w}`], `${w}の説明。`))
];
const JARGON = ['send', 'fd', 'buf', 'cwnd', 'NIC', 'カーネル', 'qdisc'];
const objs: V3Lesson['objs'] = {
	app: { kind: 'laptop', name: 'アプリ', term: 'app' },
	kern: { kind: 'func', name: 'カーネル', term: 'kernel' },
	nic: { kind: 'nic', name: 'NIC', term: 'nic' }
};
const layout: Layout = { app: [150, 300], kern: [500, 300], nic: [850, 300] };
const ok = (): V3Lesson => ({
	id: 'x-101',
	field: 'x',
	title: 'x',
	goal: 'x',
	kick: 'x',
	terms: [...DICT.map((t) => t.id)],
	objs: structuredClone(objs),
	metrics: [{ key: 'cwnd', label: 'cwnd', term: 'cwnd' }],
	steps: [
		{
			kind: 'intro',
			title: '言葉をそろえる',
			paras: ['アプリが send(fd, buf) でカーネルに頼み、NIC が送る。言葉あ 言葉い 言葉う 言葉え'],
			layout: { ...layout },
			first: ['app', 'send', 'fd', 'buf', 'kernel', 'nic', 'w0', 'w1', 'w2', 'w3'],
			intro: {
				terms: ['app', 'send', 'fd', 'buf', 'kernel', 'nic', 'w0', 'w1', 'w2', 'w3'],
				anatomy: [
					{ text: 'send', note: '送る', term: 'send' },
					{ text: 'fd', note: '番号札', term: 'fd' }
				],
				analogy: '手紙を窓口に出すような物。'
			}
		},
		{
			kind: 'problem',
			title: '問題',
			paras: ['cwnd が足りない。言葉お 言葉か'],
			layout: { ...layout },
			first: ['cwnd', 'w4', 'w5']
		}
	]
});
const run = (l: V3Lesson) => {
	const out: { check: number; msg: string }[] = [];
	checkV3(l, DICT, JARGON, (check, _w, msg) => out.push({ check, msg }));
	return out;
};
const nums = (l: V3Lesson) => [...new Set(run(l).map((p) => p.check))];

describe('検査 41〜48（checkV3）', () => {
	it('正しいレッスンは落ちない', () => {
		expect(run(ok())).toEqual([]);
	});
	it('41：辞書の専門語が言葉の一覧に無いと落ちる', () => {
		const l = ok();
		l.steps[1].paras.push('qdisc に並ぶ。');
		expect(nums(l)).toContain(41);
	});
	it('42：初めて出る言葉が計算と違うと落ちる', () => {
		const l = ok();
		l.steps[1].first = ['w4', 'w5'];
		expect(nums(l)).toContain(42);
	});
	it('42：一覧にあって、どのステップにも出ない言葉で落ちる', () => {
		const l = ok();
		l.terms.push('nothing');
		expect(nums(l)).toContain(42);
	});
	it('43：説明が自分自身を使うと落ちる', () => {
		const dict = DICT.map((t) => (t.id === 'fd' ? { ...t, d: 'fd は番号札。' } : t));
		const out: number[] = [];
		checkV3(ok(), dict, JARGON, (c) => out.push(c));
		expect(out).toContain(43);
	});
	it('43：説明にまだ出ていない専門語を使うと落ちる', () => {
		const dict = DICT.map((t) => (t.id === 'fd' ? { ...t, d: 'cwnd ごとの番号札。' } : t));
		const out: number[] = [];
		checkV3(ok(), dict, JARGON, (c) => out.push(c));
		expect(out).toContain(43);
	});
	it('44：最初が intro でない・言葉の数・式の分解の部分の数で落ちる', () => {
		const a = ok();
		a.steps[0].kind = 'problem';
		expect(nums(a)).toContain(44);
		const b = ok();
		b.steps[0].intro!.terms = ['send'];
		expect(nums(b)).toContain(44);
		const c = ok();
		c.steps[0].intro!.anatomy = [{ text: 'send', note: '送る', term: 'send' }];
		expect(nums(c)).toContain(44);
		const d = ok();
		d.steps[0].intro!.analogy = '';
		expect(nums(d)).toContain(44);
	});
	it('45：problem の言葉が intro にも初出にも無いと落ちる', () => {
		const l = ok();
		l.steps[1].first = ['w4', 'w5'];
		l.steps[1].paras = ['cwnd が足りない。言葉お 言葉か'];
		expect(nums(l)).toContain(45);
	});
	it('46：図の物に言葉が無いと落ちる', () => {
		const l = ok();
		delete l.objs.nic.term;
		expect(nums(l)).toContain(46);
	});
	it('47：指標の名前に説明が無いと落ちる', () => {
		const l = ok();
		l.metrics = [{ key: 'rtt', label: 'RTT' }];
		expect(nums(l)).toContain(47);
	});
	it('48：物の数・枠の外・重なりで落ちる', () => {
		const a = ok();
		a.steps[1].layout = { app: [150, 300], kern: [500, 300] };
		expect(nums(a)).toContain(48);
		const b = ok();
		b.steps[1].layout = { ...layout, nic: [1100, 300] };
		expect(nums(b)).toContain(48);
		const c = ok();
		c.steps[1].layout = { ...layout, nic: [540, 320] };
		expect(nums(c)).toContain(48);
	});
	it('48：コードの札の上に物を置くと落ちる（memory の型。札は左の 0〜CODE_W）', () => {
		const l = ok();
		l.code = { file: 'main.js', lines: ['let a = [1, 2];'] };
		l.steps[1].code = { cur: [1] };
		l.steps[1].layout = { app: [440, 300], kern: [660, 300], nic: [880, 300] };
		expect(nums(l)).not.toContain(48);
		l.steps[1].layout = { ...layout };
		expect(run(l).some((p) => p.check === 48 && p.msg.includes('コードの札'))).toBe(true);
	});
	it('48：コードの札の行の番号は 1〜行の数', () => {
		const l = ok();
		l.code = { file: 'main.js', lines: ['let a = [1, 2];'] };
		l.steps[1].code = { cur: [3] };
		l.steps[1].layout = { app: [440, 300], kern: [660, 300], nic: [880, 300] };
		expect(run(l).some((p) => p.check === 48 && p.msg.includes('行'))).toBe(true);
	});
});
