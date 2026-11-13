// ctr-002 止めて片付ける（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-002-lifecycle.json と比べてある
// （コンテナの ID と、何分前かの値は、本物では打つたびに変わるので模擬の値）。
// 場面：試しに動かしたコンテナ web（裏で動き続ける）と once（すぐ終わった）が残っている。経過時刻 t は最初の docker ps を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = '端末';
const WEB = 'web';
const ONCE = 'once';

export const ctr002: Lesson = {
	id: 'ctr-002',
	field: 'ctr',
	level: 1,
	title: '止めて片付ける',
	goal: 'docker ps・stop・rm で、コンテナを止めて片付けることができる',
	prereq: ['ctr-001'],
	related: ['lnx-007'],
	next: ['ctr-003'],
	explain: [
		{
			n: 1,
			title: 'ps で動く物',
			lead: 'docker ps は、今動いているコンテナだけを並べる',
			body: [
				'docker ps は web の 1 行を返す。STATUS は Up（動いている）だ。',
				'once は echo done を打ってすぐ終わったので、この一覧に出ない。'
			],
			facts: [
				{ k: 'docker ps の行', v: 'web だけ' },
				{ k: 'web の STATUS', v: 'Up 2 minutes' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'docker ps', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: 'sleep 600', at: [2, 0] },
				{ op: 'change', id: 'web', k: '状態', v: 'Up' }
			],
			log: { t: '0m', from: ME, to: WEB, kind: 'ps', info: '動いているのは web だけ' }
		},
		{
			n: 2,
			title: 'ps -a で止まった物',
			lead: 'docker ps -a は、止まったコンテナも並べる',
			body: [
				'docker ps -a は once と web の 2 行を返す。',
				'once の STATUS は Exited (0)。0 は、中の命令が正しく終わった印だ。',
				'止まったコンテナも、消すまで機械に残る。'
			],
			facts: [
				{ k: 'docker ps -a の行', v: 'once・web' },
				{ k: 'once の STATUS', v: 'Exited (0) 2 minutes ago' }
			],
			scene: [
				{ op: 'appear', id: 'once', label: ONCE, sub: 'echo done', at: [2, 2] },
				{ op: 'change', id: 'once', k: '状態', v: 'Exited (0)' }
			],
			log: { t: '1m', from: ME, to: ONCE, kind: 'ps', info: '止まった once も残っている' }
		},
		{
			n: 3,
			title: 'stop で止める',
			lead: 'docker stop は、中の命令に終わりを頼み、コンテナを止める',
			body: [
				'docker stop web は web と返す。',
				'ps -a の web は Exited (137) になった。sleep は頼みに応えず、10 秒後に打ち切られた。',
				'137 は、外から打ち切られて終わった印だ。'
			],
			facts: [
				{ k: '答え', v: 'web' },
				{ k: '止めた後の STATUS', v: 'Exited (137)' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'web', payload: 'stop', kind: 'stop' },
				{ op: 'change', id: 'web', k: '状態', v: 'Exited (137)' }
			],
			log: { t: '2m', from: ME, to: WEB, kind: 'stop', info: 'web を止めた' }
		},
		{
			n: 4,
			title: 'rm で消す',
			lead: 'docker rm は、止まったコンテナを消す',
			body: [
				'docker rm web once は、消した名前を 1 行ずつ返す。',
				'ps -a は見出しの行だけになった。残っている物は無い。'
			],
			facts: [
				{ k: '答え', v: 'web / once' },
				{ k: 'docker ps -a', v: '見出しの行だけ' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'web', payload: 'rm', kind: 'rm' },
				{ op: 'vanish', id: 'web' },
				{ op: 'vanish', id: 'once' }
			],
			log: { t: '4m', from: ME, to: 'web・once', kind: 'rm', info: '2 つとも消した' }
		},
		{
			n: 5,
			title: '動いている物は消せない',
			lead: '動いているコンテナに rm を打つと、断られる',
			body: [
				'動いている app に docker rm app を打つと、container is running と断られる。',
				'先に stop で止めるか、rm -f で止めて消す。'
			],
			facts: [
				{ k: '答え', v: 'cannot remove container "/app": container is running' },
				{ k: '直し方', v: 'docker stop app の後に docker rm app' }
			],
			scene: [
				{ op: 'appear', id: 'app', label: 'app', sub: 'Up', at: [2, 1] },
				{ op: 'move', from: 'me', to: 'app', payload: 'rm', kind: 'rm' },
				{ op: 'highlight', id: 'app' }
			],
			log: { t: '6m', from: ME, to: 'app', kind: 'error', info: '動いているので消せない' },
			why: '動いている物を黙って消すと、中の処理が途中で失われる。止める手を 1 つ挟ませる'
		},
		{
			n: 6,
			title: '消すと中身も消える',
			lead: 'コンテナを消すと、その中で書いたファイルも消える',
			body: [
				'コンテナの中で書いた物は、そのコンテナと一緒に消える。',
				'残したいデータは、コンテナの外に置く（ctr-005）。'
			],
			facts: [
				{ k: '消える物', v: 'コンテナの中で書いたファイル' },
				{ k: '残る物', v: 'イメージ busybox:1.37' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'app', payload: 'rm -f', kind: 'rm' },
				{ op: 'vanish', id: 'app' }
			],
			log: { t: '7m', from: ME, to: 'app', kind: 'rm', info: '止めて消した。中身も消えた' }
		}
	],
	example: {
		intro: '止まった物を見つけ、止めて片付けた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ docker ps',
			'CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS         PORTS     NAMES',
			'c63bdb8fe15c   busybox:1.37   "sleep 600"   2 minutes ago   Up 2 minutes             web',
			'$ docker ps -a',
			'CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS                     PORTS     NAMES',
			'61aebb8680fd   busybox:1.37   "echo done"   2 minutes ago   Exited (0) 2 minutes ago             once',
			'c63bdb8fe15c   busybox:1.37   "sleep 600"   3 minutes ago   Up 3 minutes                         web',
			'$ docker stop web',
			'web',
			'$ docker ps -a',
			'CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS                            PORTS     NAMES',
			'61aebb8680fd   busybox:1.37   "echo done"   4 minutes ago   Exited (0) 4 minutes ago                    once',
			'c63bdb8fe15c   busybox:1.37   "sleep 600"   5 minutes ago   Exited (137) About a minute ago             web',
			'$ docker rm web once',
			'web',
			'once',
			'$ docker ps -a',
			'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES',
			'$ docker run -d --name app busybox:1.37 sleep 600',
			'd58fe92ef1be0e1a8d0ffae0486989abe035c95d2b4415079bad86fbda4b25b1',
			'$ docker rm app',
			'Error response from daemon: cannot remove container "/app": container is running: stop the container before removing or force remove',
			'$ docker rm -f app',
			'app'
		]
	},
	practice: {
		goal: '動いている web を止め、止まっている once と一緒に消す',
		tool: { name: 'docker', mode: 'mock' },
		setup: {
			world: 'docker',
			prelude: [
				'docker run -d --name web busybox:1.37 sleep 600',
				'docker run --name once busybox:1.37 echo done'
			]
		},
		success: { absent: ['web', 'once'] },
		mistakes: [
			{
				when: '動いている web を、止めずに rm した',
				why: '動いているコンテナは、docker rm では消せない',
				next: '先に docker stop web を打ち、その後に docker rm web once と打つ',
				match: 'container is running'
			},
			{
				when: 'コンテナの名前を打ち違えた',
				why: 'その名前のコンテナは無い',
				next: 'docker ps -a で NAMES の列を確かめる',
				match: 'No such container'
			}
		]
	},
	check: [
		{ ask: 'ps と ps -a の違い', how: 'ps は動いている物、ps -a は止まった物も' },
		{ ask: '止めてから消す', how: 'docker stop web の後に docker rm web' },
		{ ask: '消したコンテナの中身', how: '中で書いたファイルも一緒に消える' }
	]
};
