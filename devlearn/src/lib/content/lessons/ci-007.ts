// ci-007 自動で配信する（fix・pipeline）。
// 場面：パン屋の頁は、push のたびに配る段が走っていた。テストが落ちた版や、試しの枝まで配られた。検査が通った main だけを配る。
// 設定の書き方は ci-003 と同じ作り物。特定の事業者の書式は写さない（D-10）。経過時刻 t は push を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TEST = 'test の段';
const DEPLOY = 'deploy の段';
const SITE = '公開の頁';

export const ci007: Lesson = {
	id: 'ci-007',
	field: 'ci',
	level: 3,
	title: '自動で配信する',
	goal: '検査が通ったときだけ配信される条件を組むことができる',
	prereq: ['ci-006'],
	related: ['cld-009', 'git-010'],
	next: [],
	explain: [
		{
			n: 1,
			title: '検査の段',
			lead: 'test の段は、どの枝への push でも走る',
			body: ['試しの枝でも main でも、push すれば test が走る。', '試しの枝の誤りも、早く分かる。'],
			facts: [
				{ k: 'test が走る時', v: 'どの枝への push でも' },
				{ k: '役目', v: '誤りを早く知らせる' }
			],
			scene: [
				{ op: 'appear', id: 'test', label: TEST, sub: '全ての push', at: [0, 1] },
				{ op: 'change', id: 'test', k: '走る時', v: 'どの枝でも' }
			],
			log: { t: '0s', from: 'push', to: TEST, kind: 'run', info: 'どの枝でも test が走る' }
		},
		{
			n: 2,
			title: '配信の段',
			lead: 'deploy の段は、公開の頁を新しい版に替える',
			body: [
				'deploy は、組み立てた物を公開の場所へ置き、客が見る頁を替える。',
				'条件を付けないと、test と同時に、どの push でも走る。'
			],
			facts: [
				{ k: '役目', v: '公開の頁を替える' },
				{ k: '条件の無い時', v: 'どの push でも走る' }
			],
			scene: [
				{ op: 'appear', id: 'deploy', label: DEPLOY, sub: '条件無し', at: [3, 1] },
				{ op: 'appear', id: 'site', label: SITE, sub: '客が見る', at: [6, 1] },
				{ op: 'move', from: 'deploy', to: 'site', payload: '替える', kind: 'deploy' }
			],
			log: { t: '5s', from: DEPLOY, to: SITE, kind: 'deploy', info: '条件無しで頁が替わった' }
		},
		{
			n: 3,
			title: '前の段に依る',
			lead: 'after=test を付けると、test が通った後にだけ走る',
			body: [
				'test が落ちた版で deploy が走り、壊れた頁が 20 分公開されていた。',
				'after=test を付けると、test が落ちた回は deploy が走らない。'
			],
			facts: [
				{ k: '条件', v: 'after=test' },
				{ k: 'test が落ちた回', v: 'deploy は走らない' }
			],
			scene: [
				{ op: 'move', from: 'test', to: 'deploy', payload: '通った後', kind: 'after' },
				{ op: 'change', id: 'deploy', k: '条件', v: 'after=test' }
			],
			log: { t: '60s', from: TEST, to: DEPLOY, kind: 'after', info: 'test が通った後だけ' },
			why: '配る前に検査を必ず通すと、検査で見つかる誤りは客に届かない'
		},
		{
			n: 4,
			title: '主の枝だけ',
			lead: 'branch=main を付けると、main への push でだけ走る',
			body: [
				'試しの枝 feature の push で、作りかけの頁が公開されていた。',
				'branch=main を付けると、feature では test だけが走る。'
			],
			facts: [
				{ k: '条件', v: 'branch=main' },
				{ k: 'feature への push', v: 'test だけ' }
			],
			scene: [
				{ op: 'appear', id: 'feat', label: '枝 feature', sub: '作りかけ', at: [0, 2] },
				{ op: 'move', from: 'feat', to: 'test', payload: 'push', kind: 'push' },
				{ op: 'change', id: 'deploy', k: '枝', v: 'main だけ' }
			],
			log: { t: '0s', from: '枝 feature', to: TEST, kind: 'push', info: 'feature では配らない' }
		},
		{
			n: 5,
			title: '失敗したら配らない',
			lead: '2 つの条件を両方付けて、配る時を絞る',
			body: [
				'deploy after=test branch=main で、「main で、test が通った時だけ」配る。',
				'main で test が落ちた回は、test（失敗）で止まる。'
			],
			facts: [
				{ k: 'main・通った', v: 'test→deploy' },
				{ k: 'main・落ちた', v: 'test（失敗）' },
				{ k: 'feature', v: 'test' }
			],
			scene: [
				{ op: 'change', id: 'deploy', k: '条件', v: 'after=test branch=main' },
				{ op: 'highlight', id: 'deploy' }
			],
			log: { t: '60s', from: TEST, to: DEPLOY, kind: 'gate', info: 'main で通った時だけ配る' }
		},
		{
			n: 6,
			title: '前の版が残る',
			lead: '配らなかった回は、公開の頁は前の版のままだ',
			body: [
				'test が落ちて配らなかった間も、客は前の正しい版を見ていた。',
				'直して push し、test が通ると、新しい版に替わった。'
			],
			facts: [
				{ k: '配らなかった間', v: '前の版のまま' },
				{ k: '直した後', v: '新しい版' }
			],
			scene: [
				{ op: 'change', id: 'site', k: '版', v: '前の版のまま' },
				{ op: 'move', from: 'deploy', to: 'site', payload: '直した版', kind: 'deploy' }
			],
			log: { t: '10m', from: DEPLOY, to: SITE, kind: 'deploy', info: '直した版が公開された' }
		}
	],
	example: {
		intro: '直した設定と、出来事ごとに走った段',
		lines: [
			'on push',
			'job test run=npm test',
			'job deploy after=test branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN',
			'',
			'push（main）                 test→deploy',
			'push（main、test が落ちる）  test（失敗）',
			'push（feature）              test'
		]
	},
	practice: {
		goal: 'deploy の行を直し、main への push で test が通った時だけ配る',
		form: 'fix',
		setup: {
			engine: 'pipeline',
			lines: [
				{ id: 'd1', text: 'on push' },
				{ id: 'd2', text: 'job test run=npm test' },
				{ id: 'd3', text: 'job deploy key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN' }
			],
			options: [
				{
					line: 'd3',
					id: 'both',
					text: 'job deploy after=test branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN'
				},
				{
					line: 'd3',
					id: 'after',
					text: 'job deploy after=test key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN'
				},
				{
					line: 'd3',
					id: 'branch',
					text: 'job deploy branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN'
				},
				{ line: 'd1', id: 'main', text: 'on push branch=main' }
			],
			cases: [
				{ id: 'ok', name: 'push（main）', input: { event: 'push', branch: 'main' } },
				{
					id: 'fail',
					name: 'push（main、test が落ちる）',
					input: { event: 'push', branch: 'main', fail: 'test' }
				},
				{ id: 'feat', name: 'push（feature）', input: { event: 'push', branch: 'feature' } }
			]
		},
		success: { expect: { ok: 'test→deploy', fail: 'test（失敗）', feat: 'test' } },
		mistakes: [
			{
				when: 'after=test を付けなかった',
				why: 'test が落ちた回も deploy が走り、壊れた版が公開される',
				next: 'after=test と branch=main の両方が付いた行を選ぶ',
				match: 'case:fail:test（失敗）→deploy'
			},
			{
				when: 'branch=main を付けなかった',
				why: '試しの枝 feature の push でも、作りかけの頁が公開される',
				next: 'after=test と branch=main の両方が付いた行を選ぶ',
				match: 'case:feat:test→deploy'
			},
			{
				when: 'on の行を main だけにした',
				why: 'feature への push で test まで走らなくなり、試しの誤りに気づけない',
				next: '1 行目は on push のままにし、絞るのは deploy の行にする',
				match: 'd1:main'
			}
		]
	},
	check: [
		{ ask: '検査が通った時だけ配る', how: 'deploy に after=test を付ける' },
		{ ask: 'main だけで配る', how: 'deploy に branch=main を付ける（on の行は絞らない）' },
		{ ask: '配らなかった回の頁', how: '前の版のまま' }
	]
};
