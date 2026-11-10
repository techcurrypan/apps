// コンテナの中で動く命令（busybox:1.37 の applet のうち、レッスンに要る物）。本物の記録（ctr-001〜009）と合わせる。
// 終わらない命令（httpd -f・nc -l・sleep）は、コンテナを動いたままにする印を置いて、すぐに戻る（模擬の時計は打った行で進むため）。
import { readFile, stat } from '../fs.ts';
import { shellCommands } from '../shell/commands.ts';
import { fail, ok, pathOf, type Cmd, type Commands, type ShellState } from '../shell/run.ts';
import type { Container, DockerExt, Running } from './state.ts';

// コンテナの中の命令が見る物：docker 全体と、自分のコンテナ
export type CtrCtx = { docker: DockerExt; cid: string; running?: Running };
type C = Cmd<CtrCtx>;

const me = (s: ShellState<CtrCtx>): Container | undefined =>
	s.ext.docker.containers.find((c) => c.id === s.ext.cid);
const setRunning = (s: ShellState<CtrCtx>, r: Running): ShellState<CtrCtx> => ({
	...s,
	ext: { ...s.ext, running: r }
});
const MOCK = (what: string) => `（模擬の ${what} は、この形を扱わない）\n`;

// 同じ網の動いているコンテナを名前（compose ならサービスの名前も）で引く。既定の bridge では名前を引けない
export function lookupFrom(
	ext: DockerExt,
	from: Container,
	host: string
): { ip: string; target: Container } | null {
	if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
		for (const c of ext.containers) {
			if (c.status !== 'running') continue;
			for (const [net, ip] of Object.entries(c.ips))
				if (ip === host && from.ips[net] !== undefined) return { ip, target: c };
		}
		return null;
	}
	for (const net of Object.keys(from.ips)) {
		if (net === 'bridge') continue;
		for (const c of ext.containers) {
			if (c.status !== 'running' || c.ips[net] === undefined) continue;
			if (c.name === host || c.project?.service === host || c.id.startsWith(host))
				return { ip: c.ips[net], target: c };
		}
	}
	return null;
}
const addressKnown = (ext: DockerExt, from: Container, host: string) =>
	/^\d+\.\d+\.\d+\.\d+$/.test(host) || lookupFrom(ext, from, host) !== null;

const cat: C = (s, args, io) => {
	if (args.length === 0) return ok(s, io.stdin);
	let out = '';
	let err = '';
	for (const a of args) {
		const p = pathOf(s, a);
		const n = stat(s.fs, p);
		if (!n) err += `cat: can't open '${a}': No such file or directory\n`;
		else if (n.kind === 'dir') err += `cat: read error: Is a directory\n`;
		else out += readFile(s.fs, p) ?? '';
	}
	return { state: s, out, err, code: err ? 1 : 0 };
};

const uname: C = (s, args) => {
	if (args.length === 0 || (args.length === 1 && args[0] === '-s')) return ok(s, 'Linux\n');
	if (args.length === 1 && args[0] === '-m') return ok(s, 'x86_64\n');
	return fail(s, MOCK('uname') + '（-s・-m を使う）\n', 1);
};

const sleep: C = (s, args, io) => {
	const n = Number(args[0]);
	if (args.length !== 1 || !Number.isFinite(n)) return fail(s, 'sleep: invalid number\n', 1);
	if (args[0] === 'infinity') return ok(setRunning(s, { kind: 'forever' }));
	return ok(setRunning(s, { kind: 'sleep', until: io.now + Math.ceil(n) }));
};

const envText = (s: ShellState<CtrCtx>) =>
	s.exported.map((k) => `${k}=${s.vars[k] ?? ''}\n`).join('');

const printenv: C = (s, args) => {
	if (args.length === 0) return ok(s, envText(s));
	let out = '';
	let code = 0;
	for (const a of args) {
		if (s.exported.includes(a)) out += (s.vars[a] ?? '') + '\n';
		else code = 1;
	}
	return { state: s, out, err: '', code };
};

const env: C = (s, args) => (args.length === 0 ? ok(s, envText(s)) : fail(s, MOCK('env'), 1));
const hostname: C = (s) => ok(s, (s.vars.HOSTNAME ?? '') + '\n');
const whoami: C = (s) => ok(s, 'root\n');
const id: C = (s) => ok(s, 'uid=0(root) gid=0(root) groups=0(root),10(wheel)\n');

// httpd：-f で前に居続ける（無ければ裏に回り、sh は終わる）。-p 口、-h 置き場所
const httpd: C = (s, args) => {
	let port = 80;
	let dir = '/www';
	let fg = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-f') fg = true;
		else if (a === '-p') port = Number(args[++i]);
		else if (a === '-h') dir = args[++i] ?? dir;
		else return fail(s, MOCK('httpd') + '（-f・-p・-h を使う）\n', 1);
	}
	if (!fg) return ok(s);
	return ok(setRunning(s, { kind: 'httpd', port, dir: pathOf(s, dir) }));
};

// nc：-l で待つ（-k で続けて、-p 口、-e 答える命令）。-z 相手 口 で、つながるかだけを見る
const nc: C = (s, args) => {
	if (args.includes('-z')) {
		const rest = args.filter((a) => a !== '-z');
		const [host, portText] = rest;
		const self = me(s);
		if (!self || host === undefined || portText === undefined) return fail(s, MOCK('nc'), 1);
		const hit = lookupFrom(s.ext.docker, self, host);
		if (!hit && !/^\d+\.\d+\.\d+\.\d+$/.test(host))
			return fail(s, `nc: bad address '${host}'\n`, 1);
		const r = hit?.target.running;
		const port = Number(portText);
		const open =
			r !== undefined &&
			((r.kind === 'nc' && r.port === port) || (r.kind === 'httpd' && r.port === port));
		return { state: s, out: '', err: '', code: open ? 0 : 1 };
	}
	const flags = args.filter((a) => a.startsWith('-')).join('');
	const pi = args.indexOf('-p');
	if (flags.includes('l') && pi >= 0)
		return ok(setRunning(s, { kind: 'nc', port: Number(args[pi + 1]) }));
	return fail(s, MOCK('nc') + '（nc -lk -p 口 -e cat か、nc -z 相手 口 を使う）\n', 1);
};

// ping：-c 回数・-W 待つ秒。往復の時間は決まった値（本物は毎回違うので、比べるときは揃える）
const ping: C = (s, args) => {
	let count = 1;
	const rest: string[] = [];
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '-c') count = Number(args[++i]);
		else if (args[i] === '-W') i++;
		else rest.push(args[i]);
	}
	const host = rest[0];
	const self = me(s);
	if (host === undefined || !self) return fail(s, MOCK('ping'), 1);
	if (!addressKnown(s.ext.docker, self, host)) return fail(s, `ping: bad address '${host}'\n`, 1);
	const hit = lookupFrom(s.ext.docker, self, host);
	const ip = hit?.ip ?? host;
	let out = `PING ${host} (${ip}): 56 data bytes\n`;
	if (hit)
		for (let i = 0; i < count; i++) out += `64 bytes from ${ip}: seq=${i} ttl=64 time=0.081 ms\n`;
	out += `\n--- ${host} ping statistics ---\n`;
	const got = hit ? count : 0;
	out += `${count} packets transmitted, ${got} packets received, ${Math.round((100 * (count - got)) / count)}% packet loss\n`;
	if (hit) out += 'round-trip min/avg/max = 0.081/0.081/0.081 ms\n';
	return { state: s, out, err: '', code: hit ? 0 : 1 };
};

// 同じ網の httpd に GET（wget -qO- http://名前:口/道）
const wget: C = (s, args) => {
	const url = args.find((a) => a.startsWith('http://'));
	const quiet = args.some((a) => a === '-qO-' || a === '-q' || a === '-O-');
	if (!url || !quiet) return fail(s, MOCK('wget') + '（wget -qO- http://相手/ を使う）\n', 1);
	const m = url.match(/^http:\/\/([^/:]+)(?::(\d+))?(\/.*)?$/);
	const self = me(s);
	if (!m || !self) return fail(s, MOCK('wget'), 1);
	const [, host, portText, path = '/'] = m;
	const port = Number(portText ?? 80);
	const hit = lookupFrom(s.ext.docker, self, host);
	if (!hit) return fail(s, `wget: bad address '${host}'\n`, 1);
	const r = hit.target.running;
	if (r?.kind !== 'httpd' || r.port !== port)
		return fail(s, `wget: can't connect to remote host (${hit.ip}): Connection refused\n`, 1);
	const body = httpdFile(hit.target, r.dir, path);
	if (body === null) return fail(s, 'wget: server returned error: HTTP/1.1 404 Not Found\n', 1);
	return ok(s, body);
};

// httpd が返すファイル。/ は index.html
export function httpdFile(c: Container, dir: string, path: string): string | null {
	const p = `${dir}${path.endsWith('/') ? path + 'index.html' : path}`.replace(/\/+/g, '/');
	return readFile(c.fs, p);
}
export const NOT_FOUND =
	'<HTML><HEAD><TITLE>404 Not Found</TITLE></HEAD>\n<BODY><H1>404 Not Found</H1>\nThe requested URL was not found\n</BODY></HTML>\n';

// 中で使える命令（シェルの組み込みと、上の applet）
const FROM_SHELL = [
	'cd',
	'pwd',
	'echo',
	'printf',
	'ls',
	'mkdir',
	'rm',
	'export',
	'true',
	'false',
	'test',
	'[',
	'touch',
	'grep',
	'head',
	'tail',
	'wc',
	'cp',
	'mv'
];

export function busyboxCommands(): Commands<CtrCtx> {
	const sh = shellCommands<CtrCtx>();
	const out: Record<string, C> = {};
	for (const n of FROM_SHELL) if (sh[n]) out[n] = sh[n];
	Object.assign(out, {
		cat,
		uname,
		sleep,
		printenv,
		env,
		hostname,
		whoami,
		id,
		httpd,
		nc,
		ping,
		wget
	});
	// exec 命令：sh を置き換えて動かす（模擬では、そのまま動かす）
	out.exec = (s, args, io) => {
		const [name, ...rest] = args;
		const cmd = name === undefined ? undefined : out[name.slice(name.lastIndexOf('/') + 1)];
		if (!cmd) return fail(s, `sh: exec: ${name ?? ''}: not found\n`, 127);
		return cmd(s, rest, io);
	};
	return out;
}
