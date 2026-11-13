// ctr-001 イメージから動かす（段 10-0。docker の見本）。
// 出力は本物の docker 28.0.4（Ubuntu 24.04）で打って記録した物（tools-real/recorded/ctr-001-run.json）と同じ形。
// コンテナの ID と名前は本物では打つたびに変わるので、模擬の値（打った順と作り物の時計で決まる）を書いた。
// 場面：手元にイメージが 1 つも無い機械で、busybox:1.37 を初めて動かす。経過時刻 t は最初の docker images を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = '端末';
const LOCAL = '手元のイメージ';
const REG = 'イメージの置き場';

export const ctr001: Lesson = {
	id: 'ctr-001',
	field: 'ctr',
	level: 1,
	title: 'イメージから動かす',
	goal: 'docker run で、イメージからコンテナを動かすことができる',
	prereq: ['lnx-001'],
	related: ['lnx-007'],
	next: ['ctr-002'],
	explain: [
		{
			n: 1,
			title: '手元のイメージは空',
			lead: 'docker images は、手元にあるイメージを並べる',
			body: [
				'イメージは、動かすのに要るファイルと設定を 1 つに固めた物だ。',
				'docker images を打つと、見出しの行だけが返った。',
				'この機械には、まだイメージが 1 つも無い。'
			],
			facts: [
				{ k: 'コマンド', v: 'docker images' },
				{ k: '返った行', v: 'REPOSITORY   TAG   IMAGE ID   CREATED   SIZE' },
				{ k: 'イメージの数', v: '0' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'local', label: LOCAL, sub: 'docker images', at: [1, 0] },
				{ op: 'change', id: 'local', k: '数', v: '0' }
			],
			log: { t: '0s', from: ME, to: LOCAL, kind: 'images', info: 'イメージは 0 件' }
		},
		{
			n: 2,
			title: '無ければ取ってくる',
			lead: 'docker run は、手元に無いイメージを置き場から取ってくる',
			body: [
				'docker run busybox:1.37 echo hello を打つ。busybox は小さな Linux の道具箱だ。',
				'手元に無いので Unable to find image と出て、置き場から取ってくる。',
				'取った物は Digest（中身から計算した ID）で確かめられる。'
			],
			facts: [
				{ k: 'コマンド', v: 'docker run busybox:1.37 echo hello' },
				{ k: '取った層', v: '68fe9bff2ad4' },
				{
					k: 'Digest',
					v: 'sha256:a7dbc319b1438115a207e11930dc4bb3e643dcb3ec0bdd694bb36cd8fad289ec'
				}
			],
			scene: [
				{ op: 'appear', id: 'reg', label: REG, sub: 'library/busybox', at: [2, 0] },
				{ op: 'move', from: 'reg', to: 'local', payload: 'busybox:1.37', kind: 'pull' },
				{ op: 'change', id: 'local', k: '数', v: '1' }
			],
			log: {
				t: '1s',
				from: REG,
				to: LOCAL,
				kind: 'pull',
				info: 'busybox:1.37 を取ってきた',
				size: '4.42MB'
			},
			why: '中身から計算した Digest で名指すので、同じ名前のイメージがすり替わっても気付ける'
		},
		{
			n: 3,
			title: 'コンテナで命令が動く',
			lead: 'イメージからコンテナを作り、その中で echo hello が動く',
			body: [
				'コンテナは、イメージを元に作った、閉じた実行の場だ。',
				'中で echo hello が動き、端末に hello が返った。',
				'名前を付けなかったので、tidy_sail という名前が自動で付いた。'
			],
			facts: [
				{ k: '中で動いた命令', v: 'echo hello' },
				{ k: '返った値', v: 'hello' },
				{ k: 'コンテナの名前', v: 'tidy_sail' }
			],
			scene: [
				{ op: 'appear', id: 'c1', label: 'tidy_sail', sub: 'コンテナ', at: [1, 1] },
				{ op: 'move', from: 'local', to: 'c1', payload: 'busybox:1.37', kind: 'create' },
				{ op: 'move', from: 'c1', to: 'me', payload: 'hello', kind: 'stdout' }
			],
			log: {
				t: '1s',
				from: 'tidy_sail',
				to: ME,
				kind: 'run',
				info: 'echo hello が動き、hello が返った'
			}
		},
		{
			n: 4,
			title: '命令が終わると止まる',
			lead: '中の命令が終わると、コンテナも止まる',
			body: [
				'docker ps -a は、止まった物も含めてコンテナを並べる。',
				'tidy_sail の STATUS は Exited (0) で、0 は命令がうまく終わった印だ。',
				'止まっても消えてはいない。消すまで一覧に残る。'
			],
			facts: [
				{ k: 'コマンド', v: 'docker ps -a' },
				{ k: 'COMMAND', v: '"echo hello"' },
				{ k: 'STATUS', v: 'Exited (0) About a minute ago' }
			],
			scene: [{ op: 'change', id: 'c1', k: '状態', v: 'Exited (0)' }],
			log: {
				t: '1m',
				from: ME,
				to: 'tidy_sail',
				kind: 'ps',
				info: 'tidy_sail は止まって残っている'
			},
			why: 'コンテナは中の命令 1 つのために作る場なので、その命令が終われば動く理由が無くなる'
		},
		{
			n: 5,
			title: '2 回目は取ってこない',
			lead: '手元にあるイメージは、そのまま使われる',
			body: [
				'docker images を打つと、busybox 1.37 が 1 行並ぶ。大きさは 4.42MB だ。',
				'もう一度 run しても、取ってくる行は出ない。',
				'イメージ 1 つから、コンテナはいくつでも作れる。'
			],
			facts: [
				{ k: 'REPOSITORY', v: 'busybox' },
				{ k: 'TAG', v: '1.37' },
				{ k: 'IMAGE ID', v: '30ecbe150909' },
				{ k: 'SIZE', v: '4.42MB' }
			],
			scene: [{ op: 'change', id: 'local', k: 'busybox:1.37', v: '30ecbe150909' }],
			log: { t: '2m', from: ME, to: LOCAL, kind: 'images', info: 'busybox 1.37 が 1 件ある' }
		},
		{
			n: 6,
			title: '--rm で終わったら消す',
			lead: '--rm を付けると、止まったコンテナが自動で消える',
			body: [
				'docker run --rm busybox:1.37 uname -s を打つと、Linux が返る。',
				'--rm（remove、消す）を付けたので、命令が終わるとコンテナは消える。',
				'試しに 1 回動かすだけなら、一覧が散らからない。'
			],
			facts: [
				{ k: 'コマンド', v: 'docker run --rm busybox:1.37 uname -s' },
				{ k: '返った値', v: 'Linux' },
				{ k: '残ったコンテナ', v: '0 件増えた' }
			],
			scene: [
				{ op: 'appear', id: 'c2', label: '名前無し', sub: '--rm', at: [2, 1] },
				{ op: 'move', from: 'c2', to: 'me', payload: 'Linux', kind: 'stdout' },
				{ op: 'vanish', id: 'c2' }
			],
			log: {
				t: '3m',
				from: LOCAL,
				to: ME,
				kind: 'run',
				info: 'uname -s が Linux を返し、コンテナは消えた'
			}
		},
		{
			n: 7,
			title: '-d で裏で動かす',
			lead: '-d を付けると、端末を返して裏で動き続ける',
			body: [
				'docker run -d --name clock busybox:1.37 sleep 600 を打つ。',
				'-d（detach、切り離す）なので、64 字の ID だけが返り、端末はすぐ空く。',
				'docker ps の STATUS は Up で、sleep 600 が 600 秒動き続ける。'
			],
			facts: [
				{ k: '名前', v: 'clock' },
				{ k: 'COMMAND', v: '"sleep 600"' },
				{ k: 'STATUS', v: 'Up About a minute' },
				{ k: 'ID の頭 12 字', v: 'cd6aa333ec8b' }
			],
			scene: [
				{ op: 'appear', id: 'clock', label: 'clock', sub: 'コンテナ', at: [1, 2] },
				{ op: 'move', from: 'local', to: 'clock', payload: 'busybox:1.37', kind: 'create' },
				{ op: 'change', id: 'clock', k: '状態', v: 'Up' }
			],
			log: {
				t: '4m',
				from: LOCAL,
				to: 'clock',
				kind: 'run',
				info: 'clock を裏で動かした。端末はすぐ空いた'
			}
		},
		{
			n: 8,
			title: '動かせないときの理由',
			lead: '名前が重なる・イメージが無いと、125 で止まる',
			body: [
				'同じ --name clock でもう一度動かすと、Conflict、名前が使われている、と返る。',
				'busybox:137 のようにタグを打ち違えると、manifest unknown、無い、と返る。',
				'どちらも終了コードは 125 で、コンテナは作られない。'
			],
			facts: [
				{ k: '名前が重なる', v: 'The container name "/clock" is already in use' },
				{ k: 'タグが無い', v: 'manifest for busybox:137 not found' },
				{ k: '終了コード', v: '125' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'clock', payload: '--name clock', kind: 'error' },
				{ op: 'change', id: 'me', k: '終了コード', v: '125' }
			],
			log: {
				t: '5m',
				from: ME,
				to: 'clock',
				kind: 'error',
				info: '名前 clock は使われている。作らなかった'
			}
		}
	],
	example: {
		intro: '空の機械で busybox:1.37 を初めて動かすまで。出力は標準出力の後に標準エラーを並べた',
		lines: [
			'$ docker images',
			'REPOSITORY   TAG       IMAGE ID   CREATED   SIZE',
			'$ docker run busybox:1.37 echo hello',
			'hello',
			"Unable to find image 'busybox:1.37' locally",
			'1.37: Pulling from library/busybox',
			'68fe9bff2ad4: Pulling fs layer',
			'68fe9bff2ad4: Verifying Checksum',
			'68fe9bff2ad4: Download complete',
			'68fe9bff2ad4: Pull complete',
			'Digest: sha256:a7dbc319b1438115a207e11930dc4bb3e643dcb3ec0bdd694bb36cd8fad289ec',
			'Status: Downloaded newer image for busybox:1.37',
			'$ docker images',
			'REPOSITORY   TAG       IMAGE ID       CREATED       SIZE',
			'busybox      1.37      30ecbe150909   2 years ago   4.42MB',
			'$ docker run --rm busybox:1.37 uname -s',
			'Linux'
		]
	},
	practice: {
		goal: 'busybox:1.37 から clock という名前のコンテナを裏で動かす',
		tool: { name: 'docker', mode: 'mock' },
		setup: { images: [] },
		success: { running: ['clock'] },
		mistakes: [
			{
				when: 'タグを打ち違えた（busybox:137 など）',
				why: 'その名前のイメージは置き場に無い。docker は manifest unknown と返し、コンテナを作らない',
				next: 'タグを 1.37 にして打ち直す。手元にある名前は docker images で確かめられる',
				match: 'manifest unknown'
			},
			{
				when: '同じ名前 clock で 2 回目を動かした',
				why: '名前は 1 つのコンテナにしか付けられない。docker は Conflict と返す',
				next: 'docker ps で clock が Up かを確かめる。もう動いていれば、それで合格している',
				match: 'is already in use by container'
			},
			{
				when: 'イメージの名前を打ち違えた（buzybox など）',
				why: 'その名前の置き場が無い。docker は pull access denied と返す',
				next: 'イメージの名前を busybox:1.37 にして打ち直す',
				match: 'pull access denied'
			}
		]
	},
	check: [
		{ ask: 'clock が動いているか', how: 'docker ps の NAMES に clock、STATUS に Up が出る' },
		{ ask: '手元にイメージがあるか', how: 'docker images に busybox 1.37 が出る' },
		{ ask: '中の命令', how: 'docker ps の COMMAND が "sleep 600"' }
	]
};
