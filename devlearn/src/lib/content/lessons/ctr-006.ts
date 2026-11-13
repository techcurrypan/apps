// ctr-006 設定を渡す（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-006-env.json と比べてある
// （コンテナの ID は、本物では打つたびに変わるので模擬の値）。
// 場面：同じイメージを、店の名前と、試し（test）か本番（live）かだけ替えて動かしたい。経過時刻 t は最初の docker run を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = '端末';
const C = 'コンテナ';

export const ctr006: Lesson = {
	id: 'ctr-006',
	field: 'ctr',
	level: 2,
	title: '設定を渡す',
	goal: '環境変数で、コンテナに設定を渡すことができる',
	prereq: ['ctr-001'],
	related: ['lnx-008'],
	next: ['ctr-007'],
	explain: [
		{
			n: 1,
			title: '設定を中に書く危うさ',
			lead: '設定をイメージに書き込むと、値を替えるたびに作り直しになる',
			body: [
				'店の名前や本番か試しかを、イメージの中に書くと、値ごとにイメージが要る。',
				'鍵を書き込むと、イメージを受け取った全員に鍵が渡る。'
			],
			facts: [
				{ k: '替えたい値', v: 'SHOP_NAME・SHOP_MODE' },
				{ k: '中に書くと', v: '値ごとに作り直し・鍵が漏れる' }
			],
			scene: [
				{ op: 'appear', id: 'img', label: 'イメージ', sub: 'busybox:1.37', at: [0, 1] },
				{ op: 'highlight', id: 'img' }
			],
			log: { t: '0m', from: ME, to: 'イメージ', kind: 'plan', info: '値はイメージの外から渡したい' }
		},
		{
			n: 2,
			title: '-e で渡す',
			lead: '-e 名前=値 で、コンテナの中に環境変数を置く',
			body: [
				"sh -c 'echo name=$SHOP_NAME' は、-e が無いと name= と返す。",
				'-e SHOP_NAME=minato を付けると、name=minato と返す。'
			],
			facts: [
				{ k: '-e 無し', v: 'name=' },
				{ k: '-e SHOP_NAME=minato', v: 'name=minato' }
			],
			scene: [
				{ op: 'appear', id: 'c', label: C, sub: 'echo name=$SHOP_NAME', at: [3, 1] },
				{ op: 'move', from: 'img', to: 'c', payload: '-e SHOP_NAME=minato', kind: 'env' },
				{ op: 'change', id: 'c', k: 'SHOP_NAME', v: 'minato' }
			],
			log: { t: '1m', from: ME, to: C, kind: 'env', info: 'SHOP_NAME=minato を渡した' }
		},
		{
			n: 3,
			title: '中で読む',
			lead: '$SHOP_NAME は、コンテナの中のシェルが読む',
			body: [
				"'…' で包むと、$SHOP_NAME は手元で読まれずに、そのまま中へ渡る。",
				'"…" で包むと、手元のシェルが先に読み、手元には無いので空になる。'
			],
			facts: [
				{ k: "'echo name=$SHOP_NAME'", v: '中で読む → name=minato' },
				{ k: '"echo name=$SHOP_NAME"', v: '手元で読む → name=' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '手元のシェル', at: [0, 0] },
				{ op: 'move', from: 'me', to: 'c', payload: "'$SHOP_NAME'", kind: 'quote' }
			],
			log: { t: '1m', from: ME, to: C, kind: 'quote', info: '包み方で読む場所が替わる' },
			why: '手元とコンテナの中は別のシェルなので、どちらで読むかを包み方で選ぶ'
		},
		{
			n: 4,
			title: '値を替えて動かす',
			lead: '同じイメージを、値だけ替えて動かせる',
			body: [
				'-e SHOP_MODE=live を付けて、裏で動くコンテナ app を作る。',
				'docker exec app printenv SHOP_MODE は live を返す。'
			],
			facts: [
				{ k: '渡した値', v: 'SHOP_MODE=live' },
				{ k: 'printenv SHOP_MODE', v: 'live' }
			],
			scene: [
				{ op: 'appear', id: 'app', label: 'コンテナ app', sub: 'sleep 600', at: [3, 2] },
				{ op: 'move', from: 'img', to: 'app', payload: '-e SHOP_MODE=live', kind: 'env' },
				{ op: 'change', id: 'app', k: 'SHOP_MODE', v: 'live' }
			],
			log: { t: '6m', from: ME, to: 'コンテナ app', kind: 'env', info: 'app は live で動く' }
		},
		{
			n: 5,
			title: 'ファイルで渡す',
			lead: '--env-file は、名前=値 の行を並べたファイルから渡す',
			body: [
				'cat shop.env は SHOP_NAME=minato と SHOP_MODE=test の 2 行を返す。',
				'--env-file shop.env を付けて 2 つを echo すると、minato test を返す。'
			],
			facts: [
				{ k: 'shop.env', v: 'SHOP_NAME=minato / SHOP_MODE=test' },
				{ k: '答え', v: 'minato test' }
			],
			scene: [
				{ op: 'appear', id: 'file', label: 'shop.env', sub: '2 行', at: [0, 2] },
				{ op: 'move', from: 'file', to: 'c', payload: '--env-file', kind: 'env' }
			],
			log: { t: '4m', from: 'shop.env', to: C, kind: 'env', info: '2 つの値をまとめて渡した' }
		},
		{
			n: 6,
			title: '秘密の扱い',
			lead: '鍵を入れたファイルは、記録にも共有にも入れない',
			body: [
				'shop.env に鍵を書くなら、そのファイルは .gitignore に書く（git-009）。',
				'イメージにも記録にも鍵を残さず、動かす時にだけ渡す。'
			],
			facts: [
				{ k: '鍵の置き場', v: '動かす機械の中だけ' },
				{ k: '入れない所', v: 'イメージ・git の記録' }
			],
			scene: [
				{ op: 'change', id: 'file', k: '扱い', v: '記録に入れない' },
				{ op: 'highlight', id: 'file' }
			],
			log: { t: '7m', from: 'shop.env', to: 'git', kind: 'warn', info: '鍵のファイルは記録しない' }
		}
	],
	example: {
		intro: '-e と --env-file で値を渡した（模擬は本物の記録と比べ済み）',
		lines: [
			"$ docker run --rm busybox:1.37 sh -c 'echo name=$SHOP_NAME'",
			'name=',
			"$ docker run --rm -e SHOP_NAME=minato busybox:1.37 sh -c 'echo name=$SHOP_NAME'",
			'name=minato',
			'$ docker run --rm -e SHOP_NAME=minato busybox:1.37 sh -c "echo name=$SHOP_NAME"',
			'name=',
			'$ cat shop.env',
			'SHOP_NAME=minato',
			'SHOP_MODE=test',
			"$ docker run --rm --env-file shop.env busybox:1.37 sh -c 'echo $SHOP_NAME $SHOP_MODE'",
			'minato test',
			'$ docker run -d --name app -e SHOP_MODE=live busybox:1.37 sleep 600',
			'932cae55e50f1b35484cbdcf8c8d31ad064cbb9253cd5feb40af8e7280869959',
			'$ docker exec app printenv SHOP_MODE',
			'live'
		]
	},
	practice: {
		goal: 'app を SHOP_MODE=live で裏で動かし、docker exec app printenv SHOP_MODE で live を確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker-env' },
		success: { running: ['app'], output: 'live\n' },
		mistakes: [
			{
				when: '-e をイメージの名前より後ろに書いた',
				why: 'イメージの後ろは、中で動かす命令になる。-e が命令として動こうとした',
				next: '-e SHOP_MODE=live を、イメージの名前より前に書く',
				match: 'exec: "-e"'
			},
			{
				when: 'コンテナの名前を打ち違えた',
				why: 'その名前のコンテナは無い',
				next: 'docker ps で NAMES を確かめ、docker exec app と打つ',
				match: 'No such container'
			},
			{
				when: '無い設定のファイルを渡した',
				why: '--env-file に書いた名前のファイルは無い',
				next: 'ls で名前を確かめる（shop.env）',
				match: 'no such file or directory'
			}
		]
	},
	check: [
		{ ask: '-e の置き場所', how: 'イメージの名前より前' },
		{ ask: '中で読ませる包み方', how: '\'…\'（"…" は手元で読まれる）' },
		{ ask: 'まとめて渡す', how: '--env-file ファイル' },
		{ ask: '鍵を入れない所', how: 'イメージと git の記録' }
	]
};
