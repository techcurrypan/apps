// sec-002 パスワードを守って保存する（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、coreutils 9.4 の sha256sum）の記録
// tools-real/recorded/sec-002-hash.json と一字ずつ比べてある。
// 場面：店の会員の帳簿に、hanako の合言葉 password123 をどう置くかを決める。経過時刻 t は帳簿を開いた時を 0m とした。
// 本物の帳簿では、ハッシュの計算をわざと遅くした仕組み（bcrypt・Argon2 など）を使う。ここでは仕組みを見るため sha256sum を使う。
import type { Lesson } from '../../lesson/types.ts';

const USER = '会員 hanako';
const BOOK = '会員の帳簿';
const THIEF = '盗んだ者';

export const sec002: Lesson = {
	id: 'sec-002',
	field: 'sec',
	level: 1,
	title: 'パスワードを守って保存する',
	goal: 'ハッシュとソルトで、パスワードを守って保存する仕組みを確かめることができる',
	prereq: ['sec-001'],
	related: ['prg-012'],
	next: ['sec-003'],
	explain: [
		{
			n: 1,
			title: '平文で置く危うさ',
			lead: '合言葉をそのまま置くと、盗まれた時に全てが読まれる',
			body: [
				'帳簿に hanako:password123 と書くと、帳簿を盗んだ者に合言葉がそのまま渡る。',
				'同じ合言葉を別のサイトでも使う人は多く、被害は店の外にも広がる。',
				'店の係も読めてしまう。合言葉は、店にも分からない形で置く。'
			],
			facts: [
				{ k: '帳簿の行', v: 'hanako:password123' },
				{ k: '盗まれたとき', v: '合言葉がそのまま読まれる' }
			],
			scene: [
				{ op: 'appear', id: 'user', label: USER, sub: 'password123', at: [0, 1] },
				{ op: 'appear', id: 'book', label: BOOK, sub: '平文', at: [2, 1] },
				{ op: 'move', from: 'user', to: 'book', payload: 'password123', kind: 'plain' }
			],
			log: { t: '0m', from: USER, to: BOOK, kind: 'plain', info: '合言葉をそのまま置いた' }
		},
		{
			n: 2,
			title: 'ハッシュにする',
			lead: 'ハッシュは、元に戻せない決まった長さの要約',
			body: [
				"printf 'password123' | sha256sum は、64 字の ef92b778…e94f を返す。",
				'SHA-256 は、どんな長さの入力も 256 ビット（16 進数で 64 字）にまとめる。',
				'64 字から元の合言葉を逆に求める方法は無い。帳簿にはこの 64 字を置く。'
			],
			facts: [
				{ k: '入力', v: 'password123' },
				{ k: 'sha256sum', v: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f' },
				{ k: '長さ', v: '64 字（256 ビット）' }
			],
			scene: [
				{ op: 'appear', id: 'hash', label: 'SHA-256', sub: '戻せない要約', at: [1, 0] },
				{ op: 'change', id: 'book', k: 'hanako', v: 'ef92b778…e94f' }
			],
			log: { t: '1m', from: 'SHA-256', to: BOOK, kind: 'hash', info: 'ef92b778… を置いた' }
		},
		{
			n: 3,
			title: '同じ語は同じ値',
			lead: '同じ入力からは、いつも同じハッシュが出る',
			body: [
				'password123 を何度ハッシュにしても ef92b778… だ。1 字違う password124 は 33631376… で全く違う。',
				'同じ合言葉の会員は、帳簿に同じ値が並ぶ。',
				'盗んだ者は、よくある語のハッシュの表を先に作り、引き当てられる。'
			],
			facts: [
				{ k: 'password123', v: 'ef92b778…e94f' },
				{ k: 'password124', v: '33631376…0087' },
				{ k: '会員 taro も password123', v: 'ef92b778…e94f（同じ）' }
			],
			scene: [
				{ op: 'appear', id: 'thief', label: THIEF, sub: 'よくある語の表', at: [3, 0] },
				{
					op: 'move',
					from: 'thief',
					to: 'book',
					payload: 'ef92b778… = password123',
					kind: 'lookup'
				}
			],
			log: {
				t: '2m',
				from: THIEF,
				to: BOOK,
				kind: 'attack',
				info: '表を引いて password123 と当てた'
			}
		},
		{
			n: 4,
			title: 'ソルトを混ぜる',
			lead: '会員ごとに違う字（ソルト）を、合言葉の前に付ける',
			body: [
				'hanako にはソルト salt1:、taro には salt2: を決め、帳簿に一緒に置く。',
				'ハッシュにするのは salt1:password123 のように、ソルトを付けた字だ。',
				'ソルトは隠さなくてよい。会員ごとに違うことが大事だ。'
			],
			facts: [
				{ k: 'hanako のソルト', v: 'salt1:' },
				{ k: 'taro のソルト', v: 'salt2:' },
				{ k: 'ハッシュにする字', v: 'salt1:password123' }
			],
			scene: [
				{ op: 'appear', id: 'salt', label: 'ソルト', sub: '会員ごと', at: [1, 2] },
				{ op: 'move', from: 'salt', to: 'hash', payload: 'salt1:', kind: 'salt' }
			],
			log: { t: '3m', from: 'ソルト', to: 'SHA-256', kind: 'salt', info: 'salt1: を前に付けた' },
			why: '会員ごとに入力が変わるので、盗んだ者が先に作った表が使えず、1 人ずつ当て直させられる'
		},
		{
			n: 5,
			title: '値が変わる',
			lead: '同じ合言葉でも、ソルトが違えば別の値になる',
			body: [
				"printf 'salt1:password123' | sha256sum は 08104983…6fff を返す。",
				'salt2:password123 は a9e3d96d…42b3 で、taro と hanako の値は並ばない。',
				'echo で打つと末尾の改行も入力に入り、8f61d865… と別の値になる。'
			],
			facts: [
				{ k: 'salt1:password123', v: '08104983…6fff' },
				{ k: 'salt2:password123', v: 'a9e3d96d…42b3' },
				{ k: "echo 'salt1:password123'", v: '8f61d865…d920（改行を含む）' }
			],
			scene: [
				{ op: 'change', id: 'book', k: 'hanako', v: 'salt1: 08104983…' },
				{ op: 'change', id: 'book', k: 'taro', v: 'salt2: a9e3d96d…' },
				{ op: 'change', id: 'thief', k: '表', v: '当たらない' }
			],
			log: { t: '4m', from: 'SHA-256', to: BOOK, kind: 'hash', info: '2 人の値が別になった' }
		},
		{
			n: 6,
			title: '確かめ方',
			lead: '入った時は、打った合言葉を同じ手順でハッシュにして比べる',
			body: [
				'hanako が password123 と打つと、店は帳簿の salt1: を付けてハッシュにする。',
				'出た 08104983… が帳簿の値と同じなら通す。違えば断る。',
				'店は合言葉を一度も置かずに、正しいかだけを確かめられる。'
			],
			facts: [
				{ k: '打った合言葉', v: 'password123' },
				{ k: '計算した値', v: '08104983…6fff' },
				{ k: '帳簿の値と', v: '同じ → 通す' }
			],
			scene: [
				{ op: 'move', from: 'user', to: 'hash', payload: 'password123', kind: 'login' },
				{ op: 'move', from: 'hash', to: 'book', payload: '08104983… と比べる', kind: 'compare' },
				{ op: 'change', id: 'user', k: '結果', v: '通った' }
			],
			log: { t: '5m', from: USER, to: BOOK, kind: 'login', info: 'ハッシュが同じなので通した' }
		}
	],
	example: {
		intro: '同じ語・1 字違い・ソルト・改行の有無で、ハッシュを比べた（模擬は本物の記録と比べ済み）',
		lines: [
			"$ printf 'password123' | sha256sum",
			'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f  -',
			"$ printf 'password124' | sha256sum",
			'33631376724e5d5480fa397dfcf03b66ad47b934ab495174d7058c38f2bb0087  -',
			"$ printf 'salt1:password123' | sha256sum",
			'08104983926495c68a57058bf5b2195f03d68d3417e8cae6b528c2ec70e66fff  -',
			"$ printf 'salt2:password123' | sha256sum",
			'a9e3d96de8873e668257214947a9fbb498ab9e33fe2df722d2c8042013c242b3  -',
			"$ echo 'salt1:password123' | sha256sum",
			'8f61d865cd4a35a9123f187417ec164251337a2f2def81b6137e5531ee6dd920  -'
		]
	},
	practice: {
		goal: 'hanako の合言葉 password123 に、ソルト salt1: を前に付けたハッシュを sha256sum で出す',
		tool: { name: 'shell', mode: 'mock' },
		setup: {},
		success: {
			output: '08104983926495c68a57058bf5b2195f03d68d3417e8cae6b528c2ec70e66fff  -\n'
		},
		mistakes: [
			{
				when: 'ソルトを付けずにハッシュにした',
				why: 'ソルトが無いと、同じ合言葉の会員と同じ値になり、よくある語の表で当てられる',
				next: "printf 'salt1:password123' | sha256sum と、ソルトを前に付ける",
				match: 'ef92b778bafe771e'
			},
			{
				when: 'echo で渡した',
				why: 'echo は末尾に改行を付ける。改行も入力の 1 字なので、別の値になる',
				next: "改行を付けない printf を使い、printf 'salt1:password123' | sha256sum と打つ",
				match: '8f61d865cd4a35a9'
			},
			{
				when: 'md5sum や sha1sum を使った',
				why: '模擬の端末はそれらを扱わない。MD5 と SHA-1 は、同じ値になる別の入力が見つかっていて、守りに使わない',
				next: 'sha256sum を使う',
				match: 'を扱わない'
			}
		]
	},
	check: [
		{ ask: '帳簿に置く物', how: 'ソルトと、ソルトを付けた合言葉のハッシュ' },
		{ ask: 'ソルトの役目', how: '同じ合言葉でも会員ごとに別の値になる' },
		{ ask: '入った時の確かめ', how: '同じ手順でハッシュにし、帳簿の値と比べる' }
	]
};
