// ファイルの木を変える命令：touch・cp・mv・chmod。本物の記録（lnx-002・004）と一字ずつ合わせる。
import {
	baseName,
	isDir,
	listDir,
	mkdir,
	parentOf,
	remove,
	stat,
	UMASK,
	writeFile,
	type Fs
} from '../fs.ts';
import { canRead, canWrite, pathOf, type Cmd } from './run.ts';

const L = '‘';
const R = '’';
const tryHelp = (cmd: string) => `Try '${cmd} --help' for more information.\n`;
const res = <S>(state: S, err: string, out = '') => ({ state, out, err, code: err ? 1 : 0 });

const opts = (args: string[]) => args.filter((a) => a.startsWith('-') && a !== '-').join('');
const operands = (args: string[]) => args.filter((a) => !a.startsWith('-') || a === '-');

const touch: Cmd<unknown> = (s, args, io) => {
	const names = operands(args);
	if (names.length === 0) return res(s, `touch: missing file operand\n${tryHelp('touch')}`);
	let fs = s.fs;
	let err = '';
	for (const a of names) {
		const path = pathOf(s, a);
		const node = stat(fs, path);
		if (node) fs = { ...fs, [path]: { ...node, mtime: io.now } };
		else if (!isDir(fs, parentOf(path)))
			err += `touch: cannot touch '${a}': No such file or directory\n`;
		else if (!canWrite(fs, parentOf(path), s.user))
			err += `touch: cannot touch '${a}': Permission denied\n`;
		else fs = writeFile(fs, path, '', io.now);
	}
	return res({ ...s, fs }, err);
};

// dir の下を丸ごと to の下へ写す
function copyTree(fs: Fs, from: string, to: string, now: number): Fs {
	let out = mkdir(fs, to, now, stat(fs, from)?.mode);
	for (const name of listDir(fs, from)) {
		const src = `${from}/${name}`;
		const dst = `${to}/${name}`;
		const n = stat(fs, src);
		if (n?.kind === 'dir') out = copyTree(out, src, dst, now);
		else if (n) out = writeFile(out, dst, n.data, now, n.mode & ~UMASK);
	}
	return out;
}

// 写す先・移す先の道（先がディレクトリなら、その中の同じ名前）
function target(fs: Fs, src: string, dst: string): string {
	return isDir(fs, dst) ? `${dst === '/' ? '' : dst}/${baseName(src)}` : dst;
}

function missingOperand(cmd: string, names: string[]): string | null {
	if (names.length === 0) return `${cmd}: missing file operand\n${tryHelp(cmd)}`;
	if (names.length === 1)
		return `${cmd}: missing destination file operand after '${names[0]}'\n${tryHelp(cmd)}`;
	return null;
}

const cp: Cmd<unknown> = (s, args, io) => {
	const recursive = /[rRa]/.test(opts(args));
	const names = operands(args);
	const miss = missingOperand('cp', names);
	if (miss) return res(s, miss);
	const dstName = names[names.length - 1];
	const dst = pathOf(s, dstName);
	let fs = s.fs;
	let err = '';
	for (const a of names.slice(0, -1)) {
		const src = pathOf(s, a);
		const node = stat(fs, src);
		if (!node) {
			err += `cp: cannot stat '${a}': No such file or directory\n`;
			continue;
		}
		const to = target(fs, src, dst);
		if (to === src) {
			err += `cp: '${a}' and '${to === dst ? dstName : to}' are the same file\n`;
			continue;
		}
		if (node.kind === 'dir') {
			if (!recursive) {
				err += `cp: -r not specified; omitting directory '${a}'\n`;
				continue;
			}
			fs = copyTree(fs, src, to, io.now);
			continue;
		}
		if (!canRead(fs, src, s.user)) {
			err += `cp: cannot open '${a}' for reading: Permission denied\n`;
			continue;
		}
		if (!isDir(fs, parentOf(to))) {
			err += `cp: cannot create regular file '${dstName}': No such file or directory\n`;
			continue;
		}
		const old = stat(fs, to);
		if (old ? !canWrite(fs, to, s.user) : !canWrite(fs, parentOf(to), s.user)) {
			const shown = isDir(fs, dst) ? `${dstName.replace(/\/+$/, '')}/${baseName(src)}` : dstName;
			err += `cp: cannot create regular file '${shown}': Permission denied\n`;
			continue;
		}
		fs = writeFile(fs, to, node.data, io.now, old ? old.mode : node.mode & ~UMASK);
	}
	return res({ ...s, fs }, err);
};

const mv: Cmd<unknown> = (s, args, io) => {
	const names = operands(args);
	const miss = missingOperand('mv', names);
	if (miss) return res(s, miss);
	const dst = pathOf(s, names[names.length - 1]);
	let fs = s.fs;
	let err = '';
	for (const a of names.slice(0, -1)) {
		const src = pathOf(s, a);
		const node = stat(fs, src);
		if (!node) {
			err += `mv: cannot stat '${a}': No such file or directory\n`;
			continue;
		}
		const to = target(fs, src, dst);
		if (to === src) continue;
		if (!isDir(fs, parentOf(to))) {
			err += `mv: cannot move '${a}' to '${names[names.length - 1]}': No such file or directory\n`;
			continue;
		}
		// 中の物ごと、道だけを変える（時刻と権限はそのまま）
		const moved: Record<string, (typeof fs)[string]> = {};
		for (const [p, n] of Object.entries(fs))
			if (p === src || p.startsWith(`${src}/`)) moved[to + p.slice(src.length)] = n;
		fs = remove(remove(fs, to), src, io.now);
		const parent = stat(fs, parentOf(to));
		fs = { ...fs, ...moved };
		if (parent) fs = { ...fs, [parentOf(to)]: { ...parent, mtime: io.now } };
	}
	return res({ ...s, fs }, err);
};

// chmod の書き方を、今の権限から新しい権限への関数にする
function parseMode(spec: string): ((m: number, dir: boolean) => number) | null {
	if (/^[0-7]{1,4}$/.test(spec)) {
		const v = Number.parseInt(spec, 8);
		return () => v;
	}
	const clauses = spec.split(',');
	const steps: ((m: number) => number)[] = [];
	for (const c of clauses) {
		const m = /^([ugoa]*)([-+=])([rwxX]*)$/.exec(c);
		if (!m) return null;
		const who = m[1] === '' ? null : m[1].includes('a') ? 'ugo' : m[1];
		const op = m[2];
		let bits = 0;
		for (const p of m[3]) bits |= p === 'r' ? 4 : p === 'w' ? 2 : 1;
		let mask = 0;
		for (const w of who ?? 'ugo') mask |= bits << (w === 'u' ? 6 : w === 'g' ? 3 : 0);
		const whoMask = [...(who ?? 'ugo')].reduce(
			(a, w) => a | (7 << (w === 'u' ? 6 : w === 'g' ? 3 : 0)),
			0
		);
		// 誰も書かないときは umask で隠れる所を変えない
		const eff = who === null ? mask & ~UMASK : mask;
		steps.push((cur) => {
			if (op === '+') return cur | eff;
			if (op === '-') return cur & ~eff;
			return (cur & ~(who === null ? whoMask & ~UMASK : whoMask)) | eff;
		});
	}
	return (m) => steps.reduce((cur, f) => f(cur), m & 0o7777);
}

const chmod: Cmd<unknown> = (s, args) => {
	// -x のような書き方は、権限の指定として読む（オプションではない）
	const names = args.filter((a) => a !== '-R');
	if (names.length === 0) return res(s, `chmod: missing operand\n${tryHelp('chmod')}`);
	const [spec, ...files] = names;
	if (files.length === 0)
		return res(s, `chmod: missing operand after ${L}${spec}${R}\n${tryHelp('chmod')}`);
	const f = parseMode(spec);
	if (!f) return res(s, `chmod: invalid mode: ${L}${spec}${R}\n${tryHelp('chmod')}`);
	let fs = s.fs;
	let err = '';
	for (const a of files) {
		const path = pathOf(s, a);
		const node = stat(fs, path);
		if (!node) {
			err += `chmod: cannot access '${a}': No such file or directory\n`;
			continue;
		}
		fs = { ...fs, [path]: { ...node, mode: f(node.mode, node.kind === 'dir') } };
	}
	return res({ ...s, fs }, err);
};

export const fileCommands: Record<string, Cmd<unknown>> = { touch, cp, mv, chmod };
