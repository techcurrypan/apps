// ci-006 秘密の渡し方（fix・pipeline）。
// 場面：パン屋の頁を配る段の設定に、配る先の鍵をそのまま書いていた。鍵を設定から外し、要る段だけに渡す。
// 設定の書き方は ci-003 と同じ作り物。鍵の値も作り物。特定の事業者の書式は写さない（D-10）。経過時刻 t は見直しを始めた日を 0d とした。
import type { Lesson } from '../../lesson/types.ts';

const CONF = '設定ファイル';
const VAULT = '秘密の置き場';

export const ci006: Lesson = {
	id: 'ci-006',
	field: 'ci',
	level: 2,
	title: '秘密の渡し方',
	goal: '秘密情報を、設定に書かずにパイプラインへ渡すことができる',
	prereq: ['ci-003', 'sec-013'],
	related: [],
	next: ['ci-007'],
	explain: [
		{
			n: 1,
			title: '鍵を設定に書く危うさ',
			lead: '設定ファイルに書いた鍵は、記録を読める全員に渡る',
			body: [
				'deploy の段に --token abcd1234 と、鍵をそのまま書いていた。',
				'設定ファイルは記録に入るので、消しても前の記録に残る（sec-013）。'
			],
			facts: [
				{ k: '書いていた行', v: 'run=./deploy --token abcd1234' },
				{ k: '読める人', v: '記録を読める全員' }
			],
			scene: [
				{ op: 'appear', id: 'conf', label: CONF, sub: '鍵がそのまま', at: [0, 1] },
				{ op: 'highlight', id: 'conf' }
			],
			log: { t: '0d', from: CONF, to: '記録', kind: 'leak', info: '鍵が記録に入っていた' }
		},
		{
			n: 2,
			title: '秘密の置き場',
			lead: '鍵は、置き場の「秘密」の欄に名前を付けて置く',
			body: [
				'DEPLOY_TOKEN という名前で、鍵を秘密の置き場に入れた。',
				'置いた鍵は、置いた人も含め、後から画面で読み出せない。'
			],
			facts: [
				{ k: '名前', v: 'DEPLOY_TOKEN' },
				{ k: '読み出し', v: 'できない（使うだけ）' }
			],
			scene: [
				{ op: 'appear', id: 'vault', label: VAULT, sub: 'DEPLOY_TOKEN', at: [3, 0] },
				{ op: 'change', id: 'vault', k: '読み出し', v: 'できない' }
			],
			log: { t: '0d', from: '店主', to: VAULT, kind: 'store', info: '鍵を名前で置いた' },
			why: '読み出せなければ、画面を覗かれても、置き場の係の鍵が漏れても、鍵の値は出ない'
		},
		{
			n: 3,
			title: '名前で参照',
			lead: '設定には、鍵の値でなく名前だけを書く',
			body: [
				'命令に $DEPLOY_TOKEN と書き、段に key=DEPLOY_TOKEN を付ける。',
				'走る時だけ、置き場が段の機械に値を渡す。'
			],
			facts: [
				{ k: '書く物', v: '$DEPLOY_TOKEN（名前）' },
				{ k: '渡す段', v: 'key=DEPLOY_TOKEN の付いた段' }
			],
			scene: [
				{ op: 'appear', id: 'deploy', label: 'deploy の段', sub: 'key=DEPLOY_TOKEN', at: [6, 1] },
				{ op: 'move', from: 'vault', to: 'deploy', payload: '走る時だけ', kind: 'inject' }
			],
			log: { t: '1d', from: VAULT, to: 'deploy の段', kind: 'inject', info: '走る時だけ値を渡す' }
		},
		{
			n: 4,
			title: 'ログで伏せられる',
			lead: '渡した鍵がログに出そうになると、置き場は *** に伏せる',
			body: [
				'deploy の段が誤って鍵を表示しても、ログには *** と出る。',
				'ただし、鍵を加工して出すと伏せきれないので、表示しないのが基本だ。'
			],
			facts: [
				{ k: 'ログ', v: '--token ***' },
				{ k: '伏せきれない例', v: '鍵を逆順にして表示する' }
			],
			scene: [
				{ op: 'appear', id: 'log', label: 'ログ', sub: '***', at: [6, 2] },
				{ op: 'move', from: 'deploy', to: 'log', payload: '***', kind: 'mask' }
			],
			log: { t: '1d', from: 'deploy の段', to: 'ログ', kind: 'mask', info: 'ログでは *** に伏せた' }
		},
		{
			n: 5,
			title: '渡す範囲',
			lead: '鍵は、要る段にだけ渡す。外からの変更で走る段には渡さない',
			body: [
				'test の段にも key=DEPLOY_TOKEN が付いていた。test は外の人の pull でも走る。',
				'外の人が test の中身を書き替えれば、鍵を盗める。test から key を外す。'
			],
			facts: [
				{ k: 'pull で走る段', v: 'test' },
				{ k: '鍵を渡す段', v: 'deploy だけ（main への push）' }
			],
			scene: [
				{ op: 'appear', id: 'test', label: 'test の段', sub: 'pull でも走る', at: [3, 2] },
				{ op: 'move', from: 'vault', to: 'test', payload: '渡さない', kind: 'deny' }
			],
			log: { t: '2d', from: VAULT, to: 'test の段', kind: 'deny', info: 'test には渡さない' }
		},
		{
			n: 6,
			title: '回して替える',
			lead: '漏れた鍵は、設定から消すだけでなく、新しい鍵に替える',
			body: [
				'記録に残った abcd1234 は、配る先で使えないように止め、新しい鍵を作った。',
				'新しい鍵を秘密の置き場の DEPLOY_TOKEN に入れ直した。設定は変えずに済む。'
			],
			facts: [
				{ k: '古い鍵', v: '止める' },
				{ k: '設定の書き替え', v: '要らない（名前のまま）' }
			],
			scene: [
				{ op: 'change', id: 'vault', k: 'DEPLOY_TOKEN', v: '新しい鍵' },
				{ op: 'vanish', id: 'conf' }
			],
			log: { t: '2d', from: '店主', to: VAULT, kind: 'rotate', info: '鍵を新しく替えた' }
		}
	],
	example: {
		intro: '直した設定と、出来事ごとの結果',
		lines: [
			'on push',
			'on pull',
			'job test run=npm test',
			'job deploy after=test branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN',
			'',
			'push（main）       test→deploy',
			'pull（feature）    test（鍵は渡らない）'
		]
	},
	practice: {
		goal: '鍵を設定から外して名前で渡し、鍵は main への push の deploy にだけ渡す',
		form: 'fix',
		setup: {
			engine: 'pipeline',
			lines: [
				{ id: 's1', text: 'on push' },
				{ id: 's2', text: 'on pull' },
				{ id: 's3', text: 'job test key=DEPLOY_TOKEN run=npm test' },
				{
					id: 's4',
					text: 'job deploy after=test branch=main run=./deploy --token abcd1234'
				}
			],
			options: [
				{ line: 's3', id: 'nokey', text: 'job test run=npm test' },
				{
					line: 's4',
					id: 'ref',
					text: 'job deploy after=test branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN'
				},
				{
					line: 's4',
					id: 'refnokey',
					text: 'job deploy after=test branch=main run=./deploy --token $DEPLOY_TOKEN'
				}
			],
			cases: [
				{ id: 'main', name: 'push（main）', input: { event: 'push', branch: 'main' } },
				{
					id: 'pull',
					name: 'pull（外の人の feature）',
					input: { event: 'pull', branch: 'feature' }
				}
			]
		},
		success: { expect: { main: 'test→deploy', pull: 'test' } },
		mistakes: [
			{
				when: '鍵をそのまま書いた行を残した',
				why: '鍵の値が設定と記録に残り、記録を読める全員に渡る',
				next: '4 行目を、$DEPLOY_TOKEN と key=DEPLOY_TOKEN を使う行に替える',
				match: 'case:main:test→deploy／鍵が記録に出る'
			},
			{
				when: '$DEPLOY_TOKEN と書いたが、段に key を付けなかった',
				why: '置き場は、key を付けた段にしか鍵を渡さない。deploy は鍵が無くて落ちる',
				next: '4 行目に key=DEPLOY_TOKEN の付いた行を選ぶ',
				match: 's4:refnokey'
			},
			{
				when: 'test に鍵を渡したままにした',
				why: 'test は外の人の pull でも走る。中身を書き替えられると鍵を盗まれる',
				next: '3 行目を job test run=npm test にする',
				match: 'case:pull:test／鍵が外からの変更に渡る'
			}
		]
	},
	check: [
		{ ask: '鍵の置き場', how: '置き場の秘密の欄（設定ファイルには書かない）' },
		{ ask: '設定に書く物', how: '鍵の名前（$DEPLOY_TOKEN）と、渡す段の key=' },
		{ ask: '鍵を渡さない段', how: '外からの変更（pull）で走る段' },
		{ ask: '鍵が漏れた後', how: '古い鍵を止め、新しい鍵に替える' }
	]
};
