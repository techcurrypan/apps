// lnx-011 利用者と sudo（shell 模擬。世界 shop）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04、sudo 1.9.15）の記録 tools-real/recorded/lnx-011-sudo.json と一字ずつ比べてある。
// 場面：店の売上の紙 /srv/shop/report.txt は root の物（640）。learner は sudo の組にいる。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const REPORT = '/srv/shop/report.txt';

export const lnx011: Lesson = {
	id: 'lnx-011',
	field: 'lnx',
	level: 2,
	title: '利用者と sudo',
	goal: '利用者・グループと sudo で、誰が何をできるかを確かめることができる',
	prereq: ['lnx-004'],
	related: ['sec-001'],
	next: ['sec-010'],
	explain: [
		{
			n: 1,
			title: '利用者と番号',
			lead: 'whoami と id で、今の自分を確かめる',
			body: [
				'whoami は learner を返す（今の利用者の名前）。',
				'id は uid=1000(learner) を返す。機械は名前でなく番号 1000 で人を見分ける。',
				'gid=1000(learner) は、主に属する組の番号だ。'
			],
			facts: [
				{ k: 'whoami', v: 'learner' },
				{ k: 'id', v: 'uid=1000(learner) gid=1000(learner) groups=1000(learner),27(sudo)' }
			],
			scene: [{ op: 'appear', id: 'me', label: 'learner', sub: 'uid 1000', at: [0, 0] }],
			log: { t: '0s', from: TERM, to: 'learner', kind: 'id', info: 'learner は uid 1000' }
		},
		{
			n: 2,
			title: '組に入れる',
			lead: '組（グループ）は、権限をまとめて渡すための集まり',
			body: [
				'groups は learner sudo を返す。learner は 2 つの組に属している。',
				'sudo の組（番号 27）にいる人は、sudo で root の力を借りられる。',
				'組に人を入れるのは root の仕事で、sudo usermod -aG 組 人 と打つ。'
			],
			facts: [
				{ k: 'groups', v: 'learner sudo' },
				{ k: 'sudo の組の番号', v: '27' }
			],
			scene: [
				{ op: 'appear', id: 'sudo', label: 'sudo の組', sub: 'gid 27', at: [1, 1] },
				{ op: 'move', from: 'me', to: 'sudo', payload: '属する', kind: 'member' }
			],
			log: {
				t: '10s',
				from: 'learner',
				to: 'sudo の組',
				kind: 'group',
				info: 'learner は sudo の組にいる'
			}
		},
		{
			n: 3,
			title: '組の権限で読める',
			lead: '640 の紙は、持ち主と組だけが読める',
			body: [
				'ls -l /srv/shop は -rw-r----- 1 root root を返す。持ち主も組も root だ。',
				'持ち主 rw-、組 r--、ほか --- なので、root の組の人なら読める。',
				'learner はどちらでもない「ほか」なので、cat は Permission denied で断られる。'
			],
			facts: [
				{ k: 'ls -l の行', v: '-rw-r----- 1 root root 11 Nov 10 09:00 report.txt' },
				{ k: 'cat /srv/shop/report.txt', v: 'cat: /srv/shop/report.txt: Permission denied' }
			],
			scene: [
				{ op: 'appear', id: 'report', label: 'report.txt', sub: 'root root 640', at: [3, 0] },
				{ op: 'move', from: 'me', to: 'report', payload: 'cat', kind: 'deny' }
			],
			log: {
				t: '20s',
				from: 'learner',
				to: 'report.txt',
				kind: 'deny',
				info: 'ほかには読む権限が無い'
			}
		},
		{
			n: 4,
			title: 'root の特別さ',
			lead: 'root（uid 0）は、権限の印に縛られない',
			body: [
				'root は機械の管理者で、uid は 0 だ。',
				'root はファイルの権限によらず、読み書きができる。',
				'何でもできるので、ふだんは root でなく自分の利用者で作業する。'
			],
			facts: [
				{ k: 'root の uid', v: '0' },
				{ k: '権限の印', v: '効かない' }
			],
			scene: [
				{ op: 'appear', id: 'root', label: 'root', sub: 'uid 0', at: [2, 2] },
				{ op: 'move', from: 'root', to: 'report', payload: '読める', kind: 'root' }
			],
			log: {
				t: '30s',
				from: 'root',
				to: 'report.txt',
				kind: 'root',
				info: 'root は権限によらず読める'
			},
			why: '誤った命令 1 つで機械を壊せる力なので、必要な 1 行だけ借りる形にしている'
		},
		{
			n: 5,
			title: 'sudo で借りる',
			lead: 'sudo 命令 は、その 1 行だけを root として動かす',
			body: [
				'sudo cat /srv/shop/report.txt は sales: 120 を返す。',
				'sudo whoami は root を返し、その次の whoami は learner に戻る。',
				'書き込みは echo … | sudo tee ファイル で、書く側の tee を root にする。'
			],
			facts: [
				{ k: 'sudo cat', v: 'sales: 120' },
				{ k: 'sudo whoami', v: 'root' },
				{ k: "echo 'sales: 130' | sudo tee …", v: 'sales: 130' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'root', payload: 'sudo', kind: 'sudo' },
				{ op: 'change', id: 'report', k: '中身', v: 'sales: 130' }
			],
			log: { t: '45s', from: 'learner', to: 'root', kind: 'sudo', info: '1 行だけ root で動かした' }
		},
		{
			n: 6,
			title: 'sudoers の決まり',
			lead: '誰が sudo を使えるかは、/etc/sudoers に書いてある',
			body: [
				'Ubuntu の /etc/sudoers には %sudo ALL=(ALL:ALL) ALL の行がある。',
				'% は組の印で、sudo の組の人は全ての命令を借りられる、という意味だ。',
				'sudo echo x > ファイル は断られる。> は sudo の外の learner が開くからだ。'
			],
			facts: [
				{ k: 'sudoers の行', v: '%sudo ALL=(ALL:ALL) ALL' },
				{
					k: 'sudo echo x > /srv/shop/report.txt',
					v: 'bash: /srv/shop/report.txt: Permission denied'
				}
			],
			scene: [
				{ op: 'appear', id: 'sudoers', label: '/etc/sudoers', sub: '%sudo ALL', at: [1, 2] },
				{ op: 'move', from: 'sudoers', to: 'sudo', payload: '全て許す', kind: 'rule' }
			],
			log: {
				t: '60s',
				from: '/etc/sudoers',
				to: 'sudo の組',
				kind: 'rule',
				info: 'sudo の組は全ての命令を借りられる'
			}
		}
	],
	example: {
		intro: '自分を確かめ、読めない紙を sudo で読み、書いた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ id',
			'uid=1000(learner) gid=1000(learner) groups=1000(learner),27(sudo)',
			'$ ls -l /srv/shop',
			'total 4',
			'-rw-r----- 1 root root 11 Nov 10 09:00 report.txt',
			'$ cat /srv/shop/report.txt',
			'cat: /srv/shop/report.txt: Permission denied',
			'$ sudo cat /srv/shop/report.txt',
			'sales: 120',
			'$ sudo whoami',
			'root',
			'$ sudo echo x > /srv/shop/report.txt',
			'bash: /srv/shop/report.txt: Permission denied',
			"$ echo 'sales: 130' | sudo tee /srv/shop/report.txt",
			'sales: 130'
		]
	},
	practice: {
		goal: '売上の紙 /srv/shop/report.txt の中身を sales: 150 に書き替える',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'shop' },
		success: { files: { [REPORT]: 'sales: 150\n' } },
		mistakes: [
			{
				when: 'sudo を付けずに書いた、または sudo echo … > で書いた',
				why: '> でファイルを開くのは sudo の外の learner だ。learner には書く権限が無い',
				next: "書く側を root にする。echo 'sales: 150' | sudo tee /srv/shop/report.txt と打つ",
				match: 'Permission denied'
			},
			{
				when: 'sudo cd のように、シェルの中の命令を sudo に渡した',
				why: 'cd はシェルの中にしか無い命令で、sudo が動かせる別の命令ではない',
				next: '場所を移らず、ファイルを /srv/shop/report.txt と場所ごと書く',
				match: 'is a shell built-in command'
			},
			{
				when: 'sudo の後の命令の名前を打ち誤った',
				why: 'その名前の命令は無い。sudo は command not found と返す',
				next: 'tee と打ち直す',
				match: 'command not found'
			}
		]
	},
	check: [
		{ ask: '自分の番号と組', how: 'id が uid=1000(learner)・27(sudo) を返す' },
		{ ask: 'learner が読めない理由', how: '640 で、learner は持ち主でも組でもない' },
		{ ask: '書き替えたか', how: 'sudo cat /srv/shop/report.txt が sales: 150 を返す' }
	]
};
