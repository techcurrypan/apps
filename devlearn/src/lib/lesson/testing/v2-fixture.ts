// テスト用の、第 2 版の検査（26〜40）を全て通すレッスン。各テストは複製して 1 か所だけ壊す。
import type { Lesson, Step, StepKind } from '../types.ts';

const S = '送信キューに 3 個の箱が入り、合わせて 4380 バイトになる。';
const para = (n: number) => Array.from({ length: n }, () => S).join('');

const KINDS: StepKind[] = [
	'problem',
	'mechanism',
	'mechanism',
	'internals',
	'fail',
	'fail',
	'fix',
	'tradeoff',
	'realworld',
	'ops',
	'teach',
	'summary'
];

function step(n: number, kind: StepKind): Step {
	const s: Step = {
		n,
		title: `段階 ${n}`,
		lead: `段階 ${n} の要約`,
		body: [para(4), para(4)],
		facts: [
			{ k: '箱', v: `${n} 個` },
			{ k: '大きさ', v: `${n * 1460} B` }
		],
		scene: [{ op: 'change', id: 'a', k: '箱', v: `${n} 個` }],
		log: {
			t: `0.0${String(n).padStart(2, '0')}s`,
			from: 'a',
			to: 'b',
			kind: 'data',
			info: `箱 ${n}`
		},
		kind,
		short: `段${n}`,
		depth: {
			intro: [para(4)],
			work: [para(4), para(4)],
			deep: [para(4), para(4), para(4), para(4)]
		},
		callout: { type: 'point', text: '箱は ACK が来るまで残る。' },
		changes: [
			{ mark: '+', text: '箱が 1 個増えた' },
			{ mark: '~', text: `合計が ${n * 1460} B になった` }
		],
		metrics: { q: `${n} 個`, t1: `${n} ms`, t2: '2 ms', total: `${n + 2} ms` },
		motion: [
			{ at: 0, dur: 700, para: 0, do: { op: 'camera', fit: ['a', 'b'] } },
			{ at: 300, dur: 500, para: 0, do: { op: 'pulse', id: 'a' } },
			{
				at: 800,
				dur: 900,
				para: 1,
				do: { op: 'packet', a: 'a', b: 'b', label: 'skb', kind: 'data' }
			},
			{ at: 1700, dur: 400, para: 1, do: { op: 'count', metric: 'q', to: `${n} 個` } }
		],
		loop: [{ at: 0, dur: 900, do: { op: 'packet', a: 'a', b: 'b', label: 'skb', kind: 'data' } }],
		board: ['1 行目', '2 行目', '3 行目'],
		badges: { a: 'ESTABLISHED' },
		refs: ['rfc9293'],
		learns: n <= 4 ? [n - 1] : []
	};
	if (n === 1) {
		s.scene = [
			{ op: 'appear', id: 'a', label: '送る PC', at: [0, 0] },
			{ op: 'appear', id: 'b', label: '受ける PC', at: [2, 0] },
			...s.scene
		];
		s.why = '箱を残さないと、落ちたときに送り直せないため';
	}
	if (kind === 'fail') {
		s.motion = [
			...(s.motion ?? []),
			{
				at: 2200,
				dur: 600,
				para: 1,
				do: { op: 'packet', a: 'a', b: 'b', label: 'skb', kind: 'data', drop: true }
			}
		];
		s.inside = { logs: [{ t: '0.300s', src: 'kernel', text: 'retransmit' }] };
	}
	if (kind === 'internals') {
		s.impl = [
			{
				name: 'tcp_write_xmit()',
				kind: 'function',
				where: 'net/ipv4/tcp_output.c',
				project: 'linux',
				version: 'v6.12',
				context: 'syscall',
				ref: 'linux-tcp-output'
			},
			{
				name: 'tcp_transmit_skb()',
				kind: 'function',
				where: 'net/ipv4/tcp_output.c',
				project: 'linux',
				version: 'v6.12',
				context: 'syscall',
				ref: 'linux-tcp-output'
			},
			{
				name: 'sk_buff',
				kind: 'struct',
				where: 'include/linux/skbuff.h',
				project: 'linux',
				version: 'v6.12',
				ref: 'linux-skbuff'
			}
		];
		s.layers = [
			{
				id: 'kernel',
				label: 'カーネル',
				boxes: [
					{
						id: 'wx',
						impl: 'tcp_write_xmit()',
						queues: [{ id: 'wq', label: '送信キュー', items: ['skb1'], limit: 'sndbuf 87380' }]
					},
					{
						id: 'tx',
						impl: 'tcp_transmit_skb()',
						queues: [{ id: 'rtx', label: '再送キュー', items: [] }]
					}
				]
			}
		];
		s.motion = [
			...(s.motion ?? []),
			{ at: 2400, dur: 500, para: 1, do: { op: 'peek', queue: 'wq', item: 'skb1' } },
			{ at: 3000, dur: 600, para: 1, do: { op: 'move', item: 'skb1', from: 'wq', to: 'rtx' } }
		];
	}
	return s;
}

export function validV2(id = 'tst-101'): Lesson {
	return {
		id,
		field: 'tst',
		level: 3,
		title: '第 2 版の検査の見本',
		goal: '送った箱が ACK まで残る理由を説明できる',
		prereq: [],
		related: [],
		next: [],
		explain: KINDS.map((k, i) => step(i + 1, k)),
		example: { intro: '見る', lines: ['$ ss -ti', 'cwnd:10'] },
		practice: {
			goal: '再送の原因を見つける',
			tool: { name: 'shell', mode: 'mock' },
			setup: {},
			success: {},
			mistakes: [
				{ when: 'a', why: 'b', next: 'c' },
				{ when: 'd', why: 'e', next: 'f' },
				{ when: 'g', why: 'h', next: 'i' }
			]
		},
		check: [
			{ ask: '問 1', how: '答え 1', kind: 'scene' },
			{ ask: '問 2', how: '答え 2', kind: 'scene' },
			{ ask: '問 3', how: '答え 3', kind: 'number' },
			{ ask: '問 4', how: '答え 4' },
			{ ask: '問 5', how: '答え 5' },
			{ ask: '問 6', how: '答え 6' }
		],
		map: {
			nodes: { a: { icon: 'pc', town: '送る家' }, b: { icon: 'server', town: '受ける店' } },
			links: [{ a: 'a', b: 'b', label: '線', dir: 'ab' }]
		},
		tier: 3,
		learn: ['送信キュー', '再送キュー', '文脈', 'ACK'],
		minutes: 40,
		metrics: [
			{ key: 'q', label: '送信キュー' },
			{ key: 't1', label: '段 1', unit: 'ms', sum: true },
			{ key: 't2', label: '段 2', unit: 'ms', sum: true },
			{ key: 'total', label: '合計', unit: 'ms' }
		],
		legend: [{ kind: 'data', label: 'データ', style: 'solid' }],
		sources: [
			{
				id: 'rfc9293',
				title: 'RFC 9293',
				url: 'https://www.rfc-editor.org/rfc/rfc9293',
				kind: 'rfc',
				checked: '2026-11-18'
			},
			{
				id: 'linux-tcp-output',
				title: 'tcp_output.c',
				url: 'https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_output.c',
				kind: 'source',
				checked: '2026-11-18'
			},
			{
				id: 'linux-skbuff',
				title: 'skbuff.h',
				url: 'https://github.com/torvalds/linux/blob/v6.12/include/linux/skbuff.h',
				kind: 'source',
				checked: '2026-11-18'
			}
		],
		teach: {
			myths: [
				{ wrong: '誤 1', right: '正 1' },
				{ wrong: '誤 2', right: '正 2' },
				{ wrong: '誤 3', right: '正 3' }
			],
			oneMinute: '1 分の文',
			questions: [
				{ ask: '問 a', answer: '答え a', look: '見どころ a' },
				{ ask: '問 b', answer: '答え b', look: '見どころ b' }
			]
		}
	};
}

export const FIXTURE_SOURCES: ReadonlySet<string> = new Set([
	'https://www.rfc-editor.org/rfc/rfc9293',
	'https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_output.c',
	'https://github.com/torvalds/linux/blob/v6.12/include/linux/skbuff.h'
]);
