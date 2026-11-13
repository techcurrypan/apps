// ctr-008 層とキャッシュ（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-008-cache.json と比べてある
// （イメージの ID は、本物では作るたびに変わるので模擬の値）。
// 場面：店の頁 index.html だけを直して、新しい版 shop-web:1.1 を作る。毎回の build を速くしたい。経過時刻 t は 1 回目の build を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const L1 = '層 FROM';
const L2 = '層 RUN';
const L3 = '層 COPY';

export const ctr008: Lesson = {
	id: 'ctr-008',
	field: 'ctr',
	level: 3,
	title: '層とキャッシュ',
	goal: '層とキャッシュの仕組みで、build を速くし、イメージを小さくすることができる',
	prereq: ['ctr-004'],
	related: ['ci-005'],
	next: [],
	explain: [
		{
			n: 1,
			title: '命令ごとの層',
			lead: 'Dockerfile の命令 1 つが、イメージの層 1 つになる',
			body: [
				'FROM・RUN・COPY・CMD の 4 行を build すると、[1/3]〜[3/3] の 3 段が動く。',
				'CMD は中身を変えないので、大きさ 0B の印だけが残る。'
			],
			facts: [
				{ k: '[1/3]', v: 'FROM docker.io/library/busybox:1.37' },
				{ k: '[2/3]', v: 'RUN mkdir /www && echo built > /www/build.txt' },
				{ k: '[3/3]', v: 'COPY index.html /www/index.html' }
			],
			scene: [
				{ op: 'appear', id: 'l1', label: L1, sub: 'busybox:1.37', at: [0, 2] },
				{ op: 'appear', id: 'l2', label: L2, sub: 'mkdir /www', at: [0, 1] },
				{ op: 'appear', id: 'l3', label: L3, sub: 'index.html', at: [0, 0] }
			],
			log: { t: '0m', from: 'Dockerfile', to: 'shop-web:1.0', kind: 'build', info: '3 段で作った' }
		},
		{
			n: 2,
			title: '同じ層は使い回す',
			lead: '同じ命令・同じ入力なら、前に作った層を使い回す',
			body: [
				'何も変えずにもう一度 build すると、[2/3] と [3/3] が CACHED になる。',
				'動かさずに前の層を使ったので、#6 DONE 0.1s の行が無くなった。'
			],
			facts: [
				{ k: '[2/3] RUN', v: 'CACHED' },
				{ k: '[3/3] COPY', v: 'CACHED' }
			],
			scene: [
				{ op: 'change', id: 'l2', k: '2 回目', v: 'CACHED' },
				{ op: 'change', id: 'l3', k: '2 回目', v: 'CACHED' }
			],
			log: {
				t: '1m',
				from: 'キャッシュ',
				to: 'shop-web:1.0',
				kind: 'cache',
				info: '2 段とも使い回した'
			}
		},
		{
			n: 3,
			title: '変えた所から作り直す',
			lead: '入力が変わった層と、その上の層だけを作り直す',
			body: [
				'index.html を shop v2 に直してから、shop-web:1.1 を作る。',
				'[2/3] RUN は CACHED のまま、[3/3] COPY だけが DONE 0.0s で作り直された。'
			],
			facts: [
				{ k: '変えた物', v: 'index.html' },
				{ k: '[2/3] RUN', v: 'CACHED（そのまま）' },
				{ k: '[3/3] COPY', v: 'DONE（作り直し）' }
			],
			scene: [
				{ op: 'appear', id: 'n3', label: '層 COPY（新）', sub: 'shop v2', at: [3, 0] },
				{ op: 'move', from: 'l2', to: 'n3', payload: '上に積み直す', kind: 'build' }
			],
			log: {
				t: '3m',
				from: 'index.html',
				to: '層 COPY（新）',
				kind: 'build',
				info: 'COPY から上だけ作り直した'
			},
			why: '層は下から順に重なるので、下の層が同じなら、その上で変わった所だけを作ればよい'
		},
		{
			n: 4,
			title: '順を入れ替える',
			lead: 'よく変わる物ほど、Dockerfile の下に置く',
			body: [
				'COPY index.html を RUN より上に置くと、頁を直すたびに RUN も作り直しになる。',
				'変わりにくい支度（RUN）を上、よく変わる中身（COPY）を下に置く。'
			],
			facts: [
				{ k: '上に置く', v: '変わりにくい物（RUN の支度）' },
				{ k: '下に置く', v: 'よく変わる物（COPY の頁）' }
			],
			scene: [
				{ op: 'highlight', id: 'l2' },
				{ op: 'change', id: 'l2', k: '置き場', v: '上（変わりにくい）' }
			],
			log: { t: '3m', from: L2, to: L3, kind: 'order', info: 'よく変わる物を下に置く' }
		},
		{
			n: 5,
			title: '作る段と配る段',
			lead: '作る時だけ要る道具は、配るイメージに入れない',
			body: [
				'docker history shop-web:1.1 は、層ごとの大きさを返す。COPY は 15B、RUN は 6B だ。',
				'作る道具を 1 つ目の段で使い、できた物だけを 2 つ目の段へ COPY すると、配る物が小さくなる。'
			],
			facts: [
				{ k: 'COPY の層', v: '15B' },
				{ k: 'RUN の層', v: '6B' },
				{ k: '土台の層', v: '4.42MB' }
			],
			scene: [
				{ op: 'appear', id: 'hist', label: 'docker history', sub: '層ごとの大きさ', at: [6, 1] },
				{ op: 'move', from: 'n3', to: 'hist', payload: '15B', kind: 'size' }
			],
			log: {
				t: '4m',
				from: 'shop-web:1.1',
				to: 'docker history',
				kind: 'size',
				info: '層ごとの大きさを見た'
			}
		},
		{
			n: 6,
			title: '大きさを比べる',
			lead: 'docker images で、版ごとの大きさを比べる',
			body: [
				'docker images は shop-web の 1.1 と 1.0 を、どちらも 4.42MB で返す。',
				'ほとんどが土台の busybox で、2 つの版は土台の層を共に使っている。'
			],
			facts: [
				{ k: 'shop-web:1.1', v: '4.42MB' },
				{ k: 'shop-web:1.0', v: '4.42MB' },
				{ k: '共に使う層', v: 'busybox:1.37・RUN' }
			],
			scene: [
				{ op: 'move', from: 'l1', to: 'n3', payload: '共に使う', kind: 'share' },
				{ op: 'change', id: 'l1', k: '使う版', v: '1.0・1.1' }
			],
			log: {
				t: '5m',
				from: 'docker images',
				to: 'shop-web',
				kind: 'size',
				info: '2 つの版が土台を共に使う'
			}
		}
	],
	example: {
		intro: '同じ物を 2 回作り、頁だけ直して 3 回目を作った（模擬は本物の記録と比べ済み）',
		lines: [
			'$ cat Dockerfile',
			'FROM busybox:1.37',
			'RUN mkdir /www && echo built > /www/build.txt',
			'COPY index.html /www/index.html',
			'CMD ["httpd", "-f", "-p", "80", "-h", "/www"]',
			'$ docker build -t shop-web:1.0 .',
			'#0 building with "default" instance using docker driver',
			'',
			'#1 [internal] load build definition from Dockerfile',
			'#1 transferring dockerfile: 181B done',
			'#1 DONE 0.0s',
			'',
			'#2 [internal] load metadata for docker.io/library/busybox:1.37',
			'#2 DONE 0.0s',
			'',
			'#3 [internal] load .dockerignore',
			'#3 transferring context: 2B done',
			'#3 DONE 0.0s',
			'',
			'#4 [1/3] FROM docker.io/library/busybox:1.37',
			'#4 DONE 0.0s',
			'',
			'#5 [internal] load build context',
			'#5 transferring context: 49B done',
			'#5 DONE 0.0s',
			'',
			'#6 [2/3] RUN mkdir /www && echo built > /www/build.txt',
			'#6 DONE 0.1s',
			'',
			'#7 [3/3] COPY index.html /www/index.html',
			'#7 DONE 0.0s',
			'',
			'#8 exporting to image',
			'#8 exporting layers',
			'#8 exporting layers 0.4s done',
			'#8 writing image sha256:c0ae0d8ff021aa7bfc53cec5bff0e0a640e345d655189124ee838b615404353e',
			'#8 writing image sha256:c0ae0d8ff021aa7bfc53cec5bff0e0a640e345d655189124ee838b615404353e done',
			'#8 naming to docker.io/library/shop-web:1.0 done',
			'#8 DONE 0.4s',
			'$ docker build -t shop-web:1.0 .',
			'#0 building with "default" instance using docker driver',
			'',
			'#1 [internal] load build definition from Dockerfile',
			'#1 transferring dockerfile: 181B done',
			'#1 DONE 0.0s',
			'',
			'#2 [internal] load metadata for docker.io/library/busybox:1.37',
			'#2 DONE 0.0s',
			'',
			'#3 [internal] load .dockerignore',
			'#3 transferring context: 2B done',
			'#3 DONE 0.0s',
			'',
			'#4 [1/3] FROM docker.io/library/busybox:1.37',
			'#4 DONE 0.0s',
			'',
			'#5 [internal] load build context',
			'#5 transferring context: 31B done',
			'#5 DONE 0.0s',
			'',
			'#6 [2/3] RUN mkdir /www && echo built > /www/build.txt',
			'#6 CACHED',
			'',
			'#7 [3/3] COPY index.html /www/index.html',
			'#7 CACHED',
			'',
			'#8 exporting to image',
			'#8 exporting layers done',
			'#8 writing image sha256:c0ae0d8ff021aa7bfc53cec5bff0e0a640e345d655189124ee838b615404353e done',
			'#8 naming to docker.io/library/shop-web:1.0 done',
			'#8 DONE 0.0s',
			"$ echo '<p>shop v2</p>' > index.html",
			'$ docker build -t shop-web:1.1 .',
			'#0 building with "default" instance using docker driver',
			'',
			'#1 [internal] load build definition from Dockerfile',
			'#1 transferring dockerfile: 181B done',
			'#1 DONE 0.0s',
			'',
			'#2 [internal] load metadata for docker.io/library/busybox:1.37',
			'#2 DONE 0.0s',
			'',
			'#3 [internal] load .dockerignore',
			'#3 transferring context: 2B done',
			'#3 DONE 0.0s',
			'',
			'#4 [1/3] FROM docker.io/library/busybox:1.37',
			'#4 DONE 0.0s',
			'',
			'#5 [internal] load build context',
			'#5 transferring context: 52B done',
			'#5 DONE 0.0s',
			'',
			'#6 [2/3] RUN mkdir /www && echo built > /www/build.txt',
			'#6 CACHED',
			'',
			'#7 [3/3] COPY index.html /www/index.html',
			'#7 DONE 0.0s',
			'',
			'#8 exporting to image',
			'#8 exporting layers',
			'#8 exporting layers 0.4s done',
			'#8 writing image sha256:9cbc61090618098addc7327ac62daecf2711f85d0d285825edc74bf9cd8f4751',
			'#8 writing image sha256:9cbc61090618098addc7327ac62daecf2711f85d0d285825edc74bf9cd8f4751 done',
			'#8 naming to docker.io/library/shop-web:1.1 done',
			'#8 DONE 0.4s',
			'$ docker history shop-web:1.1',
			'IMAGE          CREATED              CREATED BY                                      SIZE      COMMENT',
			'9cbc61090618   About a minute ago   CMD ["httpd" "-f" "-p" "80" "-h" "/www"]        0B        buildkit.dockerfile.v0',
			'<missing>      About a minute ago   COPY index.html /www/index.html # buildkit      15B       buildkit.dockerfile.v0',
			'<missing>      4 minutes ago        RUN /bin/sh -c mkdir /www && echo built > /w…   6B        buildkit.dockerfile.v0',
			'<missing>      2 years ago          BusyBox 1.37.0 (glibc), Debian 13               4.42MB    ',
			'$ docker images',
			'REPOSITORY   TAG       IMAGE ID       CREATED         SIZE',
			'shop-web     1.1       9cbc61090618   2 minutes ago   4.42MB',
			'shop-web     1.0       c0ae0d8ff021   5 minutes ago   4.42MB',
			'busybox      1.37      30ecbe150909   2 years ago     4.42MB'
		]
	},
	practice: {
		goal: 'index.html を <p>shop v2</p> に直し、shop-web:1.1 を作る。RUN の層が CACHED になることを見る',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker-cache', prelude: ['docker build -t shop-web:1.0 .'] },
		success: { images: ['shop-web:1.0', 'shop-web:1.1'] },
		mistakes: [
			{
				when: '名前に大文字を使った',
				why: 'イメージの名前は小文字だけで付ける',
				next: 'docker build -t shop-web:1.1 . と、小文字で打つ',
				match: '大文字を含む名前'
			},
			{
				when: 'build の最後の . を忘れた',
				why: 'どのフォルダから作るかが無い',
				next: 'docker build -t shop-web:1.1 . と、最後に . を付ける',
				match: 'requires 1 argument'
			},
			{
				when: 'まだ無い版の層を見ようとした',
				why: 'その名前のイメージは、まだ作っていない',
				next: 'docker images で名前を確かめる',
				match: 'No such image'
			}
		]
	},
	check: [
		{ ask: 'CACHED になる時', how: '命令とその入力が、前に作った時と同じ' },
		{ ask: '入力が変わったとき', how: 'その層と、上に積んだ層だけを作り直す' },
		{ ask: 'よく変わる物の置き場', how: 'Dockerfile の下の方' }
	]
};
