// cld-009 構成をコードで書く（pick）。
// 場面：パン屋の機械と倉庫を、構成の定義（ファイル）で管理している。定義を直して出した差分を読み、当てる前にすることを選ぶ。
// 定義と差分の書き方は作り物。特定の道具の書式は写さない（D-10）。経過時刻 t は定義を直し始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const DEF = '構成の定義';
const NOW = '今の状態';

export const cld009: Lesson = {
	id: 'cld-009',
	field: 'cld',
	level: 3,
	title: '構成をコードで書く',
	goal: '構成の定義の差分から、作り直される物を予想することができる',
	prereq: ['cld-008'],
	related: ['git-002'],
	next: [],
	explain: [
		{
			n: 1,
			title: '構成を書く',
			lead: '機械や倉庫の作り方を、ファイルに書いて残す',
			body: [
				'web-1（大きさ small・区画 east-a）と db-1（区画 east-a）を定義に書いた。',
				'定義は git で記録するので、誰がいつ何を変えたかが残る（git-002）。'
			],
			facts: [
				{ k: 'web-1', v: '大きさ small・区画 east-a' },
				{ k: 'db-1', v: '区画 east-a' }
			],
			scene: [
				{ op: 'appear', id: 'def', label: DEF, sub: 'web-1・db-1', at: [0, 1] },
				{ op: 'change', id: 'def', k: '記録', v: 'git' }
			],
			log: { t: '0m', from: 'パン屋', to: DEF, kind: 'write', info: '構成を定義に書いた' }
		},
		{
			n: 2,
			title: '今の状態',
			lead: '道具は、事業者の側に今ある物と、前に当てた控えを覚えている',
			body: [
				'今ある物は、定義どおりの web-1 と db-1 だ。',
				'定義と今の状態が同じなら、当てても何も変わらない。'
			],
			facts: [
				{ k: '今ある物', v: 'web-1・db-1' },
				{ k: '定義との違い', v: '無し' }
			],
			scene: [
				{ op: 'appear', id: 'now', label: NOW, sub: 'web-1・db-1', at: [6, 1] },
				{ op: 'move', from: 'def', to: 'now', payload: '同じ', kind: 'compare' }
			],
			log: { t: '1m', from: DEF, to: NOW, kind: 'compare', info: '違いは無い' }
		},
		{
			n: 3,
			title: '差分を出す',
			lead: '定義を直したら、当てる前に差分を出して読む',
			body: [
				'web-1 を medium に、db-1 を east-b に、倉庫 logs を足すように直した。',
				'差分には、足す・変える・作り直す の 3 種類の行が出た。'
			],
			facts: [
				{ k: '足す', v: '倉庫 logs' },
				{ k: '変える', v: 'web-1 small → medium' },
				{ k: '作り直す', v: 'db-1 east-a → east-b' }
			],
			scene: [
				{ op: 'appear', id: 'diff', label: '差分', sub: '足す・変える・作り直す', at: [3, 1] },
				{ op: 'move', from: 'def', to: 'diff', payload: '比べる', kind: 'diff' }
			],
			log: { t: '5m', from: DEF, to: '差分', kind: 'diff', info: '3 つの違いが出た' },
			why: '差分を読めば、当てる前に、何が消えるかを知れる'
		},
		{
			n: 4,
			title: '足される物',
			lead: '定義に増えた物は、新しく作られる',
			body: ['倉庫 logs は、今は無いので、作られる。', '足す行は、今ある物に触らない。'],
			facts: [
				{ k: '作る物', v: '倉庫 logs（今は無い）' },
				{ k: '今ある物への影響', v: '無し' }
			],
			scene: [{ op: 'appear', id: 'logs', label: '倉庫 logs', sub: '足す', at: [6, 0] }],
			log: { t: '6m', from: '差分', to: '倉庫 logs', kind: 'create', info: 'logs は新しく作られる' }
		},
		{
			n: 5,
			title: '作り直される物',
			lead: '後から変えられない値を変えると、消して作り直す',
			body: [
				'大きさは止めずに変えられるが、置く区画は後から変えられない。',
				'db-1 は消してから east-b に作り直される。中の注文のデータは新しい db-1 に無い。'
			],
			facts: [
				{ k: 'その場で変える', v: 'web-1 の大きさ' },
				{ k: '消して作る', v: 'db-1（区画は後から変えられない）' }
			],
			scene: [
				{ op: 'appear', id: 'db', label: 'db-1', sub: '注文のデータ', at: [6, 2] },
				{ op: 'change', id: 'db', k: '差分', v: '消して作り直す' },
				{ op: 'highlight', id: 'db' }
			],
			log: { t: '7m', from: '差分', to: 'db-1', kind: 'replace', info: 'db-1 は消して作り直される' }
		},
		{
			n: 6,
			title: '当てる',
			lead: '作り直される物の中身を写してから、当てる',
			body: [
				'db-1 の注文のデータを写しておき、当てた後に新しい db-1 へ戻す。',
				'当て終えたら、もう一度差分を出し、違いが無いことを確かめる。'
			],
			facts: [
				{ k: '当てる前', v: 'db-1 のデータを写す' },
				{ k: '当てた後の差分', v: '無し' }
			],
			scene: [
				{ op: 'appear', id: 'backup', label: '写し', sub: '注文のデータ', at: [3, 2] },
				{ op: 'move', from: 'db', to: 'backup', payload: '写す', kind: 'backup' },
				{ op: 'move', from: 'diff', to: 'now', payload: '当てる', kind: 'apply' }
			],
			log: { t: '15m', from: '差分', to: NOW, kind: 'apply', info: '写してから当てた' }
		}
	],
	example: {
		intro: '定義を直して出した差分（書き方は作り物）',
		lines: [
			'+ 足す       倉庫 logs',
			'~ 変える     web-1   大きさ small → medium（止めずに変える）',
			'± 作り直す   db-1    区画 east-a → east-b（消してから作る）',
			'',
			'足す 1・変える 1・作り直す 1'
		]
	},
	practice: {
		goal: '差分を読み、当てる前にすることを 1 つ選ぶ',
		form: 'pick',
		setup: {
			situation: [
				'+ 足す       倉庫 logs',
				'~ 変える     web-1   大きさ small → medium（止めずに変える）',
				'± 作り直す   db-1    区画 east-a → east-b（消してから作る）',
				'',
				'db-1 には、今日までの注文のデータが入っている'
			],
			choices: [
				{
					id: 'apply',
					text: 'このまま当てる',
					result: 'db-1 は east-b に作り直され、今日までの注文が消えた'
				},
				{
					id: 'backup',
					text: 'db-1 の注文のデータを写してから当て、新しい db-1 に戻す',
					result: 'db-1 は east-b に移り、注文も戻った'
				},
				{
					id: 'web',
					text: 'web-1 の中身を写してから当てる',
					result: 'web-1 は止めずに変わったので写しは要らなかった。db-1 の注文は消えた'
				},
				{
					id: 'logs',
					text: '倉庫 logs を足す行を外してから当てる',
					result: 'logs は作られなかった。db-1 の注文は消えた'
				}
			]
		},
		success: { choice: 'backup' },
		mistakes: [
			{
				when: 'そのまま当てた',
				why: '± の行は、消してから作る。db-1 の中のデータは新しい db-1 に無い',
				next: '作り直される db-1 のデータを、先に写す',
				match: 'pick:apply'
			},
			{
				when: 'web-1 を写した',
				why: '~ の行は止めずに変えるので、中身は残る。作り直されるのは db-1 だ',
				next: '± の行の db-1 を写す',
				match: 'pick:web'
			},
			{
				when: '足す行を外した',
				why: '+ の行は、今ある物に触らない。危ういのは ± の行だ',
				next: '± の行の db-1 を写してから当てる',
				match: 'pick:logs'
			}
		]
	},
	check: [
		{ ask: '差分の 3 種類', how: '足す・変える（止めずに）・作り直す（消して作る）' },
		{ ask: '作り直しになる変更', how: '後から変えられない値（置く区画など）' },
		{ ask: '当てる前', how: '作り直される物のデータを写す' }
	]
};
