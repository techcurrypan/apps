// 文字の並びを扱う命令：head・tail・wc・sort・uniq・cut・grep・sha256sum。
// 出力・エラー・終了コードは本物の記録（tools-real/recorded/lnx-003・005・006、sec-002・012）と一字ずつ合わせる。
import { readFile, stat } from '../fs.ts';
import { utf8 } from '../sha1.ts';
import { sha256Hex } from '../sha256.ts';
import { toRegExp } from './regex.ts';
import { canRead, NULL_DEVICE, pathOf, type Cmd, type Io, type ShellState } from './run.ts';

const L = '‘';
const R = '’';
const tryHelp = (cmd: string) => `Try '${cmd} --help' for more information.\n`;

export type Opened = { data: string } | { error: 'missing' | 'dir' | 'denied' };

// ファイルを読む。「-」は標準入力
export function open<X>(s: ShellState<X>, name: string, io: Io<X>): Opened {
	if (name === '-') return { data: io.stdin };
	const path = pathOf(s, name);
	if (path === NULL_DEVICE) return { data: '' };
	const node = stat(s.fs, path);
	if (!node) return { error: 'missing' };
	if (!canRead(s.fs, path, s.user)) return { error: 'denied' };
	if (node.kind === 'dir') return { error: 'dir' };
	return { data: readFile(s.fs, path) ?? '' };
}

export const why = (e: 'missing' | 'dir' | 'denied') =>
	e === 'missing'
		? 'No such file or directory'
		: e === 'dir'
			? 'Is a directory'
			: 'Permission denied';

// 行に分ける（最後の改行の後ろは行に数えない。改行で終わらない最後の行は、そのまま残す）
export function splitLines(data: string): string[] {
	if (data === '') return [];
	const lines = data.split('\n');
	if (lines.at(-1) === '') lines.pop();
	return lines;
}

// 文字の並びを、C.UTF-8 と同じ順（符号の順）で比べる
const cmpBytes = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

type Count = { n: number; from: 'head' | 'tail' };

function readCount(
	cmd: 'head' | 'tail',
	args: string[]
): { count: Count; files: string[] } | { error: string } {
	let n = 10;
	let from: Count['from'] = cmd;
	const files: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		let v: string;
		if (a === '-n') v = args[++i] ?? '';
		else if (a.startsWith('-n')) v = a.slice(2);
		else if (/^-\d+$/.test(a)) v = a.slice(1);
		else {
			files.push(a);
			continue;
		}
		let t = v;
		if (cmd === 'tail' && t.startsWith('+')) {
			from = 'head';
			t = t.slice(1);
		}
		if (!/^\d+$/.test(t)) return { error: `${cmd}: invalid number of lines: ${L}${v}${R}\n` };
		n = Number(t);
	}
	return { count: { n, from }, files };
}

function headTail(cmd: 'head' | 'tail'): Cmd<unknown> {
	return (s, args, io) => {
		const r = readCount(cmd, args);
		if ('error' in r) return { state: s, out: '', err: r.error, code: 1 };
		const files = r.files.length > 0 ? r.files : ['-'];
		let out = '';
		let err = '';
		let code = 0;
		let shown = 0;
		for (const f of files) {
			const o = open(s, f, io);
			if ('error' in o) {
				err +=
					o.error === 'dir'
						? `${cmd}: error reading '${f}': Is a directory\n`
						: `${cmd}: cannot open '${f}' for reading: ${why(o.error)}\n`;
				code = 1;
				if (o.error !== 'dir') continue;
			}
			if (files.length > 1)
				out += `${shown > 0 ? '\n' : ''}==> ${f === '-' ? 'standard input' : f} <==\n`;
			shown++;
			if ('error' in o) continue;
			const lines = o.data.split('\n');
			// 行ごとに改行を付けたまま数える
			const withNl = lines
				.map((l, i) => (i < lines.length - 1 ? l + '\n' : l))
				.filter((l) => l !== '');
			const { n, from } = r.count;
			let picked: string[];
			if (cmd === 'head') picked = withNl.slice(0, n);
			else if (from === 'head') picked = withNl.slice(Math.max(0, n - 1));
			else picked = n === 0 ? [] : withNl.slice(-n);
			out += picked.join('');
		}
		return { state: s, out, err, code };
	};
}

const wc: Cmd<unknown> = (s, args, io) => {
	const flags = args.filter((a) => a.startsWith('-') && a !== '-').join('');
	let names = args.filter((a) => !a.startsWith('-') || a === '-');
	const want = { l: flags.includes('l'), w: flags.includes('w'), c: flags.includes('c') };
	if (!want.l && !want.w && !want.c) want.l = want.w = want.c = true;
	const fromStdin = names.length === 0;
	if (fromStdin) names = ['-'];
	type Row = { counts: number[]; name: string };
	const rows: Row[] = [];
	let err = '';
	let code = 0;
	let regular = 0;
	let nonRegular = false;
	let firstOk: boolean | null = null;
	for (const f of names) {
		const o = open(s, f, io);
		const okFile = !('error' in o) || o.error === 'dir';
		if (firstOk === null) firstOk = okFile;
		if ('error' in o) {
			err += `wc: ${f}: ${why(o.error)}\n`;
			code = 1;
			if (o.error !== 'dir') continue;
			nonRegular = true;
			rows.push({ counts: [0, 0, 0], name: f });
			continue;
		}
		const data = o.data;
		if (f === '-') nonRegular = true;
		else regular += utf8(data).length;
		const lines = (data.match(/\n/g) ?? []).length;
		const words = data.split(/\s+/).filter((x) => x !== '').length;
		rows.push({ counts: [lines, words, utf8(data).length], name: f === '-' && fromStdin ? '' : f });
	}
	const total = [0, 1, 2].map((i) => rows.reduce((a, r) => a + r.counts[i], 0));
	const parts = [want.l, want.w, want.c];
	const nCounts = parts.filter(Boolean).length;
	let width = 1;
	if (!(names.length === 1 && nCounts === 1) && firstOk) {
		for (let t = regular; t >= 10; t = Math.floor(t / 10)) width++;
		if (nonRegular) width = Math.max(width, 7);
	}
	const fmt = (counts: number[], name: string) =>
		counts
			.filter((_c, i) => parts[i])
			.map((c) => String(c).padStart(width))
			.join(' ') +
		(name ? ` ${name}` : '') +
		'\n';
	let out = rows.map((r) => fmt(r.counts, r.name)).join('');
	if (names.length > 1) out += fmt(total, 'total');
	return { state: s, out, err, code };
};

// sort -n の数の読み方：頭の空白・符号・数字・小数点まで。読めなければ 0
function numKey(line: string): number {
	const m = /^\s*(-?\d*(?:\.\d*)?)/.exec(line);
	const v = m ? Number.parseFloat(m[1]) : NaN;
	return Number.isNaN(v) ? 0 : v;
}

const sort: Cmd<unknown> = (s, args, io) => {
	const flags = args.filter((a) => a.startsWith('-') && a !== '-').join('');
	const names = args.filter((a) => !a.startsWith('-') || a === '-');
	const rev = flags.includes('r');
	const num = flags.includes('n');
	const uniq = flags.includes('u');
	let lines: string[] = [];
	for (const f of names.length > 0 ? names : ['-']) {
		const o = open(s, f, io);
		if ('error' in o) {
			const msg =
				o.error === 'dir'
					? `sort: read failed: ${f}: Is a directory\n`
					: `sort: cannot read: ${f}: ${why(o.error)}\n`;
			return { state: s, out: '', err: msg, code: 2 };
		}
		lines = lines.concat(splitLines(o.data));
	}
	const key = (a: string, b: string) => (num ? numKey(a) - numKey(b) : cmpBytes(a, b));
	// 鍵が同じなら、行全体を符号の順で比べる（-r はこれも逆にする）
	const cmp = (a: string, b: string) => {
		const k = key(a, b);
		const c = k !== 0 ? Math.sign(k) : uniq ? 0 : cmpBytes(a, b);
		return rev ? -c : c;
	};
	lines.sort(cmp);
	if (uniq) lines = lines.filter((l, i) => i === 0 || key(lines[i - 1], l) !== 0);
	return { state: s, out: lines.map((l) => l + '\n').join(''), err: '', code: 0 };
};

const uniq: Cmd<unknown> = (s, args, io) => {
	const count = args.includes('-c');
	const names = args.filter((a) => !a.startsWith('-') || a === '-');
	const o = open(s, names[0] ?? '-', io);
	if ('error' in o)
		return { state: s, out: '', err: `uniq: ${names[0]}: ${why(o.error)}\n`, code: 1 };
	const groups: { line: string; n: number }[] = [];
	for (const l of splitLines(o.data)) {
		const g = groups.at(-1);
		if (g && g.line === l) g.n++;
		else groups.push({ line: l, n: 1 });
	}
	const out = groups
		.map((g) => (count ? `${String(g.n).padStart(7)} ${g.line}\n` : `${g.line}\n`))
		.join('');
	return { state: s, out, err: '', code: 0 };
};

// cut の「1,3」「2-4」「5-」「-2」
function ranges(list: string): { ok: [number, number][] } | { error: string } {
	const out: [number, number][] = [];
	for (const part of list.split(',')) {
		const m = /^(\d*)(-?)(\d*)$/.exec(part);
		if (!m || (m[1] === '' && m[3] === '')) return { error: 'invalid field range' };
		const a = m[1] === '' ? 1 : Number(m[1]);
		const b = m[2] === '' ? a : m[3] === '' ? Infinity : Number(m[3]);
		if (a === 0 || b === 0)
			return { error: m[2] ? 'invalid range with no endpoint: -' : 'fields are numbered from 1' };
		out.push([a, b]);
	}
	return { ok: out };
}

const cut: Cmd<unknown> = (s, args, io) => {
	let delim = '\t';
	let list: string | null = null;
	let mode: 'f' | 'c' = 'f';
	const names: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-d') delim = args[++i] ?? '';
		else if (a.startsWith('-d')) delim = a.slice(2);
		else if (a === '-f' || a === '-c') {
			mode = a === '-f' ? 'f' : 'c';
			list = args[++i] ?? '';
		} else if (a.startsWith('-f') || a.startsWith('-c')) {
			mode = a[1] === 'f' ? 'f' : 'c';
			list = a.slice(2);
		} else names.push(a);
	}
	if (list === null)
		return {
			state: s,
			out: '',
			err: `cut: you must specify a list of bytes, characters, or fields\n${tryHelp('cut')}`,
			code: 1
		};
	const r = ranges(list);
	if ('error' in r)
		return { state: s, out: '', err: `cut: ${r.error}\n${tryHelp('cut')}`, code: 1 };
	const inRange = (k: number) => r.ok.some(([a, b]) => k >= a && k <= b);
	let out = '';
	let err = '';
	let code = 0;
	for (const f of names.length > 0 ? names : ['-']) {
		const o = open(s, f, io);
		if ('error' in o) {
			err += `cut: ${f}: ${why(o.error)}\n`;
			code = 1;
			continue;
		}
		for (const line of splitLines(o.data)) {
			if (mode === 'c') {
				out += [...line].filter((_c, i) => inRange(i + 1)).join('') + '\n';
				continue;
			}
			if (!line.includes(delim)) {
				out += line + '\n';
				continue;
			}
			out +=
				line
					.split(delim)
					.filter((_x, i) => inRange(i + 1))
					.join(delim) + '\n';
		}
	}
	return { state: s, out, err, code };
};

const grep: Cmd<unknown> = (s, args, io) => {
	const pats: string[] = [];
	const files: string[] = [];
	let opt = { n: false, i: false, v: false, c: false, E: false };
	for (let k = 0; k < args.length; k++) {
		const a = args[k];
		if (a === '-e') {
			pats.push(args[++k] ?? '');
			continue;
		}
		if (a.startsWith('-') && a.length > 1) {
			for (const ch of a.slice(1)) {
				if (ch === 'n' || ch === 'i' || ch === 'v' || ch === 'c' || ch === 'E')
					opt = { ...opt, [ch]: true };
				else return { state: s, out: '', err: `（模擬の grep では -${ch} を扱わない）\n`, code: 2 };
			}
			continue;
		}
		files.push(a);
	}
	if (pats.length === 0) {
		const p = files.shift();
		if (p === undefined)
			return {
				state: s,
				out: '',
				err: `Usage: grep [OPTION]... PATTERNS [FILE]...\n${tryHelp('grep')}`,
				code: 2
			};
		pats.push(...p.split('\n'));
	}
	const res: RegExp[] = [];
	for (const p of pats) {
		const c = toRegExp(p, opt.E);
		if ('error' in c) return { state: s, out: '', err: `grep: ${c.error}\n`, code: 2 };
		res.push(new RegExp(c.source, opt.i ? 'iu' : 'u'));
	}
	const list = files.length > 0 ? files : ['-'];
	const label = list.length > 1;
	let out = '';
	let err = '';
	let any = false;
	let trouble = false;
	for (const f of list) {
		const o = open(s, f, io);
		if ('error' in o) {
			err += `grep: ${f}: ${why(o.error)}\n`;
			trouble = true;
			continue;
		}
		const name = f === '-' ? '(standard input)' : f;
		let n = 0;
		splitLines(o.data).forEach((line, idx) => {
			const hit = res.some((re) => re.test(line)) !== opt.v;
			if (!hit) return;
			n++;
			any = true;
			if (!opt.c) out += `${label ? name + ':' : ''}${opt.n ? `${idx + 1}:` : ''}${line}\n`;
		});
		if (opt.c) out += `${label ? name + ':' : ''}${n}\n`;
	}
	return { state: s, out, err, code: trouble ? 2 : any ? 0 : 1 };
};

const sha256sum: Cmd<unknown> = (s, args, io) => {
	const check = args.includes('-c');
	const names = args.filter((a) => !a.startsWith('-') || a === '-');
	const list = names.length > 0 ? names : ['-'];
	let out = '';
	let err = '';
	let code = 0;
	if (check) {
		let bad = 0;
		for (const f of list) {
			const o = open(s, f, io);
			if ('error' in o) {
				err += `sha256sum: ${f}: ${why(o.error)}\n`;
				code = 1;
				continue;
			}
			for (const line of splitLines(o.data)) {
				const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
				if (!m) continue;
				const t = open(s, m[2], io);
				if ('error' in t) {
					err += `sha256sum: ${m[2]}: ${why(t.error)}\n`;
					out += `${m[2]}: FAILED open or read\n`;
					code = 1;
					continue;
				}
				const good = sha256Hex(utf8(t.data)) === m[1];
				out += `${m[2]}: ${good ? 'OK' : 'FAILED'}\n`;
				if (!good) bad++;
			}
		}
		if (bad > 0) {
			err += `sha256sum: WARNING: ${bad} computed checksum${bad > 1 ? 's' : ''} did NOT match\n`;
			code = 1;
		}
		return { state: s, out, err, code };
	}
	for (const f of list) {
		const o = open(s, f, io);
		if ('error' in o) {
			err += `sha256sum: ${f}: ${why(o.error)}\n`;
			code = 1;
			continue;
		}
		out += `${sha256Hex(utf8(o.data))}  ${f}\n`;
	}
	return { state: s, out, err, code };
};

export const textCommands: Record<string, Cmd<unknown>> = {
	head: headTail('head'),
	tail: headTail('tail'),
	wc,
	sort,
	uniq,
	cut,
	grep,
	sha256sum
};
