// どの模擬の道具にも入れる、基本の命令：cd・pwd・echo・printf・ls・cat。
import { baseName, isDir, listDir, readFile, stat } from '../fs.ts';
import { fail, ok, pathOf, type Cmd, type Commands } from './run.ts';

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

const cd: Cmd<unknown> = (s, args) => {
	const target = args[0] ?? s.home;
	const path = pathOf(s, target);
	const node = stat(s.fs, path);
	if (!node) return fail(s, `bash: cd: ${target}: No such file or directory\n`);
	if (node.kind !== 'dir') return fail(s, `bash: cd: ${target}: Not a directory\n`);
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

const ls: Cmd<unknown> = (s, args, io) => {
	const flags = args.filter((a) => a.startsWith('-') && a !== '-').join('');
	const all = flags.includes('a');
	const one = flags.includes('1');
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
		const path = pathOf(s, t);
		const node = stat(s.fs, path);
		if (!node) {
			err += `ls: cannot access '${t}': No such file or directory\n`;
			code = 2;
		} else if (node.kind === 'dir') dirs.push(t);
		else files.push(t);
	}
	if (files.length > 0) out += show(files);
	dirs.forEach((t, i) => {
		const path = pathOf(s, t);
		let names = listDir(s.fs, path);
		names = all ? ['.', '..', ...names] : names.filter((n) => !n.startsWith('.'));
		if (list.length > 1) out += `${files.length > 0 || i > 0 ? '\n' : ''}${t}:\n`;
		out += show(names);
	});
	return { state: s, out, err, code };
};

const cat: Cmd<unknown> = (s, args, io) => {
	if (args.length === 0) return ok(s, io.stdin);
	let out = '';
	let err = '';
	let code = 0;
	for (const a of args) {
		const path = pathOf(s, a);
		const data = readFile(s.fs, path);
		if (data !== null) out += data;
		else {
			err += `cat: ${a}: ${isDir(s.fs, path) ? 'Is a directory' : 'No such file or directory'}\n`;
			code = 1;
		}
	}
	return { state: s, out, err, code };
};

export function basicCommands<X>(): Commands<X> {
	return { cd, pwd, echo, printf, ls, cat } as Commands<unknown> as unknown as Commands<X>;
}

export { baseName };
