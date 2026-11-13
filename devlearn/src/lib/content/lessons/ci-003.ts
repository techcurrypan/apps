// ci-003 設定を読む（fix・pipeline）。
// 場面：パン屋の頁の検査の設定ファイルを書き替えたら、push しても検査が走らなくなった。誤りを見つけて直す。
// 設定の書き方は作り物（on 出来事 / job 名前 after=段 run=命令）。特定の事業者の書式は写さない（D-10）。経過時刻 t は push を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const CONF = '設定ファイル';
const REPO = '遠くの置き場';

export const ci003: Lesson = {
	id: 'ci-003',
	field: 'ci',
	level: 2,
	title: '設定を読む',
	goal: 'パイプラインの設定ファイルの誤りを見つけて直すことができる',
	prereq: ['ci-002'],
	related: [],
	next: ['ci-004', 'ci-005', 'ci-006'],
	explain: [
		{
			n: 1,
			title: '設定ファイル',
			lead: '検査の流れ（パイプライン）は、記録の中の設定ファイルに書く',
			body: [
				'設定ファイルも git で記録するので、検査の流れを変えた時も履歴に残る。',
				'このレッスンでは、1 行に 1 つの決まりを書く作り物の書き方を使う。'
			],
			facts: [
				{ k: '置き場', v: '記録の中' },
				{ k: '1 行', v: '1 つの決まり' }
			],
			scene: [
				{ op: 'appear', id: 'conf', label: CONF, sub: '4 行', at: [0, 1] },
				{ op: 'appear', id: 'repo', label: REPO, sub: 'push を受ける', at: [3, 1] }
			],
			log: { t: '0s', from: CONF, to: REPO, kind: 'read', info: '置き場が設定を読む' }
		},
		{
			n: 2,
			title: 'いつ動くか',
			lead: 'on の行は、どの出来事で流れを始めるかを決める',
			body: [
				'on push なら push の時に始まる。on push branch=main なら main への push だけだ。',
				'on の行が 1 つも当たらなければ、何も走らない。'
			],
			facts: [
				{ k: 'on push', v: 'どの枝への push でも' },
				{ k: 'on push branch=main', v: 'main への push だけ' }
			],
			scene: [
				{ op: 'appear', id: 'on', label: 'on push', sub: 'いつ', at: [3, 0] },
				{ op: 'move', from: 'repo', to: 'on', payload: 'push', kind: 'trigger' }
			],
			log: { t: '1s', from: REPO, to: 'on push', kind: 'trigger', info: 'push で始まる' }
		},
		{
			n: 3,
			title: '段の並び',
			lead: 'job の行が段で、after= で前の段を指す',
			body: [
				'job test after=lint は「lint が通った後に test を走らせる」の意味だ。',
				'after の無い段は、始まりと同時に走る。'
			],
			facts: [
				{ k: 'job lint', v: '始まりと同時' },
				{ k: 'job test after=lint', v: 'lint が通った後' },
				{ k: 'job build after=test', v: 'test が通った後' }
			],
			scene: [
				{ op: 'appear', id: 'lint', label: 'lint', sub: '1 段目', at: [6, 0] },
				{ op: 'appear', id: 'test', label: 'test', sub: 'after=lint', at: [6, 1] },
				{ op: 'move', from: 'lint', to: 'test', payload: '通った後', kind: 'after' }
			],
			log: { t: '2s', from: 'lint', to: 'test', kind: 'after', info: 'lint の後に test' }
		},
		{
			n: 4,
			title: '字下げの誤り',
			lead: '字下げで形を表す書き方では、空白 1 つで意味が替わる',
			body: [
				'多くの設定ファイルは、字下げで「どの段の中か」を表す。',
				'空白が 1 つずれると、段の外の行になり、読み込みで落ちるか、別の意味になる。'
			],
			facts: [
				{ k: '起きる事', v: '読み込みで落ちる・別の意味になる' },
				{ k: '見つけ方', v: '置き場が返す「何行目」を見る' }
			],
			scene: [
				{ op: 'change', id: 'conf', k: '字下げ', v: '1 つずれると別の意味' },
				{ op: 'highlight', id: 'conf' }
			],
			log: { t: '3s', from: CONF, to: REPO, kind: 'error', info: '字下げのずれは何行目かで探す' },
			why: '設定は人の目には似て見えても、読み込む側は一字ずつ決まりどおりに読む'
		},
		{
			n: 5,
			title: '名前の誤り',
			lead: '綴りを誤ると、何も走らないか、設定の誤りで止まる',
			body: [
				'on psh は、どの出来事にも当たらないので、黙って何も走らない。',
				'after=lnt は、無い段を指すので、設定の誤りで止まる。'
			],
			facts: [
				{ k: 'on psh', v: '何も走らない（知らせも無い）' },
				{ k: 'after=lnt', v: '設定の誤り' }
			],
			scene: [
				{ op: 'change', id: 'on', k: '綴り', v: 'psh → 当たらない' },
				{ op: 'change', id: 'test', k: 'after', v: 'lnt → 無い段' }
			],
			log: { t: '4s', from: CONF, to: REPO, kind: 'error', info: '綴りの誤りで走らない' }
		},
		{
			n: 6,
			title: '直して走らせる',
			lead: '直したら push し、全ての段が走ったかを確かめる',
			body: [
				'2 行を直して push すると、lint→test→build の 3 段が走った。',
				'lint が落ちる記録では、test と build は走らなかった。'
			],
			facts: [
				{ k: '直した後', v: 'lint→test→build' },
				{ k: 'lint が落ちたら', v: 'lint（失敗）だけ' }
			],
			scene: [
				{ op: 'appear', id: 'build', label: 'build', sub: 'after=test', at: [6, 2] },
				{ op: 'move', from: 'test', to: 'build', payload: '通った後', kind: 'after' }
			],
			log: { t: '95s', from: 'lint', to: 'build', kind: 'run', info: '3 段が順に走った' }
		}
	],
	example: {
		intro: '直した設定と、出来事ごとに走った段',
		lines: [
			'on push',
			'job lint run=npm run lint',
			'job test after=lint run=npm test',
			'job build after=test run=npm run build',
			'',
			'push（main）                 lint→test→build',
			'push（main、lint が落ちる）  lint（失敗）'
		]
	},
	practice: {
		goal: '設定の誤りを直し、push で lint→test→build が走り、lint が落ちたら後の段が走らないようにする',
		form: 'fix',
		setup: {
			engine: 'pipeline',
			lines: [
				{ id: 'c1', text: 'on psh' },
				{ id: 'c2', text: 'job lint run=npm run lint' },
				{ id: 'c3', text: 'job test after=lnt run=npm test' },
				{ id: 'c4', text: 'job build after=test run=npm run build' }
			],
			options: [
				{ line: 'c1', id: 'push', text: 'on push' },
				{ line: 'c1', id: 'pull', text: 'on pull' },
				{ line: 'c3', id: 'lint', text: 'job test after=lint run=npm test' },
				{ line: 'c3', id: 'free', text: 'job test run=npm test' }
			],
			cases: [
				{ id: 'ok', name: 'push（main）', input: { event: 'push', branch: 'main' } },
				{
					id: 'lintfail',
					name: 'push（main、lint が落ちる記録）',
					input: { event: 'push', branch: 'main', fail: 'lint' }
				}
			]
		},
		success: { expect: { ok: 'lint→test→build', lintfail: 'lint（失敗）' } },
		mistakes: [
			{
				when: 'after=lnt を直さなかった',
				why: '無い段 lnt を指しているので、設定の誤りで何も走らない',
				next: '3 行目を job test after=lint にする',
				match: 'case:ok:error'
			},
			{
				when: 'on psh を直さなかった',
				why: 'psh という出来事は無いので、push でも何も走らない',
				next: '1 行目を on push にする',
				match: 'case:ok:none'
			},
			{
				when: 'test の after を外した',
				why: 'after が無いと、lint が落ちても test が走る',
				next: '3 行目を job test after=lint にする',
				match: 'c3:free'
			}
		]
	},
	check: [
		{ ask: 'on の行の綴りを誤ると', how: 'どの出来事にも当たらず、黙って何も走らない' },
		{ ask: 'after= の働き', how: '前の段が通った後にだけ走らせる' },
		{ ask: '直した後', how: 'push し、走った段と順を確かめる' }
	]
};
