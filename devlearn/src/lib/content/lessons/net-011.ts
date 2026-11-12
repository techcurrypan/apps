// net-011 DHCP でアドレスをもらう（order）。
// 場面：事務所の網 192.168.10.0/24 に、新しいノート PC（MAC 02:00:00:00:00:a7）をつなぐ。
// 配る係（DHCP の係）はルーター 192.168.10.1 が兼ねる。貸す期間は 86400 秒（24 時間）。
// 手順と更新の時期は RFC 2131 を自分の言葉でまとめた物。経過時刻 t は線をつないだ時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const PC = 'ノート PC';
const SV = '配る係 192.168.10.1';
const ALL = '網の全員';

export const net011: Lesson = {
	id: 'net-011',
	field: 'net',
	level: 2,
	title: 'DHCP でアドレスをもらう',
	goal: 'DHCP の 4 つのやり取りを並べ、配られる値を確かめることができる',
	prereq: ['net-010'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: 'アドレスが無い',
			lead: 'つないだばかりの PC は、自分の IP アドレスを持たない',
			body: [
				'線をつないだノート PC は、MAC 02:00:00:00:00:a7 だけを持つ。',
				'IP アドレスはまだ 0.0.0.0、つまり「無い」だ。',
				'誰に尋ねればよいかも知らない。DHCP（番号を配る決まり）で、もらいに行く。'
			],
			facts: [
				{ k: 'MAC', v: '02:00:00:00:00:a7' },
				{ k: 'IP アドレス', v: '0.0.0.0（無い）' }
			],
			scene: [{ op: 'appear', id: 'pc', label: PC, sub: '0.0.0.0', at: [0, 1] }],
			log: { t: '0s', from: PC, to: PC, kind: 'link', info: '線をつないだ。番号は無い' }
		},
		{
			n: 2,
			title: 'DISCOVER',
			lead: '網の全員に「番号を配る係はいるか」と叫ぶ',
			body: [
				'PC は DHCPDISCOVER を、宛先 255.255.255.255（全員）に送る。',
				'送り元は 0.0.0.0 の 68 番、宛先は 67 番、運び方は UDP だ。',
				'中に自分の MAC を入れ、誰が頼んだかを知らせる。'
			],
			facts: [
				{ k: '印', v: 'DHCPDISCOVER' },
				{ k: '送り元 → 宛先', v: '0.0.0.0:68 → 255.255.255.255:67' },
				{ k: '頼んだ者', v: '02:00:00:00:00:a7' }
			],
			scene: [
				{ op: 'appear', id: 'all', label: ALL, sub: '255.255.255.255', at: [1, 0] },
				{ op: 'move', from: 'pc', to: 'all', payload: 'DISCOVER', kind: 'discover' }
			],
			log: {
				t: '0.1s',
				from: PC,
				to: ALL,
				kind: 'DHCP',
				info: 'DISCOVER（配る係はいるか）',
				size: '342 B'
			}
		},
		{
			n: 3,
			title: 'OFFER',
			lead: '配る係が、貸せる番号と網の決まりを申し出る',
			body: [
				'配る係 192.168.10.1 が DHCPOFFER を返す。',
				'中身は、貸す番号 192.168.10.57、マスク 255.255.255.0、出口 192.168.10.1 だ。',
				'名前の問い合わせ先 192.168.10.1 と、貸す期間 86400 秒も添える。'
			],
			facts: [
				{ k: '貸す番号', v: '192.168.10.57' },
				{ k: 'マスク・出口', v: '255.255.255.0・192.168.10.1' },
				{ k: '貸す期間', v: '86400 秒（24 時間）' }
			],
			scene: [
				{ op: 'appear', id: 'sv', label: SV, sub: '配る係', at: [3, 1] },
				{ op: 'move', from: 'sv', to: 'pc', payload: 'OFFER 192.168.10.57', kind: 'offer' }
			],
			log: {
				t: '0.2s',
				from: SV,
				to: PC,
				kind: 'DHCP',
				info: 'OFFER 192.168.10.57・86400 秒',
				size: '342 B'
			}
		},
		{
			n: 4,
			title: 'REQUEST',
			lead: 'PC が「その番号をください」と、また全員に送る',
			body: [
				'PC は DHCPREQUEST を全員宛てに送る。中身は 192.168.10.57 と、選んだ係 192.168.10.1 だ。',
				'全員宛てにするのは、ほかの係にも「あなたの申し出は使わない」と知らせるためだ。',
				'この時点では、PC はまだ番号を使わない。'
			],
			facts: [
				{ k: '印', v: 'DHCPREQUEST' },
				{ k: '頼む番号', v: '192.168.10.57' },
				{ k: '選んだ係', v: '192.168.10.1' }
			],
			scene: [
				{ op: 'move', from: 'pc', to: 'all', payload: 'REQUEST 192.168.10.57', kind: 'request' },
				{ op: 'change', id: 'pc', k: '頼んだ番号', v: '192.168.10.57' }
			],
			log: {
				t: '0.3s',
				from: PC,
				to: ALL,
				kind: 'DHCP',
				info: 'REQUEST 192.168.10.57（係は 192.168.10.1）',
				size: '342 B'
			},
			why: '係が 2 台いる網では申し出が 2 つ届くので、どれを選んだかを全員に知らせ、選ばれなかった番号を返させる'
		},
		{
			n: 5,
			title: 'ACK',
			lead: '係が確かに貸したと返し、PC が番号を使い始める',
			body: [
				'配る係が DHCPACK を返す。係の帳簿に「57 は 02:00:00:00:00:a7 に貸した」と残る。',
				'PC は 192.168.10.57/24 を自分に付け、出口を 192.168.10.1 にする。',
				'ここで初めて、ほかの機械と話せる。'
			],
			facts: [
				{ k: '印', v: 'DHCPACK' },
				{ k: 'PC の番号', v: '192.168.10.57/24' },
				{ k: '係の帳簿', v: '192.168.10.57 ⇔ 02:00:00:00:00:a7' }
			],
			scene: [
				{ op: 'move', from: 'sv', to: 'pc', payload: 'ACK', kind: 'ack' },
				{ op: 'change', id: 'pc', k: '番号', v: '192.168.10.57/24' }
			],
			log: {
				t: '0.4s',
				from: SV,
				to: PC,
				kind: 'DHCP',
				info: 'ACK。192.168.10.57 を使い始めた',
				size: '342 B'
			}
		},
		{
			n: 6,
			title: '期限と更新',
			lead: '貸す期間の半分で、続けて借りたいと頼む',
			body: [
				'86400 秒の半分、43200 秒（12 時間）で、PC は係に直に REQUEST を送る。',
				'係が ACK を返すと、期限はそこから 86400 秒に戻る。',
				'返事の無いまま期限が切れると、番号を手放し、DISCOVER からやり直す。'
			],
			facts: [
				{ k: '更新を頼む時', v: '43200 秒（期間の半分）' },
				{ k: '更新の宛先', v: '192.168.10.1（直に）' },
				{ k: '更新後の期限', v: 'そこから 86400 秒' }
			],
			scene: [
				{ op: 'move', from: 'pc', to: 'sv', payload: 'REQUEST（更新）', kind: 'renew' },
				{ op: 'change', id: 'pc', k: '期限', v: '86400 秒に戻った' }
			],
			log: {
				t: '43200s',
				from: PC,
				to: SV,
				kind: 'DHCP',
				info: '期間の半分で更新を頼んだ',
				size: '342 B'
			}
		}
	],
	example: {
		intro: 'ノート PC が番号をもらい、12 時間後に更新するまで',
		lines: [
			'    0.1s  0.0.0.0:68       → 255.255.255.255:67  DHCPDISCOVER  02:00:00:00:00:a7',
			'    0.2s  192.168.10.1:67  → 255.255.255.255:68  DHCPOFFER     192.168.10.57 期間 86400',
			'    0.3s  0.0.0.0:68       → 255.255.255.255:67  DHCPREQUEST   192.168.10.57 係 192.168.10.1',
			'    0.4s  192.168.10.1:67  → 255.255.255.255:68  DHCPACK       192.168.10.57/24 出口 192.168.10.1',
			'43200.0s  192.168.10.57:68 → 192.168.10.1:67     DHCPREQUEST   更新',
			'43200.1s  192.168.10.1:67  → 192.168.10.57:68    DHCPACK       期限 86400'
		]
	},
	practice: {
		goal: 'ノート PC が番号をもらって使い始め、更新するまでを、起きる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'request', text: 'PC が全員宛てに REQUEST 192.168.10.57 を送る' },
				{ id: 'use', text: 'PC が 192.168.10.57/24 を自分に付ける' },
				{ id: 'discover', text: 'PC が全員宛てに DISCOVER を送る' },
				{ id: 'renew', text: '43200 秒後、PC が係に直に更新を頼む' },
				{ id: 'ack', text: '係が ACK を返す' },
				{ id: 'offer', text: '係が OFFER 192.168.10.57 を返す' }
			]
		},
		success: { orders: [['discover', 'offer', 'request', 'ack', 'use', 'renew']] },
		mistakes: [
			{
				when: 'REQUEST を OFFER より前に置いた',
				why: 'PC は、申し出を受けて初めて、頼む番号を知る',
				next: 'OFFER の札の後に REQUEST の札を置く',
				match: 'request<offer'
			},
			{
				when: '番号を付けるのを ACK より前に置いた',
				why: 'ACK で係の帳簿に載るまでは、貸したことになっていない。先に使うと、ほかの機械と重なる恐れがある',
				next: 'ACK の札の後に、番号を付ける札を置く',
				match: 'use<ack'
			},
			{
				when: 'OFFER を DISCOVER より前に置いた',
				why: '係は、DISCOVER が届いて初めて、番号の要る PC がいると知る',
				next: 'DISCOVER の札を一番上に置く',
				match: 'offer<discover'
			}
		]
	},
	check: [
		{ ask: '4 つのやり取りの順', how: 'DISCOVER → OFFER → REQUEST → ACK' },
		{ ask: '配られた値', how: '192.168.10.57/24・出口 192.168.10.1・期間 86400 秒' },
		{ ask: '更新の時', how: '期間の半分の 43200 秒' }
	]
};
