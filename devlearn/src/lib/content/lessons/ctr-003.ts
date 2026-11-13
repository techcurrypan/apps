// ctr-003 ポートをつなぐ（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-003-port.json と比べてある
// （コンテナの ID は、本物では打つたびに変わるので模擬の値）。
// 場面：店の頁を出すイメージ shop-web:1.0（中の httpd が 80 番で待つ）を動かしたが、手元のブラウザから見えない。
// 経過時刻 t は最初の curl を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const HOST = '手元の機械';
const WEB = 'コンテナ web';

export const ctr003: Lesson = {
	id: 'ctr-003',
	field: 'ctr',
	level: 1,
	title: 'ポートをつなぐ',
	goal: '-p で、手元のポートとコンテナのポートをつなぐことができる',
	prereq: ['ctr-002'],
	related: ['net-006'],
	next: ['ctr-004'],
	explain: [
		{
			n: 1,
			title: '中で 80 を待つ',
			lead: 'コンテナ web の中では、httpd が 80 番で頁を出している',
			body: [
				'shop-web:1.0 は、httpd -f -p 80 -h /www で始まるイメージだ。',
				'docker ps の COMMAND に "httpd -f -p 80 -h /…" と出る。PORTS の欄は空だ。'
			],
			facts: [
				{ k: '中の口', v: '80' },
				{ k: 'PORTS の欄', v: '（空）' }
			],
			scene: [
				{ op: 'appear', id: 'host', label: HOST, sub: 'curl', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: 'httpd :80', at: [3, 1] },
				{ op: 'change', id: 'web', k: '待つ口', v: '80' }
			],
			log: { t: '0m', from: HOST, to: WEB, kind: 'ps', info: '中で 80 番を待っている' }
		},
		{
			n: 2,
			title: '外から届かない',
			lead: 'コンテナの口は、そのままでは手元の機械から届かない',
			body: [
				'curl http://localhost:8080/ は Failed to connect を返す。',
				'docker port web は何も返さない。つないだ口が 1 つも無い。'
			],
			facts: [
				{ k: 'curl の答え', v: 'curl: (7) Failed to connect to localhost port 8080' },
				{ k: 'docker port web', v: '（何も出ない）' }
			],
			scene: [
				{ op: 'move', from: 'host', to: 'web', payload: ':8080', kind: 'fail' },
				{ op: 'highlight', id: 'web' }
			],
			log: { t: '1m', from: HOST, to: WEB, kind: 'fail', info: '8080 には何も待っていない' },
			why: 'コンテナは閉じた場なので、外へ出す口を人が選ぶ。選ばない口は外から触れない'
		},
		{
			n: 3,
			title: '-p 8080:80',
			lead: '-p 手元:中 で、手元の口とコンテナの口をつなぐ',
			body: [
				'口は動かした後に足せないので、docker rm -f web で消して作り直す。',
				'docker run -d --name web -p 8080:80 shop-web:1.0 と打つ。',
				'左の 8080 が手元、右の 80 がコンテナの中の口だ。'
			],
			facts: [
				{ k: '打った物', v: 'docker run -d --name web -p 8080:80 shop-web:1.0' },
				{ k: '手元の口', v: '8080' },
				{ k: '中の口', v: '80' }
			],
			scene: [
				{ op: 'appear', id: 'map', label: '-p 8080:80', sub: 'つなぎ', at: [1, 0] },
				{ op: 'move', from: 'map', to: 'web', payload: '8080 → 80', kind: 'port' }
			],
			log: { t: '3m', from: HOST, to: WEB, kind: 'port', info: '手元の 8080 を中の 80 につないだ' }
		},
		{
			n: 4,
			title: '手元の 8080 へ',
			lead: 'docker port web は、つないだ口を返す',
			body: [
				'docker port web は、80/tcp からつないだ先を 2 行で返す。',
				'0.0.0.0 と [::] は、手元の全ての宛先（IPv4 と IPv6）で待つ印だ。'
			],
			facts: [
				{ k: '1 行目', v: '80/tcp -> 0.0.0.0:8080' },
				{ k: '2 行目', v: '80/tcp -> [::]:8080' }
			],
			scene: [{ op: 'change', id: 'host', k: '待つ口', v: '8080' }],
			log: { t: '4m', from: HOST, to: WEB, kind: 'port', info: '手元の 8080 で待つ' }
		},
		{
			n: 5,
			title: '中の 80 へ届く',
			lead: '手元の 8080 に来た要求は、コンテナの 80 へ渡る',
			body: [
				'curl http://localhost:8080/ は <p>shop</p> を返す。',
				'要求は手元の 8080 で受けられ、コンテナ web の 80 へ渡った。'
			],
			facts: [
				{ k: 'curl の答え', v: '<p>shop</p>' },
				{ k: '道筋', v: '手元 8080 → web 80' }
			],
			scene: [
				{ op: 'move', from: 'host', to: 'web', payload: 'GET /', kind: 'http' },
				{ op: 'move', from: 'web', to: 'host', payload: '<p>shop</p>', kind: 'http' }
			],
			log: { t: '5m', from: HOST, to: WEB, kind: 'http', info: '<p>shop</p> が返った' }
		},
		{
			n: 6,
			title: '口が重なると',
			lead: '手元の 1 つの口は、1 つのコンテナにしかつなげない',
			body: [
				'web2 も -p 8080:80 で動かすと、port is already allocated と断られる。',
				'中の口は同じ 80 でよいが、手元の口は -p 8081:80 のように替える。'
			],
			facts: [
				{ k: '答え', v: 'Bind for 0.0.0.0:8080 failed: port is already allocated' },
				{ k: '直し方', v: '手元の口を替える（-p 8081:80）' }
			],
			scene: [
				{ op: 'appear', id: 'web2', label: 'コンテナ web2', sub: '-p 8080:80', at: [3, 2] },
				{ op: 'move', from: 'web2', to: 'host', payload: ':8080', kind: 'fail' },
				{ op: 'highlight', id: 'web2' }
			],
			log: {
				t: '6m',
				from: 'コンテナ web2',
				to: HOST,
				kind: 'fail',
				info: '8080 は web が使っている'
			}
		}
	],
	example: {
		intro:
			'口をつながずに動かし、届かないのを見てから、-p で作り直した（模擬は本物の記録と比べ済み）',
		lines: [
			'$ docker ps',
			'CONTAINER ID   IMAGE          COMMAND                  CREATED              STATUS              PORTS     NAMES',
			'86aca8ef4339   shop-web:1.0   "httpd -f -p 80 -h /…"   About a minute ago   Up About a minute             web',
			'$ curl http://localhost:8080/',
			"curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn't connect to server",
			'$ docker port web',
			'$ docker rm -f web',
			'web',
			'$ docker run -d --name web -p 8080:80 shop-web:1.0',
			'14458a7bd7cbfaf994091241e2bd30be5fcb85b7642da1e11e95cf0dae14bd45',
			'$ docker port web',
			'80/tcp -> 0.0.0.0:8080',
			'80/tcp -> [::]:8080',
			'$ curl http://localhost:8080/',
			'<p>shop</p>',
			'$ docker run -d --name web2 -p 8080:80 shop-web:1.0',
			'1c9c16b484b4a88f980a05236b2639e64fceed5ea5f0a35111c0adeef8f27670',
			'docker: Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint web2 (fcc297c56bdd1c2339564808640a19cda7d97e97f67cd76570b02b633a529194): Bind for 0.0.0.0:8080 failed: port is already allocated',
			'',
			"Run 'docker run --help' for more information"
		]
	},
	practice: {
		goal: 'web を作り直して手元の 8080 を中の 80 につなぎ、curl http://localhost:8080/ で <p>shop</p> を確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: {
			world: 'docker-build',
			prelude: ['docker build -t shop-web:1.0 .', 'docker run -d --name web shop-web:1.0']
		},
		success: { running: ['web'], output: '<p>shop</p>\n' },
		mistakes: [
			{
				when: 'つないでいない口へ curl した',
				why: '手元の 8080 では、まだ何も待っていない',
				next: 'docker rm -f web の後に、-p 8080:80 を付けて動かし直す',
				match: 'Failed to connect'
			},
			{
				when: '消さずに同じ名前 web で動かした',
				why: '名前 web は、前のコンテナがまだ使っている',
				next: '先に docker rm -f web で前の web を消す',
				match: 'is already in use by container'
			},
			{
				when: '手元の 8080 を、2 つのコンテナにつなごうとした',
				why: '手元の 1 つの口は、1 つのコンテナにしかつなげない',
				next: 'docker ps で 8080 を使う物を確かめ、要らない方を消す',
				match: 'port is already allocated'
			}
		]
	},
	check: [
		{ ask: '-p 8080:80 の左右', how: '左が手元の口、右がコンテナの中の口' },
		{ ask: 'つないだ口の確かめ方', how: 'docker port web' },
		{ ask: '口を後から足す', how: 'できない。消して -p を付けて作り直す' }
	]
};
