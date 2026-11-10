// どの模擬の道具にも入れる、基本の命令：cd・pwd・echo・printf・ls・cat・mkdir・rm。
import {
	baseName,
	isDir,
	listDir,
	mkdir as mkdirFs,
	ownerOf,
	parentOf,
	readFile,
	remove,
	stat,
	type Fs
} from '../fs.ts';
import { utf8 } from '../sha1.ts';
import { canRead, canWrite, fail, ok, pathOf, TZ_OFFSET, type Cmd, type Commands } from './run.ts';

const L = '‘';
const R = '’';
const tryHelp = (cmd: string) => `Try '${cmd} --help' for more information.\n`;

// 端末で見たときの字の幅（日本語などは 2）
export function displayWidth(s: string): number {
	let w = 0;
	for (const ch of s) w += (ch.codePointAt(0) ?? 0) >= 0x1100 ? 2 : 1;
	return w;
}

// GNU ls の端末向けの並べ方（縦に詰める・幅 80・間 2 字）
export function columns(names: string[], width = 80): string {
	if (names.length === 0) return '';
	const w = names.map(displayWidth);
	for (let cols = names.length; cols >= 1; cols--) {
		const rows = Math.ceil(names.length / cols);
		if (Math.ceil(names.length / rows) !== cols) continue;
		const colW: number[] = [];
		for (let c = 0; c < cols; c++) {
			let m = 0;
			for (let r = 0; r < rows; r++) {
				const i = c * rows + r;
				if (i < names.length) m = Math.max(m, w[i]);
			}
			colW.push(m);
		}
		const total = colW.reduce((a, x) => a + x, 0) + 2 * (cols - 1);
		if (total > width && cols > 1) continue;
		const lines: string[] = [];
		for (let r = 0; r < rows; r++) {
			let line = '';
			for (let c = 0; c < cols; c++) {
				const i = c * rows + r;
				if (i >= names.length) break;
				const last = c === cols - 1 || (c + 1) * rows + r >= names.length;
				line += last ? names[i] : names[i] + ' '.repeat(colW[c] - w[i] + 2);
			}
			lines.push(line);
		}
		return lines.join('\n') + '\n';
	}
	return names.join('\n') + '\n';
}

// printf と echo -e の \ の並び
function unescape(s: string): string {
	return s.replace(/\\(.)/g, (_m, c: string) => {
		switch (c) {
			case 'n':
				return '\n';
			case 't':
				return '\t';
			case '\\':
				return '\\';
			case '"':
				return '"';
			default:
				return '\\' + c;
		}
	});
}

export function formatPrintf(fmt: string, args: string[]): string {
	let out = '';
	let k = 0;
	do {
		const start = k;
		out += unescape(fmt).replace(/%([%sd])/g, (_m, c: string) => {
			if (c === '%') return '%';
			const v = args[k++] ?? '';
			return c === 'd' ? String(Number.parseInt(v || '0', 10) || 0) : v;
		});
		if (k === start) break;
	} while (k < args.length);
	return out;
}

const cd: Cmd<unknown> = (s, args, io) => {
	const target = args[0] ?? s.home;
	const path = pathOf(s, target);
	const node = stat(s.fs, path);
	if (!node) return fail(s, `${io.prefix}cd: ${target}: No such file or directory\n`);
	if (node.kind !== 'dir') return fail(s, `${io.prefix}cd: ${target}: Not a directory\n`);
	return ok({ ...s, cwd: path, vars: { ...s.vars, PWD: path } });
};

const pwd: Cmd<unknown> = (s) => ok(s, s.cwd + '\n');

const echo: Cmd<unknown> = (s, args) => {
	let a = args;
	let nl = true;
	if (a[0] === '-n') {
		nl = false;
		a = a.slice(1);
	}
	return ok(s, a.join(' ') + (nl ? '\n' : ''));
};

const printf: Cmd<unknown> = (s, args) => {
	if (args.length === 0) {
		return fail(s, 'printf: usage: printf [-v var] format [arguments]\n', 2);
	}
	return ok(s, formatPrintf(args[0], args.slice(1)));
};

// ---- ls ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// GNU ls は、半年（平均の 1 年の半分）より新しく、今より前の物に時刻を出す
const SIX_MONTHS = 31556952 / 2;

export function modeString(kind: 'file' | 'dir', mode: number): string {
	let out = kind === 'dir' ? 'd' : '-';
	for (const shift of [6, 3, 0]) {
		const b = (mode >> shift) & 7;
		out += (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-');
	}
	if (mode & 0o1000) out = out.slice(0, 9) + (mode & 1 ? 't' : 'T');
	return out;
}

export function lsDate(t: number, now: number): string {
	const d = new Date((t + TZ_OFFSET) * 1000);
	const mon = MONTHS[d.getUTCMonth()];
	const day = String(d.getUTCDate()).padStart(2);
	const recent = now - SIX_MONTHS < t && t < now;
	if (!recent) return `${mon} ${day}  ${d.getUTCFullYear()}`;
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	return `${mon} ${day} ${hh}:${mm}`;
}

type LongRow = {
	mode: string;
	links: number;
	owner: string;
	size: number;
	date: string;
	name: string;
};

const child = (dir: string, name: string) => `${dir === '/' ? '' : dir}/${name}`;

function longRow(fs: Fs, path: string, name: string, now: number): LongRow {
	const n = stat(fs, path);
	if (!n) throw new Error(`no such path: ${path}`);
	const owner = ownerOf(fs, path);
	const links =
		n.kind === 'dir' ? 2 + listDir(fs, path).filter((c) => isDir(fs, child(path, c))).length : 1;
	const size = n.kind === 'dir' ? 4096 : utf8(n.data).length;
	return { mode: modeString(n.kind, n.mode), links, owner, size, date: lsDate(n.mtime, now), name };
}

// 使う量（1K 単位。4K の塊ごとに取る）
const blocks = (r: LongRow) => Math.ceil(r.size / 4096) * 4;

function longLines(rows: LongRow[]): string {
	const w = (f: (r: LongRow) => string) => Math.max(0, ...rows.map((r) => f(r).length));
	const lw = w((r) => String(r.links));
	const ow = w((r) => r.owner);
	const sw = w((r) => String(r.size));
	return rows
		.map((r) =>
			[
				r.mode,
				String(r.links).padStart(lw),
				r.owner.padEnd(ow),
				r.owner.padEnd(ow),
				String(r.size).padStart(sw),
				r.date,
				r.name
			].join(' ')
		)
		.map((l) => l + '\n')
		.join('');
}

const ls: Cmd<unknown> = (s, args, io) => {
	const flags = args.filter((a) => a.startsWith('-') && a !== '-').join('');
	const all = flags.includes('a');
	const one = flags.includes('1');
	const long = flags.includes('l');
	const self = flags.includes('d');
	const targets = args.filter((a) => !a.startsWith('-') || a === '-');
	const list = targets.length > 0 ? targets : ['.'];
	let out = '';
	let err = '';
	let code = 0;
	const show = (names: string[]) =>
		io.tty && !one ? columns(names) : names.map((n) => n + '\n').join('');
	const files: string[] = [];
	const dirs: string[] = [];
	for (const t of list) {
		const node = stat(s.fs, pathOf(s, t));
		if (!node) {
			err += `ls: cannot access '${t}': No such file or directory\n`;
			code = 2;
		} else if (node.kind === 'dir' && !self) dirs.push(t);
		else files.push(t);
	}
	if (files.length > 0)
		out += long ? longLines(files.map((t) => longRow(s.fs, pathOf(s, t), t, io.now))) : show(files);
	dirs.forEach((t, i) => {
		const path = pathOf(s, t);
		if (list.length > 1) out += `${files.length > 0 || i > 0 ? '\n' : ''}${t}:\n`;
		if (!canRead(s.fs, path, s.user)) {
			err += `ls: cannot open directory '${t}': Permission denied\n`;
			code = 2;
			return;
		}
		let names = listDir(s.fs, path);
		names = all ? ['.', '..', ...names] : names.filter((n) => !n.startsWith('.'));
		if (!long) {
			out += show(names);
			return;
		}
		const rows = names.map((n) => {
			const p = n === '.' ? path : n === '..' ? parentOf(path) : child(path, n);
			return longRow(s.fs, p, n, io.now);
		});
		out += `total ${rows.reduce((a, r) => a + blocks(r), 0)}\n` + longLines(rows);
	});
	return { state: s, out, err, code };
};

const cat: Cmd<unknown> = (s, args, io) => {
	if (args.length === 0) return ok(s, io.stdin);
	let out = '';
	let err = '';
	let code = 0;
	for (const a of args) {
		if (a === '-') {
			out += io.stdin;
			continue;
		}
		const path = pathOf(s, a);
		const node = stat(s.fs, path);
		const data = readFile(s.fs, path);
		if (node && !canRead(s.fs, path, s.user)) {
			err += `cat: ${a}: Permission denied\n`;
			code = 1;
		} else if (data !== null) out += data;
		else {
			err += `cat: ${a}: ${isDir(s.fs, path) ? 'Is a directory' : 'No such file or directory'}\n`;
			code = 1;
		}
	}
	return { state: s, out, err, code };
};

const mkdir: Cmd<unknown> = (s, args, io) => {
	const parents = args.includes('-p');
	let fs = s.fs;
	let err = '';
	const names = args.filter((x) => !x.startsWith('-'));
	if (names.length === 0) return fail(s, `mkdir: missing operand\n${tryHelp('mkdir')}`);
	for (const a of names) {
		const path = pathOf(s, a);
		if (stat(fs, path)) {
			if (!parents) err += `mkdir: cannot create directory ${L}${a}${R}: File exists\n`;
			continue;
		}
		if (!isDir(fs, parentOf(path))) {
			if (!parents) {
				err += `mkdir: cannot create directory ${L}${a}${R}: No such file or directory\n`;
				continue;
			}
			const parts = path.split('/').filter(Boolean);
			let cur = '';
			for (const part of parts) {
				cur += `/${part}`;
				if (!stat(fs, cur)) fs = mkdirFs(fs, cur, io.now);
			}
			continue;
		}
		if (!canWrite(fs, parentOf(path), s.user)) {
			err += `mkdir: cannot create directory ${L}${a}${R}: Permission denied\n`;
			continue;
		}
		fs = mkdirFs(fs, path, io.now);
	}
	return { state: { ...s, fs }, out: '', err, code: err ? 1 : 0 };
};

const rm: Cmd<unknown> = (s, args, io) => {
	const flags = args.filter((a) => a.startsWith('-')).join('');
	const recursive = /[rR]/.test(flags);
	const force = flags.includes('f');
	let fs = s.fs;
	let err = '';
	const names = args.filter((x) => !x.startsWith('-'));
	if (names.length === 0 && !force) return fail(s, `rm: missing operand\n${tryHelp('rm')}`);
	for (const a of names) {
		const path = pathOf(s, a);
		const node = stat(fs, path);
		if (!node) {
			if (!force) err += `rm: cannot remove '${a}': No such file or directory\n`;
		} else if (node.kind === 'dir' && !recursive) {
			err += `rm: cannot remove '${a}': Is a directory\n`;
		} else if (!canWrite(fs, parentOf(path), s.user)) {
			err += `rm: cannot remove '${a}': Permission denied\n`;
		} else fs = remove(fs, path, io.now);
	}
	return { state: { ...s, fs }, out: '', err, code: err ? 1 : 0 };
};

export function basicCommands<X>(): Commands<X> {
	return {
		cd,
		pwd,
		echo,
		printf,
		ls,
		cat,
		mkdir,
		rm
	} as Commands<unknown> as unknown as Commands<X>;
}

export { baseName };
