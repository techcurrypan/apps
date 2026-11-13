// sec-009 ファイアウォールの規則（段 10-0。fix の見本）。
// 場面：港の倉庫の Web の機械（203.0.113.10）の前に置いた門番（ファイアウォール）。管理の人は 192.0.2.0/24 の事務所から入る。
// 規則の書き方は devlearn の実戦の形（fix）で決めた物：allow|deny 運び方 ポート|any from 送り元|any。上から当て、最初に当たった 1 行で決まる。
// 経過時刻 t は、規則を読み込んだ時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const OFFICE = '事務所 192.0.2.5';
const GUEST = '客 198.51.100.7';
const FW = '門番';
const WEB = 'Web 203.0.113.10';

export const sec009: Lesson = {
	id: 'sec-009',
	field: 'sec',
	level: 2,
	title: 'ファイアウォールの規則',
	goal: '規則の並びから、通る通信と止まる通信を決めることができる',
	prereq: ['net-006'],
	related: ['cld-004'],
	next: ['sec-012'],
	explain: [
		{
			n: 1,
			title: '規則の並び',
			lead: '門番は、規則の表を上から順に持っている',
			body: [
				'ファイアウォールは、通信を通すか止めるかを決める門番だ。',
				'決め方は規則の表で、1 行に「通す・止める」と条件を書く。',
				'条件は運び方・宛先のポート・送り元の 3 つだ。'
			],
			facts: [
				{ k: '1 行の形', v: 'allow tcp 22 from 192.0.2.0/24' },
				{ k: 'allow / deny', v: '通す / 止める' },
				{ k: '守る機械', v: '203.0.113.10' }
			],
			scene: [
				{ op: 'appear', id: 'fw', label: FW, sub: '規則 0 行', at: [1, 0] },
				{ op: 'appear', id: 'web', label: WEB, sub: '守られる側', at: [2, 0] }
			],
			log: { t: '0s', from: FW, to: FW, kind: 'load', info: '規則の表を読み込んだ（まだ 0 行）' }
		},
		{
			n: 2,
			title: '上から当てる',
			lead: '最初に当たった 1 行で決まり、下は見ない',
			body: [
				'届いた通信を、表の 1 行目から順に比べる。',
				'条件が全て合った行で、通すか止めるかが決まる。',
				'決まったら、それより下の行は見ない。'
			],
			facts: [
				{ k: '比べる順', v: '1 行目 → 2 行目 → …' },
				{ k: '決まる行', v: '最初に条件が全て合った行' },
				{ k: 'どれにも合わない', v: '止める（deny）' }
			],
			scene: [
				{ op: 'change', id: 'fw', k: '当て方', v: '上から、最初の 1 行' },
				{ op: 'highlight', id: 'fw' }
			],
			log: { t: '0s', from: FW, to: FW, kind: 'rule', info: '上から当て、合わなければ止める' },
			why: '決まる行が 1 つだけなので、同じ通信はいつも同じ結果になる'
		},
		{
			n: 3,
			title: '22 を許す',
			lead: '管理の SSH は、事務所の網からだけ通す',
			body: [
				'SSH（遠くの機械に入る決まり）は 22 番を使う。',
				'誰からでも通すと、合言葉を当てに来る攻撃が届く。',
				'そこで送り元を事務所の網 192.0.2.0/24 に絞る。'
			],
			facts: [
				{ k: '1 行目', v: 'allow tcp 22 from 192.0.2.0/24' },
				{ k: '事務所 192.0.2.5 → 22', v: '1 行目に合う → 通す' }
			],
			scene: [
				{ op: 'appear', id: 'office', label: OFFICE, sub: '管理の人', at: [0, 0] },
				{ op: 'change', id: 'fw', k: '1 行目', v: 'allow tcp 22 from 192.0.2.0/24' },
				{ op: 'move', from: 'office', to: 'web', payload: 'tcp 22', kind: 'allow' }
			],
			log: {
				t: '1s',
				from: OFFICE,
				to: WEB,
				kind: 'allow',
				info: 'tcp 22 → 1 行目で通した',
				size: '60 B'
			}
		},
		{
			n: 4,
			title: '80 を許す',
			lead: '客の Web は、どこからでも通す',
			body: [
				'倉庫の頁は誰でも見られるように、80 番を誰からでも通す。',
				'送り元の any は「どこからでも」の意味だ。',
				'客 198.51.100.7 の通信は、1 行目に合わず 2 行目で決まる。'
			],
			facts: [
				{ k: '2 行目', v: 'allow tcp 80 from any' },
				{ k: '客 198.51.100.7 → 80', v: '1 行目は送り元が違う → 2 行目で通す' }
			],
			scene: [
				{ op: 'appear', id: 'guest', label: GUEST, sub: '頁を見る人', at: [0, 1] },
				{ op: 'change', id: 'fw', k: '2 行目', v: 'allow tcp 80 from any' },
				{ op: 'move', from: 'guest', to: 'web', payload: 'tcp 80', kind: 'allow' }
			],
			log: {
				t: '2s',
				from: GUEST,
				to: WEB,
				kind: 'allow',
				info: 'tcp 80 → 2 行目で通した',
				size: '60 B'
			}
		},
		{
			n: 5,
			title: '残りを止める',
			lead: '最後の行で、許していない物を全て止める',
			body: [
				'最後の行に deny tcp any from any を置く。',
				'客が 5432 番（データベースの口）を叩いても、ここで止まる。',
				'許す物を上に、止める物を一番下に置くのが基本の形だ。'
			],
			facts: [
				{ k: '3 行目', v: 'deny tcp any from any' },
				{ k: '客 198.51.100.7 → 5432', v: '1・2 行目に合わない → 3 行目で止める' }
			],
			scene: [
				{ op: 'change', id: 'fw', k: '3 行目', v: 'deny tcp any from any' },
				{ op: 'move', from: 'guest', to: 'fw', payload: 'tcp 5432', kind: 'deny' }
			],
			log: {
				t: '3s',
				from: GUEST,
				to: FW,
				kind: 'deny',
				info: 'tcp 5432 → 3 行目で止めた',
				size: '60 B'
			}
		},
		{
			n: 6,
			title: '順の誤りで穴が開く',
			lead: '広い許しが上にあると、下の止めが効かない',
			body: [
				'2 行目を allow tcp any from any に替えると、全ての口が通る。',
				'客の 5432 番も 2 行目で通り、3 行目の止めまで届かない。',
				'規則は 1 行ずつでなく、並びで読む。'
			],
			facts: [
				{ k: '誤った 2 行目', v: 'allow tcp any from any' },
				{ k: '客 198.51.100.7 → 5432', v: '2 行目で通す（穴）' }
			],
			scene: [
				{ op: 'change', id: 'fw', k: '2 行目', v: 'allow tcp any from any' },
				{ op: 'move', from: 'guest', to: 'web', payload: 'tcp 5432', kind: 'allow' },
				{ op: 'highlight', id: 'web' }
			],
			log: {
				t: '4s',
				from: GUEST,
				to: WEB,
				kind: 'allow',
				info: 'tcp 5432 → 2 行目で通った（穴）',
				size: '60 B'
			}
		}
	],
	example: {
		intro: '正しい 3 行の規則に、3 つの通信を当てた結果（左から 通信 → 決まった行 → 結果）',
		lines: [
			'1  allow tcp 22 from 192.0.2.0/24',
			'2  allow tcp 80 from any',
			'3  deny  tcp any from any',
			'',
			'192.0.2.5     → tcp 22    1 行目  通す',
			'198.51.100.7  → tcp 80    2 行目  通す',
			'198.51.100.7  → tcp 5432  3 行目  止める'
		]
	},
	practice: {
		goal: '並びの誤った規則を直し、管理の SSH と客の Web だけを通す',
		form: 'fix',
		setup: {
			engine: 'firewall',
			lines: [
				{ id: 'r1', text: 'deny tcp any from any' },
				{ id: 'r2', text: 'allow tcp 22 from any' },
				{ id: 'r3', text: 'allow tcp 80 from any' }
			],
			options: [
				{ line: 'r1', id: 'ssh', text: 'allow tcp 22 from 192.0.2.0/24' },
				{ line: 'r1', id: 'web', text: 'allow tcp 80 from any' },
				{ line: 'r1', id: 'all', text: 'allow tcp any from any' },
				{ line: 'r2', id: 'web', text: 'allow tcp 80 from any' },
				{ line: 'r2', id: 'ssh', text: 'allow tcp 22 from 192.0.2.0/24' },
				{ line: 'r3', id: 'deny', text: 'deny tcp any from any' }
			],
			cases: [
				{
					id: 'ssh',
					name: '事務所 192.0.2.5 → tcp 22',
					packet: { proto: 'tcp', port: 22, from: '192.0.2.5' }
				},
				{
					id: 'web',
					name: '客 198.51.100.7 → tcp 80',
					packet: { proto: 'tcp', port: 80, from: '198.51.100.7' }
				},
				{
					id: 'sshx',
					name: '客 198.51.100.7 → tcp 22',
					packet: { proto: 'tcp', port: 22, from: '198.51.100.7' }
				},
				{
					id: 'db',
					name: '客 198.51.100.7 → tcp 5432',
					packet: { proto: 'tcp', port: 5432, from: '198.51.100.7' }
				}
			]
		},
		success: { expect: { ssh: 'allow', web: 'allow', sshx: 'deny', db: 'deny' } },
		mistakes: [
			{
				when: '1 行目を allow tcp any from any に替えた',
				why: '全てを許す行が一番上にあると、どの通信もそこで通る。5432 番も客の 22 番も開いてしまう',
				next: '1 行目は事務所からの 22 番だけを許す行にし、止める行を一番下に置く',
				match: 'r1:all'
			},
			{
				when: '止める行を一番上に残した',
				why: '1 行目の deny tcp any from any に全ての通信が当たり、下の許しまで届かない。SSH も Web も止まる',
				next: '1 行目を許す行に替え、3 行目を deny tcp any from any にする',
				match: 'case:web:deny'
			},
			{
				when: '22 番を any から許したままにした',
				why: '客 198.51.100.7 からの 22 番も通り、合言葉を当てに来る攻撃が届く',
				next: '22 番の行の送り元を 192.0.2.0/24 にする',
				match: 'case:sshx:allow'
			}
		]
	},
	check: [
		{ ask: '当て方', how: '上から比べ、最初に合った 1 行で決まる' },
		{ ask: '止める行の置き場', how: 'deny tcp any from any は一番下' },
		{ ask: '穴の見つけ方', how: '止めたい通信を上から当て、どの行で決まるかを見る' }
	]
};
