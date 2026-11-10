// プロセスの命令：ps・pgrep・pkill・kill（組み込みと /usr/bin/kill）。本物の記録（lnx-007）と一字ずつ合わせる。
// 動いているプロセスは世界（tools-real/worlds/procs.json）が置く。本物の番号は機械ごとに違うので、
// 比べるときは番号を出てきた順の印に揃える（docs/tools.md 2 章）。模擬の番号は決まった数から順に振る。
import { fail, type Cmd, type ShellState } from './run.ts';
import type { JournalLine, UnitMock, UnitState } from './systemd.ts';

export type Proc = {
	pid: number;
	ppid: number;
	user: string;
	cmd: string; // 動かした命令の全体（ps の CMD・pgrep -f が見る）
	leader: boolean; // 自分の組（セッション）の頭か（ps の STAT の s）
	ignores: readonly string[]; // 無視するシグナル（TERM など）
	unit?: string; // サービスのプロセスなら、そのサービス
};

export type SysUser = { name: string; uid: number };

// 機械の状態（プロセス・世界の利用者・サービス）。サービスは systemd.ts
export type SysState = {
	users: readonly SysUser[];
	procs: readonly Proc[];
	nextPid: number;
	shellPid: number; // 端末の bash
	units?: Readonly<Record<string, UnitState>>;
	journal?: readonly JournalLine[];
	unitMock?: Readonly<Record<string, UnitMock>>; // サービスを動かしたときの振る舞い（世界の unitMock）
};

// 世界の置くプロセス（記録は cmd を setsid で動かす。模擬は mock の振る舞いで動かす）
export type ProcSpec = {
	user: string;
	cmd: string;
	mock?: { children?: string[]; ignore?: string[] };
};

const FIRST_PID = 21501;
export const SHELL_PID = 21402;

export function initialSys(
	users: readonly SysUser[] = [],
	specs: readonly ProcSpec[] = [],
	unitMock?: Readonly<Record<string, UnitMock>>
): SysState {
	let next = FIRST_PID;
	const procs: Proc[] = [];
	for (const sp of specs) {
		const pid = next++;
		procs.push({
			pid,
			ppid: 1,
			user: sp.user,
			cmd: sp.cmd,
			leader: true,
			ignores: sp.mock?.ignore ?? []
		});
		for (const c of sp.mock?.children ?? [])
			procs.push({ pid: next++, ppid: pid, user: sp.user, cmd: c, leader: false, ignores: [] });
		next += 3; // 子を作る間に、ほかの命令も番号を使う
	}
	return { users, procs, nextPid: next, shellPid: SHELL_PID, ...(unitMock ? { unitMock } : {}) };
}

export const sysOf = <X>(s: ShellState<X>): SysState => s.sys ?? initialSys();

// Linux のシグナル（kill -l の並び）
const SIGNALS: Readonly<Record<number, string>> = (() => {
	const base = [
		'HUP',
		'INT',
		'QUIT',
		'ILL',
		'TRAP',
		'ABRT',
		'BUS',
		'FPE',
		'KILL',
		'USR1',
		'SEGV',
		'USR2',
		'PIPE',
		'ALRM',
		'TERM',
		'STKFLT',
		'CHLD',
		'CONT',
		'STOP',
		'TSTP',
		'TTIN',
		'TTOU',
		'URG',
		'XCPU',
		'XFSZ',
		'VTALRM',
		'PROF',
		'WINCH',
		'IO',
		'PWR',
		'SYS'
	];
	const m: Record<number, string> = {};
	base.forEach((n, i) => (m[i + 1] = n));
	for (let i = 34; i <= 64; i++)
		m[i] =
			i === 34 ? 'RTMIN' : i === 64 ? 'RTMAX' : i <= 49 ? `RTMIN+${i - 34}` : `RTMAX-${64 - i}`;
	return m;
})();

function signalNumber(spec: string): number | null {
	if (/^\d+$/.test(spec)) {
		const n = Number(spec);
		return n === 0 || SIGNALS[n] ? n : null;
	}
	const name = spec.toUpperCase().replace(/^SIG/, '');
	for (const [n, v] of Object.entries(SIGNALS)) if (v === name) return Number(n);
	return null;
}

const comm = (cmd: string) => {
	const first = cmd.split(' ')[0].replace(/^-/, '');
	return first.slice(first.lastIndexOf('/') + 1).slice(0, 15);
};

// シグナルを送る。止まった物の子は 1 番に引き取られる
type Sent = { sys: SysState; error?: 'ESRCH' | 'EPERM' };
export function sendSignal(sys: SysState, from: string, pid: number, sig: number): Sent {
	const p = sys.procs.find((x) => x.pid === pid);
	if (!p) return { sys, error: 'ESRCH' };
	if (from !== 'root' && from !== p.user) return { sys, error: 'EPERM' };
	const name = SIGNALS[sig] ?? '';
	if (sig === 0 || name === 'CHLD' || name === 'CONT' || name === 'WINCH' || name === 'URG')
		return { sys };
	if (name !== 'KILL' && name !== 'STOP' && p.ignores.includes(name)) return { sys };
	return { sys: endProc(sys, pid) };
}

export function endProc(sys: SysState, pid: number): SysState {
	const procs = sys.procs
		.filter((x) => x.pid !== pid)
		.map((x) => (x.ppid === pid ? { ...x, ppid: 1 } : x));
	return { ...sys, procs };
}

const withSys = <X>(s: ShellState<X>, sys: SysState): ShellState<X> => ({ ...s, sys });

// kill を読む。返すのはシグナルと番号の並び、または誤り
function parseKill(
	args: string[]
): { sig: number; pids: string[] } | { error: string } | { list: string[] } {
	let sig = 15;
	let i = 0;
	if (args[0] === '-l' || args[0] === '-L') return { list: args.slice(1) };
	if (args[0] === '-s' || args[0] === '-n') {
		const n = signalNumber(args[1] ?? '');
		if (n === null) return { error: `${args[1] ?? ''}: invalid signal specification` };
		sig = n;
		i = 2;
	} else if (args[0]?.startsWith('-') && args[0] !== '--') {
		const n = signalNumber(args[0].slice(1));
		if (n === null) return { error: `${args[0].slice(1)}: invalid signal specification` };
		sig = n;
		i = 1;
	} else if (args[0] === '--') i = 1;
	return { sig, pids: args.slice(i) };
}

function killList(names: string[]): { out: string; err: string } {
	if (names.length === 0) {
		const nums = Object.keys(SIGNALS).map(Number);
		let out = '';
		nums.forEach((n, k) => {
			out += `${String(n).padStart(2)}) SIG${SIGNALS[n]}`;
			out += (k + 1) % 5 === 0 || k === nums.length - 1 ? '\n' : '\t';
		});
		return { out, err: '' };
	}
	let out = '';
	let err = '';
	for (const a of names) {
		if (/^\d+$/.test(a)) {
			const n = Number(a) > 128 ? Number(a) - 128 : Number(a);
			if (SIGNALS[n]) out += SIGNALS[n] + '\n';
			else err += `${a}: invalid signal specification\n`;
		} else {
			const n = signalNumber(a);
			if (n === null) err += `${a}: invalid signal specification\n`;
			else out += n + '\n';
		}
	}
	return { out, err };
}

const USAGE =
	'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n';

// kill。端末で打てば bash の組み込み、sudo を通せば /usr/bin/kill（procps）。言い方が違う
const kill: Cmd<unknown> = (s, args, io) => {
	const builtin = io.builtin === true;
	const pre = builtin ? `${io.prefix}kill: ` : 'kill: ';
	if (args.length === 0) return fail(s, builtin ? USAGE : MOCK_USAGE, builtin ? 2 : 1);
	const p = parseKill(args);
	if ('list' in p) {
		const r = killList(p.list);
		return {
			state: s,
			out: r.out,
			err: r.err
				.split('\n')
				.filter(Boolean)
				.map((l) => pre + l + '\n')
				.join(''),
			code: r.err ? 1 : 0
		};
	}
	if ('error' in p) return fail(s, pre + p.error + '\n', 1);
	if (p.pids.length === 0) return fail(s, builtin ? USAGE : MOCK_USAGE, builtin ? 2 : 1);
	let sys = sysOf(s);
	let err = '';
	for (const a of p.pids) {
		if (!/^-?\d+$/.test(a)) {
			err += builtin
				? `${pre}${a}: arguments must be process or job IDs\n`
				: `${pre}failed to parse argument: '${a}'\n`;
			continue;
		}
		const r = sendSignal(sys, s.user, Number(a), p.sig);
		sys = r.sys;
		const why =
			r.error === 'ESRCH'
				? 'No such process'
				: r.error === 'EPERM'
					? 'Operation not permitted'
					: '';
		if (why) err += builtin ? `${pre}(${a}) - ${why}\n` : `${pre}(${a}): ${why}\n`;
	}
	return { state: withSys(s, sys), out: '', err, code: err ? 1 : 0 };
};
const MOCK_USAGE = '（模擬の /usr/bin/kill は「kill [-シグナル] 番号」の形だけを扱う）\n';

// 何を見せるか（-e・-u・-p・-C）。無ければ、この端末のプロセス
type Sel = { all: boolean; users: string[]; pids: number[]; names: string[] };
type Row = Proc & { tty: string; stat: string };

function rowsOf<X>(s: ShellState<X>, psPid: number): Row[] {
	const sys = sysOf(s);
	const mine: Row[] = [
		{
			pid: sys.shellPid,
			ppid: sys.shellPid - 1,
			user: s.user,
			cmd: '-bash',
			leader: true,
			ignores: ['TERM'],
			tty: 'pts/0',
			stat: 'Ss'
		},
		{
			pid: psPid,
			ppid: sys.shellPid,
			user: s.user,
			cmd: 'ps',
			leader: false,
			ignores: [],
			tty: 'pts/0',
			stat: 'R+'
		}
	];
	const init: Row = {
		pid: 1,
		ppid: 0,
		user: 'root',
		cmd: '/sbin/init',
		leader: true,
		ignores: [],
		tty: '?',
		stat: 'Ss'
	};
	const others = sys.procs.map((p) => ({ ...p, tty: '?', stat: p.leader ? 'Ss' : 'S' }));
	return [init, ...others, ...mine].sort((a, b) => a.pid - b.pid);
}

type Col = { key: string; head: string; width: number; right: boolean };
const COLS: Readonly<Record<string, Col>> = {
	pid: { key: 'pid', head: 'PID', width: 7, right: true },
	ppid: { key: 'ppid', head: 'PPID', width: 7, right: true },
	uid: { key: 'uid', head: 'UID', width: 5, right: true },
	user: { key: 'user', head: 'USER', width: 8, right: false },
	stat: { key: 'stat', head: 'STAT', width: 4, right: false },
	tty: { key: 'tty', head: 'TTY', width: 8, right: false },
	time: { key: 'time', head: 'TIME', width: 8, right: true },
	cmd: { key: 'cmd', head: 'CMD', width: 0, right: false },
	args: { key: 'args', head: 'COMMAND', width: 0, right: false },
	command: { key: 'args', head: 'COMMAND', width: 0, right: false },
	comm: { key: 'comm', head: 'COMMAND', width: 15, right: false },
	ucmd: { key: 'comm', head: 'CMD', width: 0, right: false }
};

function cell(r: Row, key: string, uidOf: (u: string) => number): string {
	switch (key) {
		case 'pid':
			return String(r.pid);
		case 'ppid':
			return String(r.ppid);
		case 'uid':
			return String(uidOf(r.user));
		case 'user':
			return r.user;
		case 'stat':
			return r.stat;
		case 'tty':
			return r.tty;
		case 'time':
			return '00:00:00';
		case 'comm':
			return comm(r.cmd);
		default:
			return r.cmd;
	}
}

function table(cols: Col[], rows: Row[], uidOf: (u: string) => number): string {
	const line = (vals: string[]) =>
		vals
			.map((v, i) => {
				const c = cols[i];
				const last = i === cols.length - 1;
				if (c.right) return v.padStart(c.width);
				return last ? v : v.padEnd(c.width);
			})
			.join(' ')
			.replace(/\s+$/, '');
	const out = [line(cols.map((c) => c.head))];
	for (const r of rows) out.push(line(cols.map((c) => cell(r, c.key, uidOf))).slice(0, 80));
	return out.join('\n') + '\n';
}

const ps: Cmd<unknown> = (s, args) => {
	const sys = sysOf(s);
	const sel: Sel = { all: false, users: [], pids: [], names: [] };
	let fmt: string[] | null = null;
	let full = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-e' || a === '-A') sel.all = true;
		else if (a === '-f') full = true;
		else if (a === '-ef' || a === '-fe') {
			sel.all = true;
			full = true;
		} else if (a === '-u' || a === '-U') sel.users.push(...(args[++i] ?? '').split(','));
		else if (a === '-p') sel.pids.push(...(args[++i] ?? '').split(',').map(Number));
		else if (a === '-C') sel.names.push(...(args[++i] ?? '').split(','));
		else if (a === '-o') (fmt ??= []).push(...(args[++i] ?? '').split(','));
		else
			return fail(
				s,
				'（模擬の ps は -e・-f・-u・-p・-C・-o だけを扱う。例：ps -u 利用者 -o pid,ppid,stat,cmd）\n',
				1
			);
	}
	const users = new Map<string, number>([
		['root', 0],
		['learner', 1000],
		...sys.users.map((u) => [u.name, u.uid] as [string, number])
	]);
	for (const u of sel.users)
		if (!users.has(u) && !/^\d+$/.test(u))
			return fail(
				s,
				`error: user name does not exist\n\nUsage:\n ps [options]\n\n Try 'ps --help <simple|list|output|threads|misc|all>'\n  or 'ps --help <s|l|o|t|m|a>'\n for additional help text.\n\nFor more details see ps(1).\n`,
				1
			);
	const psPid = sys.nextPid;
	const next = { ...sys, nextPid: sys.nextPid + 1 };
	const rows = rowsOf(s, psPid).filter((r) => {
		const chosen = sel.all || sel.users.length > 0 || sel.pids.length > 0 || sel.names.length > 0;
		if (!chosen) return r.tty === 'pts/0';
		return (
			sel.all ||
			sel.users.some((u) => u === r.user || Number(u) === users.get(r.user)) ||
			sel.pids.includes(r.pid) ||
			sel.names.includes(comm(r.cmd))
		);
	});
	const keys =
		fmt ?? (full ? ['uid', 'pid', 'ppid', 'tty', 'time', 'cmd'] : ['pid', 'tty', 'time', 'ucmd']);
	const cols: Col[] = [];
	for (const k of keys) {
		const c = COLS[k];
		if (!c) return fail(s, `error: unknown user-defined format specifier "${k}"\n`, 1);
		cols.push(full && k === 'uid' ? { ...c, head: 'UID', width: 8, right: false } : c);
	}
	const uidOf = (u: string) => users.get(u) ?? 0;
	const out = table(cols, rows, full ? (u) => u as unknown as number : uidOf);
	return { state: withSys(s, next), out, err: '', code: rows.length > 0 ? 0 : 1 };
};

// pgrep・pkill：名前（-f なら命令の全体）を正規表現で探す
function matchProcs<X>(s: ShellState<X>, args: string[]) {
	const sys = sysOf(s);
	const o = {
		full: false,
		list: false,
		name: false,
		users: [] as string[],
		sig: 15,
		pattern: '' as string | null
	};
	o.pattern = null;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-f') o.full = true;
		else if (a === '-a') o.list = true;
		else if (a === '-l') o.name = true;
		else if (a === '-u') o.users.push(...(args[++i] ?? '').split(','));
		else if (/^-[a-zA-Z]{2,}$/.test(a) && [...a.slice(1)].every((c) => 'fal'.includes(c))) {
			for (const c of a.slice(1)) {
				if (c === 'f') o.full = true;
				if (c === 'a') o.list = true;
				if (c === 'l') o.name = true;
			}
		} else if (a.startsWith('-') && signalNumber(a.slice(1)) !== null)
			o.sig = signalNumber(a.slice(1)) ?? 15;
		else if (o.pattern === null) o.pattern = a;
		else return { error: true as const };
	}
	if (o.pattern === null) return { error: true as const };
	let re: RegExp;
	try {
		re = new RegExp(o.pattern);
	} catch {
		return { error: true as const };
	}
	const hits = sys.procs.filter(
		(p) =>
			(o.users.length === 0 || o.users.includes(p.user)) && re.test(o.full ? p.cmd : comm(p.cmd))
	);
	return { o, hits };
}

const PGREP_USAGE = '（模擬の pgrep・pkill は -f・-a・-l・-u と、探す名前 1 つだけを扱う）\n';

const pgrep: Cmd<unknown> = (s, args) => {
	const m = matchProcs(s, args);
	if ('error' in m) return fail(s, PGREP_USAGE, 2);
	const out = m.hits
		.map(
			(p) =>
				(m.o.list ? `${p.pid} ${p.cmd}` : m.o.name ? `${p.pid} ${comm(p.cmd)}` : String(p.pid)) +
				'\n'
		)
		.join('');
	return { state: s, out, err: '', code: m.hits.length > 0 ? 0 : 1 };
};

const pkill: Cmd<unknown> = (s, args) => {
	const m = matchProcs(s, args);
	if ('error' in m) return fail(s, PGREP_USAGE, 2);
	let sys = sysOf(s);
	let err = '';
	let done = 0;
	for (const p of m.hits) {
		const r = sendSignal(sys, s.user, p.pid, m.o.sig);
		sys = r.sys;
		if (r.error === 'EPERM') err += `pkill: killing pid ${p.pid} failed: Operation not permitted\n`;
		else done++;
	}
	return { state: withSys(s, sys), out: '', err, code: done > 0 ? 0 : m.hits.length > 0 ? 3 : 1 };
};

export const procCommands: Record<string, Cmd<unknown>> = { ps, pgrep, pkill, kill };
