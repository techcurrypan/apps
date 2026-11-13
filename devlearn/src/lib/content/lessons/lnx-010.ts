// lnx-010 サービスとログ（shell 模擬。世界 service）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04、systemd 255）の記録 tools-real/recorded/lnx-010-service.json と比べてある。
// 本物でも毎回変わる物（since の時刻・Tasks の上限・Memory・CPU・プロセスの番号）は、模擬では決まった値にしてある（docs/tools.md 第 2 章）。
// 場面：店の Web（shop.service）と集計（report.service。設定のファイルが無くて止まる）。経過時刻 t は端末を開いた 09:00 を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const SYSD = 'systemd';

export const lnx010: Lesson = {
	id: 'lnx-010',
	field: 'lnx',
	level: 3,
	title: 'サービスとログ',
	goal: 'systemctl でサービスを動かし、journalctl でログを読むことができる',
	prereq: ['lnx-007'],
	related: ['cld-010'],
	next: [],
	explain: [
		{
			n: 1,
			title: 'サービスの定義',
			lead: 'ずっと動かしたい物を、.service のファイルに書いておく',
			body: [
				'Web のように、裏でずっと動かす物をサービスと呼ぶ。',
				'/etc/systemd/system/shop.service に、誰が何を動かすかが書いてある。',
				'User=shop が動かす人、ExecStart= が動かす命令だ。'
			],
			facts: [
				{ k: 'ファイル', v: '/etc/systemd/system/shop.service' },
				{ k: 'User', v: 'shop' },
				{ k: 'ExecStart', v: '/usr/bin/python3 /opt/shop/web.py' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner', at: [0, 0] },
				{ op: 'appear', id: 'sysd', label: SYSD, sub: 'サービスの番', at: [2, 0] },
				{ op: 'appear', id: 'shop', label: 'shop.service', sub: 'inactive', at: [2, 1] }
			],
			log: {
				t: '0m',
				from: TERM,
				to: 'shop.service',
				kind: 'cat',
				info: 'shop.service の定義を読んだ'
			}
		},
		{
			n: 2,
			title: 'start で動かす',
			lead: 'sudo systemctl start shop で動かしてもらう',
			body: [
				'systemd は、サービスを動かし、見張る番の仕組みだ。',
				'sudo なしでは、Interactive authentication required で断られる。',
				'sudo systemctl start shop は何も返さず、裏で web.py が動き出す。'
			],
			facts: [
				{ k: 'sudo なし', v: 'Failed to start shop.service: Interactive authentication required.' },
				{ k: 'コマンド', v: 'sudo systemctl start shop' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'sysd', payload: 'start shop', kind: 'start' },
				{ op: 'move', from: 'sysd', to: 'shop', payload: 'web.py', kind: 'spawn' },
				{ op: 'change', id: 'shop', k: '状態', v: 'active (running)' }
			],
			log: {
				t: '2m',
				from: SYSD,
				to: 'shop.service',
				kind: 'start',
				info: 'shop を動かした（PID 21501）'
			}
		},
		{
			n: 3,
			title: 'status で見る',
			lead: 'systemctl status shop は、動いているかと番号を出す',
			body: [
				'Active: active (running) が、動いている印だ。',
				'Main PID: 21501 (python3) が、動いているプロセスの番号だ。',
				'止まっているときは ○ と inactive (dead) が出る。'
			],
			facts: [
				{ k: 'Active', v: 'active (running) since Tue 2026-11-10 09:02:00 JST; 1min ago' },
				{ k: 'Main PID', v: '21501 (python3)' }
			],
			scene: [
				{ op: 'change', id: 'shop', k: 'Main PID', v: '21501' },
				{ op: 'move', from: 'sysd', to: 'term', payload: 'active (running)', kind: 'status' }
			],
			log: { t: '3m', from: SYSD, to: TERM, kind: 'status', info: 'active (running)・PID 21501' }
		},
		{
			n: 4,
			title: 'ログを journalctl で',
			lead: 'サービスの出した行は、systemd の日誌に残る',
			body: [
				'sudo journalctl -u shop -n 5 は、shop の日誌の終わり 5 行を出す。',
				'Started shop.service と、web.py が出した listening on 8080 が並ぶ。',
				'-u はサービスの名前、-n は行の数だ。'
			],
			facts: [
				{ k: '1 行目', v: 'Nov 10 09:02:00 devbox systemd[1]: Started shop.service - shop web.' },
				{ k: '2 行目', v: 'Nov 10 09:02:00 devbox python3[21501]: listening on 8080' }
			],
			scene: [
				{ op: 'appear', id: 'journal', label: '日誌', sub: 'journalctl', at: [3, 0] },
				{ op: 'move', from: 'shop', to: 'journal', payload: 'listening on 8080', kind: 'log' }
			],
			log: {
				t: '4m',
				from: 'shop.service',
				to: '日誌',
				kind: 'log',
				info: 'listening on 8080 が日誌に残った'
			}
		},
		{
			n: 5,
			title: '失敗の行を見つける',
			lead: '動かない report の理由を、日誌から読む',
			body: [
				'report を start した後、is-active report は failed を返す。',
				'日誌に report.conf: No such file or directory の行がある。',
				'設定のファイルが無く、status=1/FAILURE で終わっていた。'
			],
			facts: [
				{ k: 'is-active', v: 'failed' },
				{ k: '理由の行', v: 'error: /etc/shop/report.conf: No such file or directory' },
				{ k: '終わり方', v: 'status=1/FAILURE' }
			],
			scene: [
				{ op: 'appear', id: 'report', label: 'report.service', sub: 'failed', at: [1, 2] },
				{
					op: 'move',
					from: 'report',
					to: 'journal',
					payload: 'No such file or directory',
					kind: 'error'
				},
				{ op: 'highlight', id: 'journal' }
			],
			log: {
				t: '5m',
				from: 'report.service',
				to: '日誌',
				kind: 'error',
				info: 'report.conf が無くて失敗した'
			},
			why: 'サービスは画面を持たないので、出した文は日誌に集め、後から読めるようにしている'
		},
		{
			n: 6,
			title: 'enable で起動時に',
			lead: 'enable すると、機械を起こし直したときにも動く',
			body: [
				'start は今動かすだけで、機械を起こし直すと止まったままになる。',
				'sudo systemctl enable shop で、起動時に動かす印ができる。',
				'systemctl is-enabled shop は enabled を返す。'
			],
			facts: [
				{ k: 'コマンド', v: 'sudo systemctl enable shop' },
				{
					k: '返った値',
					v: 'Created symlink /etc/systemd/system/multi-user.target.wants/shop.service → …'
				},
				{ k: 'is-enabled', v: 'enabled' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'sysd', payload: 'enable shop', kind: 'enable' },
				{ op: 'change', id: 'shop', k: '起動時', v: 'enabled' }
			],
			log: {
				t: '6m',
				from: TERM,
				to: 'shop.service',
				kind: 'enable',
				info: '起動時にも動くようにした'
			}
		}
	],
	example: {
		intro: '動かして状態と日誌を見、失敗したサービスの理由を読んだ（模擬は本物の記録と比べ済み）',
		lines: [
			'$ systemctl status shop',
			'○ shop.service - shop web',
			'     Loaded: loaded (/etc/systemd/system/shop.service; disabled; preset: enabled)',
			'     Active: inactive (dead)',
			'$ sudo systemctl start shop',
			'$ systemctl is-active shop',
			'active',
			'$ sudo journalctl -u shop -n 5',
			'Nov 10 09:01:00 devbox systemd[1]: Started shop.service - shop web.',
			'Nov 10 09:01:00 devbox python3[21501]: listening on 8080',
			'$ sudo systemctl start report',
			'$ systemctl is-active report',
			'failed',
			'$ sudo journalctl -u report -n 5',
			'Nov 10 09:04:00 devbox systemd[1]: Started report.service - shop report.',
			'Nov 10 09:04:00 devbox python3[21502]: error: /etc/shop/report.conf: No such file or directory',
			'Nov 10 09:04:00 devbox systemd[1]: report.service: Main process exited, code=exited, status=1/FAILURE',
			"Nov 10 09:04:00 devbox systemd[1]: report.service: Failed with result 'exit-code'."
		]
	},
	practice: {
		goal: 'shop を起動時に動くようにし、今も動かす。最後に systemctl is-enabled shop; systemctl is-active shop で確かめる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'service' },
		success: { output: 'enabled\nactive\n' },
		mistakes: [
			{
				when: 'sudo を付けずに start した',
				why: 'サービスを動かすのは機械全体の設定を変えることなので、learner だけでは許されない',
				next: 'sudo systemctl start shop と、sudo を付ける',
				match: 'Interactive authentication required'
			},
			{
				when: 'sudo を付けずに enable した',
				why: '起動の印を置くのも機械全体の設定だ。Access denied で断られる',
				next: 'sudo systemctl enable shop と打つ',
				match: 'Access denied'
			},
			{
				when: 'サービスの名前を打ち誤った',
				why: 'その名前のサービスの定義は無い。systemd は not found と返す',
				next: 'shop と打ち直す（定義のファイルは /etc/systemd/system/shop.service）',
				match: 'not found'
			}
		]
	},
	check: [
		{ ask: '動いているか', how: 'systemctl is-active shop が active を返す' },
		{ ask: '失敗の理由', how: 'sudo journalctl -u report -n 5 の error の行' },
		{ ask: '起動時にも動くか', how: 'systemctl is-enabled shop が enabled を返す' }
	]
};
