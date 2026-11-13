// ctr-005 データを残す（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-005-volume.json と比べてある。
// 場面：店の売上 120 をコンテナの中に書いたら、コンテナを消した時に失った。ボリュームに置いて残す。経過時刻 t は最初の docker run を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = '端末';
const VOL = 'ボリューム shopdata';

export const ctr005: Lesson = {
	id: 'ctr-005',
	field: 'ctr',
	level: 2,
	title: 'データを残す',
	goal: 'ボリュームで、コンテナを消してもデータを残すことができる',
	prereq: ['ctr-004'],
	related: ['db-006'],
	next: ['ctr-007'],
	explain: [
		{
			n: 1,
			title: '中に書いたデータ',
			lead: 'コンテナの中に書いたファイルは、そのコンテナの中にだけある',
			body: [
				'コンテナ memo の中で echo 120 > /data.txt を動かす。',
				'memo の中の /data.txt に 120 が書かれ、memo は止まった。'
			],
			facts: [
				{ k: '書いた場所', v: 'コンテナ memo の /data.txt' },
				{ k: '中身', v: '120' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'docker run', at: [0, 1] },
				{ op: 'appear', id: 'memo', label: 'コンテナ memo', sub: '/data.txt', at: [3, 0] },
				{ op: 'move', from: 'me', to: 'memo', payload: 'echo 120', kind: 'write' }
			],
			log: { t: '0m', from: ME, to: 'コンテナ memo', kind: 'write', info: '中に 120 を書いた' }
		},
		{
			n: 2,
			title: '消すと失う',
			lead: 'コンテナを消すと、中に書いたデータも消える',
			body: [
				'docker rm memo の後、新しいコンテナで cat /data.txt を打つ。',
				"答えは cat: can't open '/data.txt' で、ファイルが無い。",
				'新しいコンテナは、イメージの元の中身から始まる。'
			],
			facts: [
				{ k: '消した物', v: 'コンテナ memo' },
				{ k: 'cat の答え', v: "cat: can't open '/data.txt'" }
			],
			scene: [
				{ op: 'vanish', id: 'memo' },
				{ op: 'appear', id: 'new', label: '新しいコンテナ', sub: 'イメージの元のまま', at: [3, 2] },
				{ op: 'highlight', id: 'new' }
			],
			log: { t: '2m', from: ME, to: '新しいコンテナ', kind: 'read', info: '/data.txt は無い' },
			why: 'コンテナはいつでも消して作り直せる使い捨ての場なので、残す物は外に分けて置く'
		},
		{
			n: 3,
			title: 'ボリュームを作る',
			lead: 'ボリュームは、コンテナの外にあるデータの置き場だ',
			body: [
				'docker volume create shopdata は shopdata と返す。',
				'docker volume ls は local shopdata の行を返す。'
			],
			facts: [
				{ k: '作った物', v: 'shopdata' },
				{ k: 'DRIVER', v: 'local（この機械の中）' }
			],
			scene: [
				{ op: 'appear', id: 'vol', label: VOL, sub: '空', at: [6, 1] },
				{ op: 'move', from: 'me', to: 'vol', payload: 'volume create', kind: 'volume' }
			],
			log: { t: '3m', from: ME, to: VOL, kind: 'volume', info: 'shopdata を作った' }
		},
		{
			n: 4,
			title: 'つなぐ',
			lead: '-v 名前:中の場所 で、ボリュームをコンテナの中のフォルダにつなぐ',
			body: [
				'-v shopdata:/data を付けると、中の /data が shopdata になる。',
				'/data/sales.txt に 120 を書くと、ボリュームに書かれる。'
			],
			facts: [
				{ k: '付けた物', v: '-v shopdata:/data' },
				{ k: '書いた場所', v: '/data/sales.txt（中身はボリュームに）' }
			],
			scene: [
				{ op: 'appear', id: 'w', label: '書くコンテナ', sub: '-v shopdata:/data', at: [3, 0] },
				{ op: 'move', from: 'w', to: 'vol', payload: 'sales.txt = 120', kind: 'write' },
				{ op: 'change', id: 'vol', k: 'sales.txt', v: '120' }
			],
			log: {
				t: '5m',
				from: '書くコンテナ',
				to: VOL,
				kind: 'write',
				info: 'ボリュームに 120 を書いた'
			}
		},
		{
			n: 5,
			title: '消して作り直す',
			lead: '--rm のコンテナは終わると消えるが、ボリュームは残る',
			body: [
				'書いたコンテナは --rm で動かしたので、終わると同時に消えた。',
				'ボリューム shopdata は、どのコンテナとも別に残っている。'
			],
			facts: [
				{ k: '書いたコンテナ', v: '消えた（--rm）' },
				{ k: 'shopdata の sales.txt', v: '120' }
			],
			scene: [
				{ op: 'vanish', id: 'w' },
				{ op: 'highlight', id: 'vol' }
			],
			log: {
				t: '5m',
				from: '書くコンテナ',
				to: VOL,
				kind: 'rm',
				info: 'コンテナは消え、データは残る'
			}
		},
		{
			n: 6,
			title: 'データが残る',
			lead: '別のコンテナにつなぎ直すと、残したデータを読める',
			body: [
				'新しいコンテナに -v shopdata:/data を付けて cat /data/sales.txt を打つ。',
				'答えは 120 だ。コンテナが替わっても、データは続いている。'
			],
			facts: [
				{ k: '打った物', v: 'docker run --rm -v shopdata:/data busybox:1.37 cat /data/sales.txt' },
				{ k: '答え', v: '120' }
			],
			scene: [
				{ op: 'appear', id: 'r', label: '読むコンテナ', sub: '-v shopdata:/data', at: [3, 2] },
				{ op: 'move', from: 'vol', to: 'r', payload: '120', kind: 'read' }
			],
			log: { t: '6m', from: VOL, to: '読むコンテナ', kind: 'read', info: '120 が読めた' }
		}
	],
	example: {
		intro: '中に書いて失い、ボリュームに書いて残した（模擬は本物の記録と比べ済み）',
		lines: [
			"$ docker run --name memo busybox:1.37 sh -c 'echo 120 > /data.txt'",
			'$ docker rm memo',
			'memo',
			'$ docker run --rm busybox:1.37 cat /data.txt',
			"cat: can't open '/data.txt': No such file or directory",
			'$ docker volume create shopdata',
			'shopdata',
			'$ docker volume ls',
			'DRIVER    VOLUME NAME',
			'local     shopdata',
			"$ docker run --rm -v shopdata:/data busybox:1.37 sh -c 'echo 120 > /data/sales.txt'",
			'$ docker run --rm -v shopdata:/data busybox:1.37 cat /data/sales.txt',
			'120'
		]
	},
	practice: {
		goal: 'ボリューム shopdata の /data/sales.txt に 120 を書き、別のコンテナで cat して 120 を確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker' },
		success: { volumes: ['shopdata'], output: '120\n' },
		mistakes: [
			{
				when: 'ボリュームをつながずに読もうとした',
				why: '-v が無いと、/data はイメージの元の中身のままで、sales.txt は無い',
				next: '-v shopdata:/data を付けて cat /data/sales.txt を打つ',
				match: "can't open '/data/sales.txt'"
			},
			{
				when: 'ボリュームの外の /data.txt に書いた',
				why: 'ボリュームにつないだのは /data の中だけだ。/data.txt はコンテナと一緒に消えた',
				next: '/data/sales.txt と、/data の中に書く',
				match: "can't open '/data.txt'"
			}
		]
	},
	check: [
		{ ask: 'コンテナを消すと', how: '中に書いたデータも消える' },
		{ ask: '-v shopdata:/data', how: '中の /data を、ボリューム shopdata につなぐ' },
		{ ask: 'データが残る所', how: 'ボリューム（コンテナの外）' }
	]
};
