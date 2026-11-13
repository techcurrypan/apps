// sec-008 SSH の鍵で入る（shell 模擬。世界 ssh）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、OpenSSH 9.6）の記録
// tools-real/recorded/sec-008-ssh.json と一字ずつ比べてある（鍵の指紋と絵の中身は、鍵が毎回変わるので比べない。計算の仕方は本物と同じ）。
// 場面：作業の機械 devbox から、店の機械 ssh.example.com（192.0.2.22）に入る。2 台は家（/home/learner）を共有する教室の形で、
// 手元の ~/.ssh/authorized_keys がそのまま相手の物になる。共有しない機械では、公開鍵を相手の同じ場所に写す（ssh-copy-id など）。
// 経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'devbox（learner）';
const SRV = 'ssh.example.com 192.0.2.22';
const AK = 'authorized_keys';

export const sec008: Lesson = {
	id: 'sec-008',
	field: 'sec',
	level: 2,
	title: 'SSH の鍵で入る',
	goal: 'ssh-keygen で鍵を作り、公開鍵で SSH に入る流れを追うことができる',
	prereq: ['sec-003', 'lnx-004'],
	related: ['cld-008'],
	next: [],
	explain: [
		{
			n: 1,
			title: '合言葉の弱さ',
			lead: '合言葉で入る口は、当てずっぽうに試され続ける',
			body: [
				'SSH（網の向こうの機械を操る決まり）は 22 番で待つ。',
				'合言葉で入れる口は、世界中から 1 日に何千回も当てずっぽうで試される。',
				'この機械は合言葉を受けず、鍵だけで入れる。初めは Permission denied (publickey) で断られる。'
			],
			facts: [
				{ k: '口', v: '192.0.2.22:22' },
				{ k: '入り方', v: '鍵だけ（publickey）' },
				{ k: '初めの答え', v: 'learner@ssh.example.com: Permission denied (publickey).' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '鍵なし', at: [0, 1] },
				{ op: 'appear', id: 'srv', label: SRV, sub: ':22', at: [3, 1] },
				{ op: 'move', from: 'me', to: 'srv', payload: 'ssh', kind: 'deny' }
			],
			log: { t: '0s', from: SRV, to: ME, kind: 'deny', info: 'Permission denied (publickey)' }
		},
		{
			n: 2,
			title: '鍵の組を作る',
			lead: 'ssh-keygen で、秘密鍵と公開鍵の組を作る',
			body: [
				"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519 と打つ。-t は鍵の種類だ。",
				'秘密鍵 id_ed25519 と、公開鍵 id_ed25519.pub の 2 つができる。',
				'鍵の指紋 SHA256:8bGkka6n… は、鍵を見分ける短い要約だ。'
			],
			facts: [
				{ k: '秘密鍵', v: '~/.ssh/id_ed25519（411 B）' },
				{ k: '公開鍵', v: '~/.ssh/id_ed25519.pub（96 B）' },
				{ k: '指紋', v: 'SHA256:8bGkka6nwVMZwXh+PEvfK6yK0uUiUqNG8KWyt1j6JYk' }
			],
			scene: [
				{ op: 'appear', id: 'priv', label: 'id_ed25519', sub: '秘密鍵', at: [0, 2] },
				{ op: 'appear', id: 'pub', label: 'id_ed25519.pub', sub: '公開鍵', at: [1, 2] }
			],
			log: {
				t: '20s',
				from: ME,
				to: 'id_ed25519',
				kind: 'keygen',
				info: 'ed25519 の鍵の組を作った'
			}
		},
		{
			n: 3,
			title: '権限を確かめる',
			lead: '秘密鍵は本人だけが読める 600 になっている',
			body: [
				'ls -l ~/.ssh で、秘密鍵は -rw-------（600）、公開鍵は -rw-r--r--（644）だ。',
				'秘密鍵は、ほかの利用者に読まれたら成りすまされる。',
				'公開鍵は誰に見せてもよい。'
			],
			facts: [
				{ k: 'id_ed25519', v: '-rw------- 600' },
				{ k: 'id_ed25519.pub', v: '-rw-r--r-- 644' }
			],
			scene: [
				{ op: 'change', id: 'priv', k: '権限', v: '600（本人だけ）' },
				{ op: 'change', id: 'pub', k: '権限', v: '644（誰でも読める）' }
			],
			log: { t: '30s', from: ME, to: 'id_ed25519', kind: 'mode', info: '秘密鍵は 600' }
		},
		{
			n: 4,
			title: '公開鍵を置く',
			lead: '相手の ~/.ssh/authorized_keys に、公開鍵を 1 行足す',
			body: [
				'cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys と打つ。>> は末尾に足す。',
				'足した行は ssh-ed25519 AAAAC3Nz… learner@devbox だ。',
				'この教室の 2 台は家を共有するので、手元に置けば相手にも置いたことになる。'
			],
			facts: [
				{ k: '置く場所', v: '~/.ssh/authorized_keys' },
				{ k: '足した行', v: 'ssh-ed25519 AAAAC3Nz… learner@devbox' }
			],
			scene: [
				{ op: 'appear', id: 'ak', label: AK, sub: '相手の機械', at: [3, 2] },
				{ op: 'move', from: 'pub', to: 'ak', payload: 'ssh-ed25519 AAAAC3Nz…', kind: 'copy' }
			],
			log: { t: '40s', from: 'id_ed25519.pub', to: AK, kind: 'copy', info: '公開鍵を 1 行足した' }
		},
		{
			n: 5,
			title: '秘密鍵で答える',
			lead: '相手の問いに、秘密鍵でしか作れない署名で答える',
			body: [
				'ssh -v の Offering public key の行で、手元が鍵を申し出たと分かる。',
				'相手は authorized_keys にその鍵を見つけ、Server accepts key と返す。',
				'手元は、その接続だけの値に秘密鍵で署名して返す。秘密鍵そのものは送らない。'
			],
			facts: [
				{ k: '申し出', v: 'debug1: Offering public key: /home/learner/.ssh/id_ed25519' },
				{ k: '相手の答え', v: 'debug1: Server accepts key' },
				{ k: '網を通らない物', v: '秘密鍵' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'srv', payload: '公開鍵の申し出', kind: 'offer' },
				{ op: 'move', from: 'priv', to: 'srv', payload: '署名', kind: 'sign' }
			],
			log: { t: '50s', from: ME, to: SRV, kind: 'auth', info: '秘密鍵の署名で答えた' },
			why: '署名は接続ごとに違う値に付けるので、途中で写されても次の接続には使えない'
		},
		{
			n: 6,
			title: '入れる',
			lead: '相手は公開鍵で署名を確かめ、通す',
			body: [
				'相手は authorized_keys の公開鍵で署名を確かめ、合えば通す。',
				'ssh ssh.example.com hostname -I は、相手の機械で動き、192.0.2.22 を返す。',
				'初めての相手には、相手の鍵の指紋を覚えてよいかを聞かれる（known_hosts に残る）。'
			],
			facts: [
				{ k: 'ssh ssh.example.com hostname -I', v: '192.0.2.22' },
				{ k: '相手の指紋を覚える場所', v: '~/.ssh/known_hosts' }
			],
			scene: [
				{ op: 'move', from: 'srv', to: 'me', payload: '192.0.2.22', kind: 'ok' },
				{ op: 'change', id: 'me', k: '状態', v: '入れた' }
			],
			log: {
				t: '50s',
				from: SRV,
				to: ME,
				kind: 'ok',
				info: '鍵で入れた。hostname -I は 192.0.2.22'
			}
		}
	],
	example: {
		intro: '鍵なしで断られ、鍵を作って置き、入った（模擬は本物の記録と比べ済み）',
		lines: [
			'$ ssh -o StrictHostKeyChecking=accept-new ssh.example.com hostname -I',
			"Warning: Permanently added 'ssh.example.com' (ED25519) to the list of known hosts.",
			'learner@ssh.example.com: Permission denied (publickey).',
			"$ ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519",
			'Generating public/private ed25519 key pair.',
			'Your identification has been saved in /home/learner/.ssh/id_ed25519',
			'Your public key has been saved in /home/learner/.ssh/id_ed25519.pub',
			'The key fingerprint is:',
			'SHA256:8bGkka6nwVMZwXh+PEvfK6yK0uUiUqNG8KWyt1j6JYk learner@devbox',
			"The key's randomart image is:",
			'+--[ED25519 256]--+',
			'|       o.        |',
			'|      . oo       |',
			'|       o=.o      |',
			'|.   .  ..O=o     |',
			'| o o    Soo+ .   |',
			'|..+.o. o. . . .  |',
			'|E++o.o=o.  .   . |',
			'|.+=oo o*.   o .  |',
			'|o+oo oo..... .   |',
			'+----[SHA256]-----+',
			'$ ls -l ~/.ssh',
			'total 12',
			'-rw------- 1 learner learner 411 Nov 10 09:01 id_ed25519',
			'-rw-r--r-- 1 learner learner  96 Nov 10 09:01 id_ed25519.pub',
			'-rw-r--r-- 1 learner learner 142 Nov 10 09:00 known_hosts',
			'$ cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys',
			'$ ssh ssh.example.com hostname -I',
			'192.0.2.22 '
		]
	},
	practice: {
		goal: '鍵の組を作って公開鍵を置き、ssh.example.com で hostname -I を動かして 192.0.2.22 を出す',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'ssh' },
		success: { output: '192.0.2.22 \n' },
		mistakes: [
			{
				when: '公開鍵を authorized_keys に置かずに入ろうとした',
				why: '相手は、置かれた公開鍵の持ち主しか通さない。合言葉では入れない',
				next: 'cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys と打ってから入る',
				match: 'Permission denied (publickey)'
			},
			{
				when: '初めての相手の鍵を受け入れなかった',
				why: '相手の鍵を覚えてよいかの問いに答えていない。模擬の端末は問いに答える口を持たない',
				next: '一度だけ -o StrictHostKeyChecking=accept-new を付けて打つ',
				match: 'Host key verification failed'
			},
			{
				when: '同じ場所に鍵をもう一度作ろうとした',
				why: 'id_ed25519 は既にある。上書きすると、置いた公開鍵と組が合わなくなる',
				next: '作り直さず、今ある id_ed25519.pub を使う',
				match: 'already exists'
			},
			{
				when: '相手の名前を打ち誤った',
				why: 'その名前は引けない',
				next: 'ssh.example.com と打ち直す',
				match: 'Could not resolve hostname'
			}
		]
	},
	check: [
		{ ask: '置く鍵と置く場所', how: '公開鍵 id_ed25519.pub を、相手の ~/.ssh/authorized_keys に' },
		{ ask: '秘密鍵の権限', how: '600（本人だけ）' },
		{ ask: '網を通らない物', how: '秘密鍵（署名だけを送る）' }
	]
};
