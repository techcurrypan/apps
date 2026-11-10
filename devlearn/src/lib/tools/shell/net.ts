// 網の命令の模擬：ip（addr・link・route・neigh）・ping・dig・ss・curl。
// 作り物の網（tools-real/worlds/net.json）の上で、本物の記録（net-002〜008・013）と一字ずつ合わせる。
// 本物でも決まらない物（ping の時間・dig の問い合わせの番号・表の並び）は、比べる前に両方を揃える（docs/tools.md 2 章）。
import { formatPrintf } from './basic.ts';
import {
	hostAt,
	ip4,
	isIp,
	parseCidr,
	resolve,
	routeTo,
	type NetState,
	type NetWorld
} from './networld.ts';
import { fail, ok, type Cmd, type ShellState } from './run.ts';
import { USERS } from './users.ts';

const NO_NET = '（この実戦の模擬には網が無い）\n';
const uidOf = (user: string) => USERS.find((u) => u.name === user)?.uid ?? 1000;

function withNeigh<X>(
	s: ShellState<X>,
	add: Record<string, 'REACHABLE' | 'FAILED'>
): ShellState<X> {
	if (!s.net) return s;
	return { ...s, net: { ...s.net, neigh: { ...s.net.neigh, ...add } } };
}

// 宛先へ送るとき、近くの表に増える物
function touchRoute(n: NetState, dst: string): Record<string, 'REACHABLE' | 'FAILED'> {
	const hop = routeTo(n.world, dst);
	if (hop.kind === 'local') return {};
	const next = hop.kind === 'link' ? dst : hop.gw;
	return { [next]: n.world.hosts.some((h) => h.addr === next) ? 'REACHABLE' : 'FAILED' };
}

// ---- ip ----

function ifaceLines(w: NetWorld, link: boolean, v4only: boolean, only?: string): string {
	const peer = 3;
	const lo = [
		`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN${link ? ' mode DEFAULT' : ''} group default qlen 1000`,
		...(v4only ? [] : ['    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00']),
		...(link
			? []
			: ['    inet 127.0.0.1/8 scope host lo', '       valid_lft forever preferred_lft forever'])
	];
	const head = `2: ${w.self.if}@if${peer}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP${link ? ' mode DEFAULT' : ''} group default qlen 1000`;
	const eth = [
		v4only ? `${head} link-netns sw` : head,
		...(v4only ? [] : [`    link/ether ${w.self.mac} brd ff:ff:ff:ff:ff:ff link-netns sw`]),
		...(link
			? []
			: [
					`    inet ${w.self.addr}/${w.self.prefix} scope global ${w.self.if}`,
					'       valid_lft forever preferred_lft forever'
				])
	];
	const parts = only === 'lo' ? [lo] : only === w.self.if ? [eth] : [lo, eth];
	return parts.map((p) => p.join('\n') + '\n').join('');
}

function routeLines(w: NetWorld): string {
	const net = (() => {
		const m = (0xffffffff << (32 - w.self.prefix)) >>> 0;
		const n = (ip4(w.self.addr) & m) >>> 0;
		return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
	})();
	const rows = [
		{ key: 0, line: `default via ${w.gateway} dev ${w.self.if} ` },
		{
			key: ip4(net),
			line: `${net}/${w.self.prefix} dev ${w.self.if} proto kernel scope link src ${w.self.addr} `
		},
		...w.routes.map((r) => ({
			key: ip4(parseCidr(r.to).net),
			line: `${r.to} via ${r.via} dev ${w.self.if} `
		}))
	];
	return rows
		.sort((a, b) => a.key - b.key)
		.map((r) => r.line + '\n')
		.join('');
}

function neighLines(n: NetState, only?: string): string {
	return Object.entries(n.neigh)
		.filter(([a]) => !only || a === only)
		.map(([a, st]) => {
			const h = n.world.hosts.find((x) => x.addr === a);
			return st === 'FAILED' || !h
				? `${a} dev ${n.world.self.if} FAILED \n`
				: `${a} dev ${n.world.self.if} lladdr ${h.mac} REACHABLE \n`;
		})
		.join('');
}

const ip: Cmd<unknown> = (s, args) => {
	const n = s.net;
	if (!n) return fail(s, NO_NET);
	let a = args;
	let v4 = false;
	if (a[0] === '-4') {
		v4 = true;
		a = a.slice(1);
	}
	const [obj = '', sub = 'show', ...rest] = a;
	const w = n.world;
	if ('address'.startsWith(obj) && obj !== '') {
		const dev = sub === 'show' ? rest[0] : undefined;
		return ok(s, ifaceLines(w, false, v4, dev));
	}
	if ('link'.startsWith(obj) && obj !== '')
		return ok(s, ifaceLines(w, true, false, sub === 'show' ? rest[0] : undefined));
	if ('route'.startsWith(obj) && obj !== '') {
		if (sub === 'show' || sub === 'list') return ok(s, routeLines(w));
		if (sub === 'get') {
			const dst = rest[0] ?? '';
			if (!isIp(dst)) return fail(s, `Error: inet prefix is expected rather than "${dst}".\n`, 1);
			const uid = uidOf(s.user);
			if (dst === w.self.addr || dst.startsWith('127.'))
				return ok(
					s,
					`local ${dst} dev lo src ${dst.startsWith('127.') ? '127.0.0.1' : dst} uid ${uid} \n    cache <local> \n`
				);
			const hop = routeTo(w, dst);
			const via = hop.kind === 'via' ? ` via ${hop.gw}` : '';
			return ok(s, `${dst}${via} dev ${w.self.if} src ${w.self.addr} uid ${uid} \n    cache \n`);
		}
	}
	if ('neighbour'.startsWith(obj) || 'neighbor'.startsWith(obj)) {
		if (sub === 'show' || sub === 'list') return ok(s, neighLines(n, rest[0]));
	}
	return fail(s, `（模擬の ip では「ip ${a.join(' ')}」を扱わない）\n`, 1);
};

// ---- ping ----

const ping: Cmd<unknown> = (s, args) => {
	const n = s.net;
	if (!n) return fail(s, NO_NET);
	let count = 4;
	let target = '';
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '-c') count = Number(args[++i] ?? '4') || 1;
		else target = args[i];
	}
	if (count > 5) return fail(s, '（模擬の ping は -c 5 までにする）\n', 2);
	const addr = resolve(n.world, target);
	if (!addr) return fail(s, `ping: ${target}: Name or service not known\n`, 2);
	const named = !isIp(target);
	// 名前で打ったときは、返事の住所を /etc/hosts で名前に戻す
	const back = named
		? (n.world.etc.hosts ?? '')
				.split('\n')
				.map((l) => l.trim().split(/\s+/))
				.find((p) => p[0] === addr)?.[1]
		: undefined;
	const from = back ? `${back} (${addr})` : addr;
	const reach = touchRoute(n, addr);
	const local = routeTo(n.world, addr).kind === 'local';
	const alive =
		local ||
		(hostAt(n.world, addr) !== null && Object.values(reach).every((v) => v === 'REACHABLE'));
	let out = `PING ${target} (${addr}) 56(84) bytes of data.\n`;
	const s2 = withNeigh(s, reach);
	if (!alive) {
		const onLink = routeTo(n.world, addr).kind === 'link';
		out += onLink ? `From ${n.world.self.addr} icmp_seq=1 Destination Host Unreachable\n` : '';
		out += `\n--- ${target} ping statistics ---\n`;
		out += `${count} packets transmitted, 0 received, ${onLink ? '+1 errors, ' : ''}100% packet loss, time 0ms\n\n`;
		return { state: s2, out, err: '', code: 1 };
	}
	for (let i = 1; i <= count; i++)
		out += `64 bytes from ${from}: icmp_seq=${i} ttl=64 time=0.050 ms\n`;
	out += `\n--- ${target} ping statistics ---\n`;
	out += `${count} packets transmitted, ${count} received, 0% packet loss, time ${(count - 1) * 1000}ms\n`;
	out += `rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms\n`;
	return { state: s2, out, err: '', code: 0 };
};

// ---- dig ----

// dig の欄は 8 字ごとの段に合わせて区切る（名前は 24 字目、TTL は 32 字目、…）
function cols(fields: string[]): string {
	let line = '';
	let width = 0;
	const stops = [24, 32, 40, 48];
	fields.forEach((f, i) => {
		line += f;
		width += f.length;
		if (i === fields.length - 1) return;
		const stop = stops[i];
		if (width >= stop) {
			line += ' ';
			width += 1;
			return;
		}
		while (width < stop) {
			line += '\t';
			width = Math.floor(width / 8) * 8 + 8;
		}
	});
	return line;
}

const wireLen = (name: string) => name.split('.').reduce((a, p) => a + p.length + 1, 0) + 1;

const dig: Cmd<unknown> = (s, args, io) => {
	const n = s.net;
	if (!n) return fail(s, NO_NET);
	const short = args.includes('+short');
	const noall = args.includes('+noall');
	const answerOnly = args.includes('+answer');
	const names = args.filter((a) => !a.startsWith('+') && !a.startsWith('-'));
	const name = names[0];
	if (!name) return fail(s, '（模擬の dig は「dig 名前」の形を扱う）\n', 1);
	if (names.length > 1 && names[1] !== 'A')
		return fail(s, '（模擬の dig は A の問い合わせだけを扱う）\n', 1);
	const w = n.world;
	const addr = w.dns.records[name] ?? null;
	const fq = name.endsWith('.') ? name : `${name}.`;
	const ans = addr ? cols([fq, String(w.dns.ttl), 'IN', 'A', addr]) : null;
	const s2 = withNeigh(s, touchRoute(n, w.dns.server));
	if (short) return ok(s2, addr ? `${addr}\n` : '');
	if (noall) return ok(s2, answerOnly && ans ? `${ans}\n` : '');
	const d = new Date((io.now + 9 * 3600) * 1000);
	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const p = (x: number) => String(x).padStart(2, '0');
	const when = `${DAYS[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} JST ${d.getUTCFullYear()}`;
	const size = 12 + wireLen(name) + 4 + (addr ? 16 : 0) + 11;
	const out = [
		'',
		`; <<>> DiG 9.18.39-0ubuntu0.24.04.9-Ubuntu <<>> ${args.join(' ')}`,
		';; global options: +cmd',
		';; Got answer:',
		`;; ->>HEADER<<- opcode: QUERY, status: ${addr ? 'NOERROR' : 'NXDOMAIN'}, id: 1`,
		`;; flags: qr ${addr ? 'aa ' : ''}rd ra; QUERY: 1, ANSWER: ${addr ? 1 : 0}, AUTHORITY: 0, ADDITIONAL: 1`,
		'',
		';; OPT PSEUDOSECTION:',
		'; EDNS: version: 0, flags:; udp: 1232',
		';; QUESTION SECTION:',
		cols([`;${fq}`, '', 'IN', 'A']),
		'',
		...(ans ? [';; ANSWER SECTION:', ans, ''] : []),
		';; Query time: 0 msec',
		`;; SERVER: ${w.dns.server}#53(${w.dns.server}) (UDP)`,
		`;; WHEN: ${when}`,
		`;; MSG SIZE  rcvd: ${size}`,
		'',
		''
	].join('\n');
	return ok(s2, out);
};

// ---- ss ----

type Col = { head: string; right: boolean; delim: string; cells: string[] };

// ss の欄の幅の決め方（iproute2 の render_calc_width）：中身の長さ → 余りを全ての欄に配り、割り切れない分は後ろの欄から
function render(columns: Col[], width = 80): string {
	const rows = columns[0].cells.length;
	const w = columns.map((c, i) => {
		const max = Math.max(c.head.length, ...c.cells.map((x) => x.length));
		return i > 0 && max > 0 ? max + c.delim.length : max;
	});
	const pad = width - w.reduce((a, x) => a + x, 0);
	const spacing = Math.floor(pad / w.length);
	let rem = pad % w.length;
	for (let i = w.length - 1; i >= 0; i--) {
		w[i] += spacing;
		if (rem > 0) {
			w[i]++;
			rem--;
		}
	}
	const line = (get: (c: Col) => string) =>
		columns
			.map((c, i) => {
				const d = i === 0 ? '' : c.delim;
				const room = w[i] - d.length;
				const t = get(c);
				return d + (c.right ? t.padStart(room) : t.padEnd(room));
			})
			.join('') + '\n';
	let out = line((c) => c.head);
	for (let r = 0; r < rows; r++) out += line((c) => c.cells[r]);
	return out;
}

const ss: Cmd<unknown> = (s, args) => {
	const n = s.net;
	if (!n) return fail(s, NO_NET);
	const flags = args.filter((a) => a.startsWith('-')).join('');
	const tcp = flags.includes('t');
	const udp = flags.includes('u');
	if (!flags.includes('l') || !flags.includes('n') || (!tcp && !udp))
		return fail(s, '（模擬の ss は -tln・-uln・-tuln の形を扱う）\n', 1);
	const socks = [
		...(udp ? n.world.listen.filter((l) => l.proto === 'udp') : []),
		...(tcp ? n.world.listen.filter((l) => l.proto === 'tcp') : [])
	];
	const cell = (f: (l: (typeof socks)[number]) => string) => socks.map(f);
	const columns: Col[] = [
		...(tcp && udp
			? [{ head: 'Netid', right: false, delim: '', cells: cell((l) => l.proto) }]
			: []),
		{
			head: 'State',
			right: false,
			delim: ' ',
			cells: cell((l) => (l.proto === 'tcp' ? 'LISTEN' : 'UNCONN'))
		},
		{ head: 'Recv-Q', right: false, delim: ' ', cells: cell(() => '0') },
		{
			head: 'Send-Q',
			right: false,
			delim: ' ',
			cells: cell((l) => (l.proto === 'tcp' ? '4096' : '0'))
		},
		{ head: 'Local Address:', right: true, delim: ' ', cells: cell((l) => `${l.addr}:`) },
		{ head: 'Port', right: false, delim: '', cells: cell((l) => String(l.port)) },
		{ head: 'Peer Address:', right: true, delim: ' ', cells: cell(() => '0.0.0.0:') },
		{ head: 'Port', right: false, delim: '', cells: cell(() => '*') },
		{ head: 'Process', right: false, delim: '', cells: cell(() => '') }
	];
	return ok(s, render(columns));
};

// ---- curl ----

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const httpDate = (t: number) => {
	const d = new Date(t * 1000);
	const p = (x: number) => String(x).padStart(2, '0');
	return `${DAYS[d.getUTCDay()]}, ${p(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT`;
};

type Reply = { status: number; reason: string; headers: [string, string][]; body: string };

function serve(
	w: NetWorld,
	method: string,
	path: string,
	req: Record<string, string>,
	now: number
): Reply {
	const page = w.site.pages[path] ?? w.site.pages['*'];
	let status = page.status;
	let reason = page.reason;
	let extra = page.headers;
	let body = page.body;
	if (page.etag && req['if-none-match'] === page.etag) {
		status = 304;
		reason = 'Not Modified';
		extra = extra.filter(([k]) => k === 'Cache-Control' || k === 'ETag');
		body = '';
	}
	const headers: [string, string][] = [
		['Server', w.site.server],
		['Date', httpDate(now)],
		...extra,
		...(status !== 304
			? ([['Content-Length', String(new TextEncoder().encode(body).length)]] as [string, string][])
			: [])
	];
	return { status, reason, headers, body: method === 'HEAD' ? '' : body };
}

// 端末に出す応答の頭（curl は端末では見出しを太字に、Location を押せる印にする）
function styledHead(r: Reply): string {
	let out = `HTTP/1.1 ${r.status} ${r.reason}\r\n`;
	let link = false;
	for (const [k, v] of r.headers) {
		out += link ? '\x1b]8;;\x1b\\' : '';
		link = false;
		if (k === 'Location') {
			out += `\x1b[1m${k}\x1b[0m: \x1b]8;;${v}\x1b\\${v}\r\n`;
			link = true;
		} else out += `\x1b[1m${k}\x1b[0m: ${v}\r\n`;
	}
	return out + (link ? '\x1b]8;;\x1b\\' : '') + '\r\n';
}

const curl: Cmd<unknown> = (s, args, io) => {
	const n = s.net;
	if (!n) return fail(s, NO_NET);
	const w = n.world;
	let verbose = false;
	let include = false;
	let head = false;
	let follow = false;
	let outFile: string | null = null;
	let format: string | null = null;
	const sent: Record<string, string> = {};
	const sentOrder: [string, string][] = [];
	let url = '';
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-H') {
			const h = args[++i] ?? '';
			const k = h.slice(0, h.indexOf(':')).trim();
			const v = h.slice(h.indexOf(':') + 1).trim();
			sent[k.toLowerCase()] = v;
			sentOrder.push([k, v]);
		} else if (a === '-o') outFile = args[++i] ?? '';
		else if (a === '-w') format = args[++i] ?? '';
		else if (/^-[a-zA-Z]+$/.test(a)) {
			for (const ch of a.slice(1)) {
				if (ch === 'v') verbose = true;
				else if (ch === 'i') include = true;
				else if (ch === 'I') head = true;
				else if (ch === 'L') follow = true;
				else if (ch === 's') continue;
				else return fail(s, `（模擬の curl では -${ch} を扱わない）\n`, 2);
			}
		} else url = a;
	}
	const m = /^http:\/\/([^/:]+)(?::(\d+))?(\/[^\s]*)?$/.exec(url);
	if (!m) return fail(s, '（模擬の curl は http:// の URL を扱う）\n', 3);
	let host = m[1];
	let port = Number(m[2] ?? '80');
	let path = m[3] ?? '/';
	let out = '';
	let err = '';
	let state = s;
	const method = head ? 'HEAD' : 'GET';
	for (let hop = 0; hop < 5; hop++) {
		const addr = resolve(w, host);
		if (!isIp(host) && !(w.etc.hosts ?? '').includes(` ${host}`))
			state = withNeigh(state, touchRoute(n, w.dns.server));
		if (!addr)
			return { state, out, err: err + `curl: (6) Could not resolve host: ${host}\n`, code: 6 };
		state = withNeigh(state, touchRoute(n, addr));
		const server = hostAt(w, addr);
		if (!server?.web || port !== 80)
			return {
				state,
				out,
				err:
					err +
					`curl: (7) Failed to connect to ${host} port ${port} after 0 ms: Couldn't connect to server\n`,
				code: 7
			};
		if (verbose) {
			if (!isIp(host))
				err += `* Host ${host}:${port} was resolved.\n* IPv6: (none)\n* IPv4: ${addr}\n`;
			err += `*   Trying ${addr}:${port}...\n* Connected to ${host} (${addr}) port ${port}\n`;
			err += `> ${method} ${path} HTTP/1.1\r\n> Host: ${host}\r\n> User-Agent: curl/8.5.0\r\n> Accept: */*\r\n`;
			for (const [k, v] of sentOrder) err += `> ${k}: ${v}\r\n`;
			err += '> \r\n';
		}
		const r = serve(w, method, path, sent, io.now);
		if (verbose) {
			err += `< HTTP/1.1 ${r.status} ${r.reason}\r\n`;
			for (const [k, v] of r.headers) err += `< ${k}: ${v}\r\n`;
			err += '< \r\n';
			err += `* Connection #0 to host ${host} left intact\n`;
		}
		const toFile = outFile !== null;
		if ((include || head) && !toFile) out += io.tty ? styledHead(r) : plainHead(r);
		const loc = r.headers.find(([k]) => k === 'Location')?.[1];
		const again = follow && loc !== undefined && r.status >= 300 && r.status < 400;
		// -L で次へ行くときは、行き先を知らせる応答の本体は出さない
		if (!toFile && !again) out += r.body;
		if (again && loc) {
			const lm = /^http:\/\/([^/:]+)(?::(\d+))?(\/[^\s]*)?$/.exec(loc);
			if (lm) {
				host = lm[1];
				port = Number(lm[2] ?? '80');
				path = lm[3] ?? '/';
				continue;
			}
		}
		if (format !== null)
			out += formatPrintf(format.replace(/%\{http_code\}/g, String(r.status)), []);
		return { state, out, err, code: 0 };
	}
	return { state, out, err: err + 'curl: (47) Maximum (50) redirects followed\n', code: 47 };
};

function plainHead(r: Reply): string {
	return (
		`HTTP/1.1 ${r.status} ${r.reason}\r\n` +
		r.headers.map(([k, v]) => `${k}: ${v}\r\n`).join('') +
		'\r\n'
	);
}

export const netCommands: Record<string, Cmd<unknown>> = { ip, ping, dig, ss, curl };
