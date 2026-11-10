// サービスとログ：systemctl・journalctl。本物の記録（lnx-010、systemd 255）と一字ずつ合わせる。
// サービスの定義は /etc/systemd/system/<名前>.service のファイルを、打つたびに読む。
// 動かしたときの振る舞い（出す行・終わり方）は世界の unitMock が決める（記録の機械では本物の python3 が動く）。
// 本物の時刻・番号・使った量（Memory・CPU）は記録ごとに違うので、比べるときは揃える（docs/tools.md 2 章）。
import { readFile } from '../fs.ts';
import { endProc, sysOf, type Proc, type SysState } from './procs.ts';
import { fail, TZ_OFFSET, type Cmd, type ShellState } from './run.ts';

export type UnitMock = { stdout?: string[]; stderr?: string[]; exit?: number | null };

export type UnitState = {
	active: 'active' | 'inactive' | 'failed';
	enabled: boolean;
	since?: number; // 今の状態になった時刻
	started?: number;
	pid?: number; // 動いている、または最後に動いたプロセス
	exit?: { code: number } | { signal: string };
};

export type JournalLine = { t: number; unit: string; ident: string; pid: number; msg: string };

const UNIT_DIR = '/etc/systemd/system';
const HOST = 'devbox';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type UnitFile = {
	name: string;
	path: string;
	description: string;
	user: string;
	exec: string;
	wantedBy: string | null;
};

function unitName(arg: string): string {
	return /\.(service|socket|timer|target|mount)$/.test(arg) ? arg : `${arg}.service`;
}

function readUnit<X>(s: ShellState<X>, name: string): UnitFile | null {
	const path = `${UNIT_DIR}/${name}`;
	const text = readFile(s.fs, path);
	if (text === null) return null;
	const get = (k: string) => text.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? null;
	return {
		name,
		path,
		description: get('Description') ?? name,
		user: get('User') ?? 'root',
		exec: get('ExecStart') ?? '',
		wantedBy: get('WantedBy')
	};
}

const local = (t: number) => new Date((t + TZ_OFFSET) * 1000);
const p2 = (n: number) => String(n).padStart(2, '0');
function longTime(t: number): string {
	const d = local(t);
	return `${DAYS[d.getUTCDay()]} ${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} JST`;
}
function shortTime(t: number): string {
	const d = local(t);
	return `${MONTHS[d.getUTCMonth()]} ${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}
// systemd の「どれだけ前」（分と秒）
function ago(sec: number): string {
	if (sec < 60) return `${sec}s ago`;
	const m = Math.floor(sec / 60);
	if (m < 60) return sec % 60 ? `${m}min ${sec % 60}s ago` : `${m}min ago`;
	const h = Math.floor(m / 60);
	return m % 60 ? `${h}h ${m % 60}min ago` : `${h}h ago`;
}
function span(sec: number): string {
	if (sec < 60) return `${sec}s`;
	const m = Math.floor(sec / 60);
	return m < 60
		? sec % 60
			? `${m}min ${sec % 60}s`
			: `${m}min`
		: `${Math.floor(m / 60)}h ${m % 60}min`;
}

const unitOf = (sys: SysState, name: string): UnitState =>
	sys.units?.[name] ?? { active: 'inactive', enabled: false };
const setUnit = (sys: SysState, name: string, u: UnitState): SysState => ({
	...sys,
	units: { ...(sys.units ?? {}), [name]: u }
});
const log = (sys: SysState, line: JournalLine): SysState => ({
	...sys,
	journal: [...(sys.journal ?? []), line]
});
const sd = (t: number, unit: string, msg: string): JournalLine => ({
	t,
	unit,
	ident: 'systemd',
	pid: 1,
	msg
});

const ident = (exec: string) => {
	const first = exec.split(' ')[0];
	return first.slice(first.lastIndexOf('/') + 1);
};

function startUnit(sys0: SysState, f: UnitFile, mock: UnitMock | undefined, now: number): SysState {
	let sys = sys0;
	const u = unitOf(sys, f.name);
	if (u.active === 'active') return sys;
	const pid = sys.nextPid;
	sys = { ...sys, nextPid: pid + 1 };
	sys = log(sys, sd(now, f.name, `Started ${f.name} - ${f.description}.`));
	const id = ident(f.exec);
	for (const m of [...(mock?.stdout ?? []), ...(mock?.stderr ?? [])])
		sys = log(sys, { t: now, unit: f.name, ident: id, pid, msg: m });
	const exit = mock?.exit ?? null;
	if (exit === null) {
		const proc: Proc = {
			pid,
			ppid: 1,
			user: f.user,
			cmd: f.exec,
			leader: true,
			ignores: [],
			unit: f.name
		};
		sys = { ...sys, procs: [...sys.procs, proc] };
		return setUnit(sys, f.name, {
			...u,
			active: 'active',
			since: now,
			started: now,
			pid,
			exit: undefined
		});
	}
	if (exit === 0) {
		sys = log(sys, sd(now, f.name, `${f.name}: Deactivated successfully.`));
		return setUnit(sys, f.name, {
			...u,
			active: 'inactive',
			since: now,
			started: now,
			pid,
			exit: { code: 0 }
		});
	}
	sys = log(
		sys,
		sd(now, f.name, `${f.name}: Main process exited, code=exited, status=${exit}/FAILURE`)
	);
	sys = log(sys, sd(now, f.name, `${f.name}: Failed with result 'exit-code'.`));
	return setUnit(sys, f.name, {
		...u,
		active: 'failed',
		since: now,
		started: now,
		pid,
		exit: { code: exit }
	});
}

function stopUnit(sys0: SysState, f: UnitFile, now: number): SysState {
	let sys = sys0;
	const u = unitOf(sys, f.name);
	if (u.active !== 'active')
		return setUnit(
			sys,
			f.name,
			u.active === 'failed' ? { ...u, active: 'inactive', since: now } : u
		);
	sys = log(sys, sd(now, f.name, `Stopping ${f.name} - ${f.description}...`));
	if (u.pid !== undefined) sys = endProc(sys, u.pid);
	sys = log(sys, sd(now, f.name, `${f.name}: Deactivated successfully.`));
	sys = log(sys, sd(now, f.name, `Stopped ${f.name} - ${f.description}.`));
	return setUnit(sys, f.name, { ...u, active: 'inactive', since: now, exit: { signal: 'TERM' } });
}

function journalLines(sys: SysState, unit: string | null, n: number | null): string {
	const all = (sys.journal ?? []).filter((l) => unit === null || l.unit === unit);
	const shown = n === null ? all : all.slice(Math.max(0, all.length - n));
	if (shown.length === 0) return '-- No entries --\n';
	return shown.map((l) => `${shortTime(l.t)} ${HOST} ${l.ident}[${l.pid}]: ${l.msg}\n`).join('');
}

function status<X>(s: ShellState<X>, f: UnitFile, now: number): { out: string; code: number } {
	const sys = sysOf(s);
	const u = unitOf(sys, f.name);
	const mark = u.active === 'active' ? '●' : u.active === 'failed' ? '×' : '○';
	const loaded = f.wantedBy ? `${u.enabled ? 'enabled' : 'disabled'}; preset: enabled` : 'static';
	const lines = [
		`${mark} ${f.name} - ${f.description}`,
		`     Loaded: loaded (${f.path}; ${loaded})`
	];
	const since = u.since !== undefined ? ` since ${longTime(u.since)}; ${ago(now - u.since)}` : '';
	const exitText = (e: UnitState['exit']) =>
		e && 'code' in e
			? `code=exited, status=${e.code}/${e.code === 0 ? 'SUCCESS' : 'FAILURE'}`
			: `code=killed, signal=${e && 'signal' in e ? e.signal : 'TERM'}`;
	if (u.active === 'active') {
		lines.push(`     Active: active (running)${since}`);
		lines.push(`   Main PID: ${u.pid} (${ident(f.exec)})`);
		lines.push('      Tasks: 1 (limit: 17436)');
		lines.push('     Memory: 4.0M (peak: 4.0M)');
		lines.push('        CPU: 16ms');
		lines.push(`     CGroup: /system.slice/${f.name}`);
		lines.push(`             └─${u.pid} ${f.exec}`);
	} else if (u.active === 'failed') {
		lines.push(`     Active: failed (Result: exit-code)${since}`);
		lines.push('   Duration: 20ms');
		lines.push(`    Process: ${u.pid} ExecStart=${f.exec} (${exitText(u.exit)})`);
		lines.push(`   Main PID: ${u.pid} (${exitText(u.exit)})`);
		lines.push('        CPU: 19ms');
	} else if (u.started !== undefined && u.since !== undefined) {
		lines.push(`     Active: inactive (dead)${since}`);
		lines.push(`   Duration: ${span(u.since - u.started)}`);
		lines.push(`    Process: ${u.pid} ExecStart=${f.exec} (${exitText(u.exit)})`);
		lines.push(`   Main PID: ${u.pid} (${exitText(u.exit)})`);
		lines.push('        CPU: 16ms');
	} else lines.push('     Active: inactive (dead)');
	let out = lines.join('\n') + '\n';
	// 日誌を読める人（root）には、終わりに最近の行が付く
	if (s.user === 'root' && (sys.journal ?? []).some((l) => l.unit === f.name))
		out += '\n' + journalLines(sys, f.name, 10);
	return { out, code: u.active === 'active' ? 0 : 3 };
}

const AUTH = (verb: string, name: string) =>
	`Failed to ${verb} ${name}: Interactive authentication required.\nSee system logs and 'systemctl status ${name}' for details.\n`;

const systemctl: Cmd<unknown> = (s, args, io) => {
	const [verb, ...rest] = args.filter((a) => a !== '--no-pager');
	let sys = sysOf(s);
	const mocks = sys.unitMock ?? {};
	const names = rest.map(unitName);
	const root = s.user === 'root';
	const now = io.now;
	switch (verb) {
		case 'status': {
			let out = '';
			let err = '';
			let code = 0;
			for (const n of names) {
				const f = readUnit(s, n);
				if (!f) {
					err += `Unit ${n} could not be found.\n`;
					code = 4;
					continue;
				}
				const r = status(s, f, now);
				out += (out ? '\n' : '') + r.out;
				if (code !== 4) code = Math.max(code, r.code);
			}
			return { state: s, out, err, code };
		}
		case 'start':
		case 'stop':
		case 'restart': {
			for (const n of names) {
				if (!root) return fail(s, AUTH(verb, n), 1);
				const f = readUnit(s, n);
				if (!f) return fail({ ...s, sys }, `Failed to ${verb} ${n}: Unit ${n} not found.\n`, 5);
				if (verb !== 'start') sys = stopUnit(sys, f, now);
				if (verb !== 'stop') sys = startUnit(sys, f, mocks[n], now);
			}
			return { state: { ...s, sys }, out: '', err: '', code: 0 };
		}
		case 'enable':
		case 'disable': {
			let err = '';
			for (const n of names) {
				const f = readUnit(s, n);
				if (!f) return fail(s, `Failed to ${verb} unit: Unit file ${n} does not exist.\n`, 1);
				if (!root) return fail(s, `Failed to ${verb} unit: Access denied\n`, 1);
				if (!f.wantedBy)
					return fail(
						s,
						'（模擬の systemctl は、[Install] の無いサービスの enable・disable を扱わない）\n',
						1
					);
				const u = unitOf(sys, n);
				const link = `${UNIT_DIR}/${f.wantedBy}.wants/${n}`;
				if (verb === 'enable' && !u.enabled) err += `Created symlink ${link} → ${f.path}.\n`;
				if (verb === 'disable' && u.enabled) err += `Removed "${link}".\n`;
				sys = setUnit(sys, n, { ...u, enabled: verb === 'enable' });
			}
			return { state: { ...s, sys }, out: '', err, code: 0 };
		}
		case 'is-active': {
			let out = '';
			let code = 3;
			for (const n of names) {
				const a = readUnit(s, n) ? unitOf(sys, n).active : 'inactive';
				out += a + '\n';
				if (a === 'active') code = 0;
			}
			return { state: s, out, err: '', code };
		}
		case 'is-enabled': {
			let out = '';
			let err = '';
			let code = 1;
			for (const n of names) {
				const f = readUnit(s, n);
				if (!f) {
					err += `Failed to get unit file state for ${n}: No such file or directory\n`;
					continue;
				}
				const st = !f.wantedBy ? 'static' : unitOf(sys, n).enabled ? 'enabled' : 'disabled';
				out += st + '\n';
				if (st !== 'disabled') code = 0;
			}
			return { state: s, out, err, code };
		}
		case 'daemon-reload':
			return root
				? { state: s, out: '', err: '', code: 0 }
				: fail(s, 'Failed to reload daemon: Access denied\n', 1);
		default:
			return fail(
				s,
				'（模擬の systemctl は status・start・stop・restart・enable・disable・is-active・is-enabled だけを扱う）\n',
				1
			);
	}
};

const journalctl: Cmd<unknown> = (s, args) => {
	let unit: string | null = null;
	let n: number | null = null;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-u') unit = unitName(args[++i] ?? '');
		else if (a === '-n') n = Number(args[++i]);
		else if (a === '--no-pager') continue;
		else return fail(s, '（模擬の journalctl は -u・-n・--no-pager だけを扱う）\n', 1);
	}
	if (s.user !== 'root') {
		const hint =
			"Hint: You are currently not seeing messages from other users and the system.\n      Users in groups 'adm', 'systemd-journal' can see all messages.\n      Pass -q to turn off this notice.\n";
		return { state: s, out: '-- No entries --\n', err: hint, code: 0 };
	}
	return { state: s, out: journalLines(sysOf(s), unit, n), err: '', code: 0 };
};

export const systemdCommands: Record<string, Cmd<unknown>> = { systemctl, journalctl };
