// sec-003 共通鍵と公開鍵（sort）。
// 場面：店（shop.example.com）と客の hanako が、注文を網で安全にやり取りする。途中の機械は全てを見られる。
// 鍵の長さ・計算の速さの差は、よく使われる方式（AES-128・RSA-2048）での目安。経過時刻 t は店を開いた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const SHOP = '店';
const HANA = '客 hanako';
const EYE = '途中の機械';

export const sec003: Lesson = {
	id: 'sec-003',
	field: 'sec',
	level: 1,
	title: '共通鍵と公開鍵',
	goal: '共通鍵と公開鍵の暗号で、誰がどの鍵を使うかを決めることができる',
	prereq: [],
	related: [],
	next: ['sec-004', 'sec-008', 'net-009'],
	explain: [
		{
			n: 1,
			title: '共通の鍵',
			lead: '閉じる鍵と開ける鍵が同じ 1 本の暗号',
			body: [
				'共通鍵の暗号は、同じ 1 本の鍵で閉じて（暗号にして）、開ける（元に戻す）。',
				'AES-128 なら鍵は 128 ビット。大きなデータも速く閉じられる。',
				'店と hanako が同じ鍵を持てば、注文を閉じて送れる。'
			],
			facts: [
				{ k: '方式の例', v: 'AES-128' },
				{ k: '鍵の長さ', v: '128 ビット' },
				{ k: '閉じる鍵・開ける鍵', v: '同じ 1 本' }
			],
			scene: [
				{ op: 'appear', id: 'shop', label: SHOP, sub: 'shop.example.com', at: [3, 1] },
				{ op: 'appear', id: 'hana', label: HANA, sub: '注文する', at: [0, 1] },
				{ op: 'appear', id: 'k', label: '共通鍵', sub: '128 ビット', at: [1, 2] }
			],
			log: { t: '0m', from: HANA, to: SHOP, kind: 'idea', info: '同じ鍵で閉じて開ける' }
		},
		{
			n: 2,
			title: '渡し方が問題',
			lead: '共通鍵を網で送ると、途中で写される',
			body: [
				'初めて会う店と hanako は、まだ同じ鍵を持っていない。',
				'鍵を網で送ると、途中の機械に写され、以後の注文が全て読まれる。',
				'閉じずに鍵を送る道は無い。共通鍵だけでは、ここで行き詰まる。'
			],
			facts: [
				{ k: '持っている鍵', v: '（まだ無い）' },
				{ k: '網で送ると', v: '途中で写される' }
			],
			scene: [
				{ op: 'appear', id: 'eye', label: EYE, sub: '全てを見る', at: [1, 0] },
				{ op: 'move', from: 'shop', to: 'hana', payload: '共通鍵（そのまま）', kind: 'leak' },
				{ op: 'change', id: 'eye', k: '写した物', v: '共通鍵' }
			],
			log: { t: '1m', from: SHOP, to: HANA, kind: 'leak', info: '鍵を送ると途中で写される' }
		},
		{
			n: 3,
			title: '鍵の組',
			lead: '公開鍵の暗号は、組になった 2 本の鍵を使う',
			body: [
				'店は、公開鍵と秘密鍵の組を作る。片方で閉じた物は、組のもう片方でしか開けない。',
				'公開鍵は誰に配ってもよいが、秘密鍵は店の外に一度も出さない。',
				'公開鍵から秘密鍵を求めることは、計算の量が多すぎてできない。'
			],
			facts: [
				{ k: '方式の例', v: 'RSA-2048' },
				{ k: '公開鍵', v: '誰に配ってもよい' },
				{ k: '秘密鍵', v: '店だけが持つ' }
			],
			scene: [
				{ op: 'appear', id: 'pub', label: '店の公開鍵', sub: '配ってよい', at: [2, 2] },
				{ op: 'appear', id: 'priv', label: '店の秘密鍵', sub: '店だけ', at: [3, 2] }
			],
			log: { t: '2m', from: SHOP, to: SHOP, kind: 'keygen', info: '公開鍵と秘密鍵の組を作った' }
		},
		{
			n: 4,
			title: '公開鍵で閉じる',
			lead: '送る側は、受け取る側の公開鍵で閉じる',
			body: [
				'店は公開鍵を hanako に送る。途中で写されても困らない。',
				'hanako は、店の公開鍵で注文を閉じて送る。',
				'閉じた物は、途中の機械も、閉じた hanako 自身も開けない。'
			],
			facts: [
				{ k: '閉じる人', v: 'hanako（送る側）' },
				{ k: '使う鍵', v: '店の公開鍵' },
				{ k: '途中で開けるか', v: '開けない' }
			],
			scene: [
				{ op: 'move', from: 'shop', to: 'hana', payload: '店の公開鍵', kind: 'pub' },
				{ op: 'move', from: 'hana', to: 'shop', payload: '閉じた注文', kind: 'sealed' },
				{ op: 'change', id: 'eye', k: '写した物', v: '公開鍵・閉じた注文（読めない）' }
			],
			log: { t: '3m', from: HANA, to: SHOP, kind: 'sealed', info: '店の公開鍵で閉じて送った' }
		},
		{
			n: 5,
			title: '秘密鍵で開ける',
			lead: '開けられるのは、組の秘密鍵を持つ店だけ',
			body: [
				'店は、自分の秘密鍵で注文を開ける。',
				'秘密鍵を逆に使うと署名になる。店が秘密鍵で閉じた物は、店の公開鍵で誰でも確かめられる。',
				'公開鍵の計算は、共通鍵より 1000 倍ほど遅い。'
			],
			facts: [
				{ k: '開ける人', v: '店' },
				{ k: '使う鍵', v: '店の秘密鍵' },
				{ k: '速さ', v: '共通鍵の 1000 分の 1 ほど' }
			],
			scene: [
				{ op: 'move', from: 'priv', to: 'shop', payload: '開ける', kind: 'open' },
				{ op: 'change', id: 'shop', k: '注文', v: '読めた' }
			],
			log: { t: '3m', from: '店の秘密鍵', to: SHOP, kind: 'open', info: '秘密鍵で開けた' }
		},
		{
			n: 6,
			title: '2 つを組み合わせる',
			lead: '公開鍵で共通鍵を届け、後は共通鍵で速く運ぶ',
			body: [
				'hanako は新しい共通鍵を作り、店の公開鍵で閉じて送る。',
				'店は秘密鍵で開けて、同じ共通鍵を手に入れる。',
				'以後の注文と答えは、速い共通鍵で閉じる。HTTPS もこの組み合わせで動く。'
			],
			facts: [
				{ k: '鍵を届ける', v: '公開鍵の暗号' },
				{ k: 'データを運ぶ', v: '共通鍵の暗号' }
			],
			scene: [
				{
					op: 'move',
					from: 'hana',
					to: 'shop',
					payload: '共通鍵（公開鍵で閉じた）',
					kind: 'sealed'
				},
				{ op: 'change', id: 'k', k: '持つ人', v: '店と hanako' }
			],
			log: { t: '4m', from: HANA, to: SHOP, kind: 'hybrid', info: '共通鍵を公開鍵で閉じて届けた' },
			why: '公開鍵は鍵を渡す問題を解くが遅く、共通鍵は速いが渡せないので、互いの欠けを補う'
		}
	],
	example: {
		intro: '店と hanako が、注文を安全に運ぶまでの鍵の動き',
		lines: [
			'3m  店 → hanako     店の公開鍵             （写されても困らない）',
			'3m  hanako → 店     共通鍵 K               店の公開鍵で閉じた',
			'3m  店              共通鍵 K を取り出す    店の秘密鍵で開けた',
			'4m  hanako → 店     注文「食パン 2 斤」    共通鍵 K で閉じた',
			'4m  店 → hanako     答え「受け付けた」     共通鍵 K で閉じた'
		]
	},
	practice: {
		goal: '店と hanako のやり取りで、それぞれの場面で使う鍵を振り分ける',
		form: 'sort',
		setup: {
			items: [
				{ id: 'bulk', text: '決まった後の注文と答えを、速く閉じる' },
				{ id: 'sendkey', text: 'hanako が、作った共通鍵を閉じて店に送る' },
				{ id: 'openkey', text: '店が、届いた共通鍵を開ける' },
				{ id: 'sign', text: '店が、お知らせに署名を付ける' },
				{ id: 'verify', text: 'hanako が、お知らせの署名を確かめる' },
				{ id: 'publish', text: '店の頁に載せ、誰でも持ち帰れるようにする' }
			],
			bins: [
				{ id: 'common', label: '共通鍵' },
				{ id: 'pub', label: '店の公開鍵' },
				{ id: 'priv', label: '店の秘密鍵' }
			]
		},
		success: {
			bins: {
				bulk: 'common',
				sendkey: 'pub',
				openkey: 'priv',
				sign: 'priv',
				verify: 'pub',
				publish: 'pub'
			}
		},
		mistakes: [
			{
				when: '共通鍵を送るのに、店の秘密鍵を選んだ',
				why: '秘密鍵は店しか持たない。hanako は持っていないので、それで閉じられない',
				next: '受け取る店の公開鍵で閉じる',
				match: 'sendkey:priv'
			},
			{
				when: '署名を付けるのに、店の公開鍵を選んだ',
				why: '公開鍵は誰でも持つので、それで付けた印は誰にでも作れ、店が出した証にならない',
				next: '店だけが持つ秘密鍵で署名し、公開鍵で確かめてもらう',
				match: 'sign:pub'
			},
			{
				when: '大きな注文を、公開鍵で閉じることにした',
				why: '公開鍵の計算は共通鍵より 1000 倍ほど遅い。鍵を届けた後は共通鍵で運ぶ',
				next: '決まった後の注文と答えは、共通鍵に入れる',
				match: 'bulk:pub'
			},
			{
				when: '頁に載せる鍵に、秘密鍵を選んだ',
				why: '秘密鍵を配ると、誰でも店宛ての物を開け、店の署名を作れてしまう',
				next: '頁に載せるのは公開鍵にする',
				match: 'publish:priv'
			}
		]
	},
	check: [
		{ ask: '店に送る物を閉じる鍵', how: '店の公開鍵' },
		{ ask: '署名を付ける鍵', how: '店の秘密鍵（確かめるのは公開鍵）' },
		{ ask: '大きなデータを運ぶ鍵', how: '公開鍵で届けた共通鍵' }
	]
};
