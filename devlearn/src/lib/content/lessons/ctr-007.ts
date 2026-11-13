// ctr-007 まとめて動かす（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4・Docker Compose v2.38.2（Ubuntu 24.04）の記録
// tools-real/recorded/ctr-007-compose.json と比べてある。
// 場面：店の頁を出す web と、注文を受ける db の 2 つを、毎回同じ形で動かしたい。経過時刻 t は cat compose.yaml を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = '端末';
const YAML = 'compose.yaml';
const WEB = 'demo-web-1';
const DB = 'demo-db-1';

export const ctr007: Lesson = {
	id: 'ctr-007',
	field: 'ctr',
	level: 2,
	title: 'まとめて動かす',
	goal: 'compose で、複数のコンテナをまとめて動かすことができる',
	prereq: ['ctr-005', 'ctr-006'],
	related: [],
	next: ['ctr-009'],
	explain: [
		{
			n: 1,
			title: '2 つを手で動かす',
			lead: 'web と db を 1 つずつ動かすと、打つ物が長くなる',
			body: [
				'web には口のつなぎ（-p 8080:80）と始める命令、db には待つ口の命令が要る。',
				'順番や網も含めて毎回同じに打つのは、間違いのもとだ。'
			],
			facts: [
				{ k: '動かす物', v: 'web（頁）・db（注文）' },
				{ k: 'web の口', v: '8080:80' },
				{ k: 'db の口', v: '5432' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'docker run × 2', at: [0, 1] },
				{ op: 'highlight', id: 'me' }
			],
			log: { t: '0m', from: ME, to: ME, kind: 'plan', info: '2 つを毎回同じ形で動かしたい' }
		},
		{
			n: 2,
			title: 'compose の定義',
			lead: 'compose.yaml に、動かすコンテナを services として並べる',
			body: [
				'cat compose.yaml は、services の下に web と db を返す。',
				'web には ports と depends_on も書いてある。'
			],
			facts: [
				{ k: 'services', v: 'web・db' },
				{ k: 'web の ports', v: '"8080:80"' },
				{ k: 'web の depends_on', v: 'db' }
			],
			scene: [
				{ op: 'appear', id: 'yaml', label: YAML, sub: 'web・db', at: [0, 2] },
				{ op: 'change', id: 'yaml', k: 'depends_on', v: 'web → db' }
			],
			log: { t: '0m', from: ME, to: YAML, kind: 'cat', info: '2 つのサービスを定義した' }
		},
		{
			n: 3,
			title: 'up でまとめて',
			lead: 'docker compose up -d は、定義の全てを裏で動かす',
			body: [
				'答えは網 demo_default を作り、2 つのコンテナを Started にする。',
				'名前は フォルダの名前-サービス-番号 で、demo-web-1 と demo-db-1 になる。'
			],
			facts: [
				{ k: '作った網', v: 'demo_default' },
				{ k: 'コンテナ', v: 'demo-web-1・demo-db-1' }
			],
			scene: [
				{ op: 'appear', id: 'net', label: '網 demo_default', sub: 'compose が作る', at: [3, 0] },
				{ op: 'appear', id: 'db', label: DB, sub: 'nc :5432', at: [6, 0] },
				{ op: 'appear', id: 'web', label: WEB, sub: 'httpd :80', at: [6, 2] },
				{ op: 'move', from: 'yaml', to: 'web', payload: 'up -d', kind: 'up' }
			],
			log: {
				t: '1m',
				from: YAML,
				to: 'demo_default',
				kind: 'up',
				info: '網と 2 つのコンテナを作った'
			}
		},
		{
			n: 4,
			title: '順番',
			lead: 'depends_on に書いた物を先に動かす',
			body: [
				'web は depends_on: db なので、db が先に動き始める。',
				'先に動かすだけで、db の中の準備が済むまでは待たない。'
			],
			facts: [
				{ k: '始まった順', v: 'demo-db-1 → demo-web-1' },
				{ k: '待つ物', v: '動き始めまで（準備の済みまでは待たない）' }
			],
			scene: [
				{ op: 'change', id: 'db', k: '順', v: '1' },
				{ op: 'change', id: 'web', k: '順', v: '2' }
			],
			log: { t: '1m', from: DB, to: WEB, kind: 'order', info: 'db が先、web が後' },
			why: '頼る側を後に動かせば、動いた直後に相手が居ないという食い違いが減る'
		},
		{
			n: 5,
			title: '名前でつながる',
			lead: '同じ網のコンテナどうしは、サービスの名前で届く',
			body: [
				'docker compose exec -T web nc -z db 5432 の後、echo $? は 0 を返す。',
				'web から、名前 db で db の 5432 に届いた。curl http://localhost:8080/ は <p>shop</p> を返す。'
			],
			facts: [
				{ k: 'web → db:5432', v: '届く（0）' },
				{ k: '手元 → web', v: '<p>shop</p>' }
			],
			scene: [
				{ op: 'move', from: 'web', to: 'db', payload: 'db:5432', kind: 'connect' },
				{ op: 'move', from: 'me', to: 'web', payload: ':8080', kind: 'http' }
			],
			log: { t: '4m', from: WEB, to: DB, kind: 'connect', info: '名前 db で届いた' }
		},
		{
			n: 6,
			title: 'down でまとめて',
			lead: 'docker compose down は、up で作った物をまとめて止めて消す',
			body: [
				'答えは web から順に Stopped と Removed を返し、最後に網も Removed になる。',
				'docker compose ps は見出しの行だけになった。'
			],
			facts: [
				{ k: '消えた物', v: '2 つのコンテナと網' },
				{ k: '止めた順', v: 'demo-web-1 → demo-db-1' }
			],
			scene: [
				{ op: 'vanish', id: 'web' },
				{ op: 'vanish', id: 'db' },
				{ op: 'vanish', id: 'net' }
			],
			log: { t: '6m', from: YAML, to: 'demo_default', kind: 'down', info: 'まとめて止めて消した' }
		}
	],
	example: {
		intro: 'compose.yaml から 2 つを動かし、つながりを見て、片付けた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ cat compose.yaml',
			'services:',
			'  web:',
			'    image: busybox:1.37',
			'    command: ["sh", "-c", "echo \'<p>shop</p>\' > /tmp/index.html && exec httpd -f -p 80 -h /tmp"]',
			'    ports:',
			'      - "8080:80"',
			'    depends_on:',
			'      - db',
			'  db:',
			'    image: busybox:1.37',
			'    command: ["sh", "-c", "exec nc -lk -p 5432 -e cat"]',
			'$ docker compose up -d',
			' Network demo_default  Creating',
			' Network demo_default  Created',
			' Container demo-db-1  Creating',
			' Container demo-db-1  Created',
			' Container demo-web-1  Creating',
			' Container demo-web-1  Created',
			' Container demo-db-1  Starting',
			' Container demo-db-1  Started',
			' Container demo-web-1  Starting',
			' Container demo-web-1  Started',
			'$ docker compose ps',
			'NAME         IMAGE          COMMAND                  SERVICE   CREATED              STATUS              PORTS',
			'demo-db-1    busybox:1.37   "sh -c \'exec nc -lk …"   db        About a minute ago   Up About a minute   ',
			'demo-web-1   busybox:1.37   "sh -c \'echo \'<p>sho…"   web       About a minute ago   Up About a minute   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp',
			'$ curl http://localhost:8080/',
			'<p>shop</p>',
			'$ docker compose exec -T web nc -z db 5432',
			'$ echo $?',
			'0',
			'$ docker compose down',
			' Container demo-web-1  Stopping',
			' Container demo-web-1  Stopped',
			' Container demo-web-1  Removing',
			' Container demo-web-1  Removed',
			' Container demo-db-1  Stopping',
			' Container demo-db-1  Stopped',
			' Container demo-db-1  Removing',
			' Container demo-db-1  Removed',
			' Network demo_default  Removing',
			' Network demo_default  Removed',
			'$ docker compose ps',
			'NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS'
		]
	},
	practice: {
		goal: 'compose.yaml の web と db をまとめて裏で動かし、curl http://localhost:8080/ で <p>shop</p> を確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker-compose' },
		success: { running: ['demo-web-1', 'demo-db-1'], output: '<p>shop</p>\n' },
		mistakes: [
			{
				when: '-d を付けずに up した',
				why: '-d が無いと、up は前で動き続け、端末が戻らない',
				next: 'docker compose up -d と打つ',
				match: '-d を付けて打つ'
			},
			{
				when: '古い形の docker-compose と打った',
				why: 'この機械の compose は、docker の中の命令 docker compose（間に空白）だ',
				next: 'docker compose up -d と、空白で区切って打つ',
				match: 'docker-compose: command not found'
			},
			{
				when: '動かす前に curl した',
				why: '手元の 8080 では、まだ何も待っていない',
				next: '先に docker compose up -d を打つ',
				match: 'Failed to connect'
			}
		]
	},
	check: [
		{ ask: 'compose.yaml の services', how: '動かすコンテナの定義を並べる' },
		{ ask: 'まとめて動かす・止める', how: 'docker compose up -d・docker compose down' },
		{ ask: 'web から db へ', how: 'サービスの名前 db で届く' }
	]
};
