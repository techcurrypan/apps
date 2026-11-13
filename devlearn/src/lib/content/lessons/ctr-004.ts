// ctr-004 イメージを作る（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-004-build.json と比べてある
// （イメージとコンテナの ID は、本物では作るたびに変わるので模擬の値）。
// 場面：店の頁 index.html を、どの機械でも同じに出せるよう、頁ごとイメージに固める。経過時刻 t は cat Dockerfile を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const DF = 'Dockerfile';
const IMG = 'イメージ shop-web:1.0';

export const ctr004: Lesson = {
	id: 'ctr-004',
	field: 'ctr',
	level: 2,
	title: 'イメージを作る',
	goal: 'Dockerfile を書き、docker build でイメージを作ることができる',
	prereq: ['ctr-003'],
	related: [],
	next: ['ctr-005', 'ctr-008'],
	explain: [
		{
			n: 1,
			title: 'Dockerfile',
			lead: 'Dockerfile は、イメージの作り方を上から順に書いた物だ',
			body: [
				'cat Dockerfile は FROM・COPY・CMD の 3 行を返す。',
				'1 行が 1 つの命令で、docker build は上から順に行う。'
			],
			facts: [
				{ k: '1 行目', v: 'FROM busybox:1.37' },
				{ k: '2 行目', v: 'COPY index.html /www/index.html' },
				{ k: '3 行目', v: 'CMD ["httpd", "-f", "-p", "80", "-h", "/www"]' }
			],
			scene: [
				{ op: 'appear', id: 'df', label: DF, sub: '3 行', at: [0, 1] },
				{ op: 'appear', id: 'page', label: 'index.html', sub: '<p>shop</p>', at: [0, 2] }
			],
			log: { t: '0m', from: '端末', to: DF, kind: 'cat', info: '作り方は 3 行' }
		},
		{
			n: 2,
			title: 'FROM で土台',
			lead: 'FROM は、どのイメージの上に積むかを決める',
			body: [
				'FROM busybox:1.37 で、busybox の中身を土台にする。',
				'土台の層は、手元にあればそのまま使う。'
			],
			facts: [
				{ k: '土台', v: 'busybox:1.37' },
				{ k: 'build の行', v: '#4 [1/2] FROM docker.io/library/busybox:1.37' }
			],
			scene: [
				{ op: 'appear', id: 'base', label: '層 1', sub: 'busybox:1.37', at: [3, 2] },
				{ op: 'move', from: 'df', to: 'base', payload: 'FROM', kind: 'from' }
			],
			log: { t: '1m', from: DF, to: '層 1', kind: 'from', info: 'busybox を土台にした' }
		},
		{
			n: 3,
			title: 'COPY で入れる',
			lead: 'COPY は、手元のファイルをイメージの中へ写す',
			body: [
				'COPY index.html /www/index.html で、頁をイメージの /www に入れる。',
				'写せるのは、build に渡したフォルダ（.）の中の物だけだ。'
			],
			facts: [
				{ k: '手元', v: 'index.html' },
				{ k: 'イメージの中', v: '/www/index.html' },
				{ k: 'build の行', v: '#6 [2/2] COPY index.html /www/index.html' }
			],
			scene: [
				{ op: 'appear', id: 'copy', label: '層 2', sub: '/www/index.html', at: [3, 1] },
				{ op: 'move', from: 'page', to: 'copy', payload: 'COPY', kind: 'copy' }
			],
			log: { t: '1m', from: 'index.html', to: '層 2', kind: 'copy', info: '頁をイメージに写した' }
		},
		{
			n: 4,
			title: 'RUN で入れる',
			lead: 'RUN は、作る途中で命令を動かし、その結果を層に残す',
			body: [
				'RUN mkdir /www のように書くと、作る時に 1 度だけ動く。',
				'道具を入れる・フォルダを作るなど、動かす前の支度に使う（ctr-008）。'
			],
			facts: [
				{ k: '動く時', v: '作る時（build）' },
				{ k: '例', v: 'RUN mkdir /www && echo built > /www/build.txt' }
			],
			scene: [{ op: 'change', id: 'copy', k: 'RUN', v: '作る時に 1 度' }],
			log: { t: '1m', from: DF, to: '層', kind: 'run', info: 'RUN は作る時に動く' },
			why: '作る時に済ませておけば、動かすたびに支度をし直さずに済む'
		},
		{
			n: 5,
			title: 'CMD で始め方',
			lead: 'CMD は、コンテナを動かした時に始める命令を決める',
			body: [
				'CMD ["httpd", "-f", "-p", "80", "-h", "/www"] で、80 番で頁を出す。',
				'RUN と違い、作る時には動かない。動かすたびに動く。'
			],
			facts: [
				{ k: '動く時', v: 'docker run の時' },
				{ k: '始める命令', v: 'httpd -f -p 80 -h /www' }
			],
			scene: [
				{ op: 'appear', id: 'cmd', label: 'CMD', sub: 'httpd :80', at: [3, 0] },
				{ op: 'move', from: 'df', to: 'cmd', payload: 'CMD', kind: 'cmd' }
			],
			log: { t: '1m', from: DF, to: 'CMD', kind: 'cmd', info: '始め方は httpd' }
		},
		{
			n: 6,
			title: 'build で名前を付ける',
			lead: 'docker build -t 名前:タグ . で、イメージを作って名前を付ける',
			body: [
				'docker build -t shop-web:1.0 . の最後の . は、Dockerfile のあるフォルダだ。',
				'答えの終わりに naming to docker.io/library/shop-web:1.0 done と出る。',
				'docker images に shop-web 1.0 が増え、docker run で動かせる。'
			],
			facts: [
				{ k: '打った物', v: 'docker build -t shop-web:1.0 .' },
				{ k: 'docker images', v: 'shop-web   1.0' },
				{ k: 'curl の答え', v: '<p>shop</p>' }
			],
			scene: [
				{ op: 'appear', id: 'img', label: IMG, sub: '層 2 つ + CMD', at: [6, 1] },
				{ op: 'move', from: 'copy', to: 'img', payload: 'build', kind: 'build' }
			],
			log: {
				t: '1m',
				from: DF,
				to: IMG,
				kind: 'build',
				info: 'shop-web:1.0 ができた',
				size: '4.42MB'
			}
		}
	],
	example: {
		intro: 'Dockerfile からイメージを作り、動かして頁を見た（模擬は本物の記録と比べ済み）',
		lines: [
			'$ cat Dockerfile',
			'FROM busybox:1.37',
			'COPY index.html /www/index.html',
			'CMD ["httpd", "-f", "-p", "80", "-h", "/www"]',
			'$ docker build -t shop-web:1.0 .',
			'#0 building with "default" instance using docker driver',
			'',
			'#1 [internal] load build definition from Dockerfile',
			'#1 transferring dockerfile: 133B done',
			'#1 DONE 0.0s',
			'',
			'#2 [internal] load metadata for docker.io/library/busybox:1.37',
			'#2 DONE 0.0s',
			'',
			'#3 [internal] load .dockerignore',
			'#3 transferring context: 2B done',
			'#3 DONE 0.0s',
			'',
			'#4 [1/2] FROM docker.io/library/busybox:1.37',
			'#4 DONE 0.0s',
			'',
			'#5 [internal] load build context',
			'#5 transferring context: 49B done',
			'#5 DONE 0.0s',
			'',
			'#6 [2/2] COPY index.html /www/index.html',
			'#6 DONE 0.0s',
			'',
			'#7 exporting to image',
			'#7 exporting layers',
			'#7 exporting layers 0.4s done',
			'#7 writing image sha256:10dbcd63272cfcc038880bd16e996800ba6c5d3eb4e1a25252a2defaf6eeab41',
			'#7 writing image sha256:10dbcd63272cfcc038880bd16e996800ba6c5d3eb4e1a25252a2defaf6eeab41 done',
			'#7 naming to docker.io/library/shop-web:1.0 done',
			'#7 DONE 0.4s',
			'$ docker images',
			'REPOSITORY   TAG       IMAGE ID       CREATED              SIZE',
			'shop-web     1.0       10dbcd63272c   About a minute ago   4.42MB',
			'busybox      1.37      30ecbe150909   2 years ago          4.42MB',
			'$ docker run -d --name web -p 8080:80 shop-web:1.0',
			'1b1b0b79c4017e09c6a48983ba270f7c112a39c2557b92c7b94b39c9b6358127',
			'$ curl http://localhost:8080/',
			'<p>shop</p>'
		]
	},
	practice: {
		goal: 'Dockerfile から shop-web:1.0 を作り、web として手元の 8080 で動かし、curl で <p>shop</p> を確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker-build' },
		success: { images: ['shop-web:1.0'], running: ['web'], output: '<p>shop</p>\n' },
		mistakes: [
			{
				when: 'build に名前を付けずに、shop-web:1.0 を動かそうとした',
				why: '名前の無いイメージができただけで、shop-web:1.0 は手元に無い。置き場にも無い',
				next: 'docker build -t shop-web:1.0 . と、-t で名前を付けて作る',
				match: 'pull access denied'
			},
			{
				when: 'build の最後の . を忘れた',
				why: 'どのフォルダから作るかが無い',
				next: 'docker build -t shop-web:1.0 . と、最後に . を付ける',
				match: 'requires 1 argument'
			},
			{
				when: 'フォルダの名前を打ち違えた',
				why: 'そのフォルダは無い。Dockerfile は今いる場所にある',
				next: 'ls で Dockerfile を確かめ、フォルダを . にする',
				match: 'unable to prepare context'
			}
		]
	},
	check: [
		{ ask: 'FROM・COPY・CMD', how: '土台・ファイルを入れる・始める命令' },
		{ ask: 'RUN と CMD の違い', how: 'RUN は作る時、CMD は動かす時に動く' },
		{ ask: 'build の最後の .', how: 'Dockerfile と写すファイルのあるフォルダ' }
	]
};
