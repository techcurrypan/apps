// 利用者と権限の命令：whoami・id・groups・sudo・tee。本物の記録（lnx-011）と一字ずつ合わせる。
// 模擬の世界の利用者は learner（sudo の組にいる）と root と nobody。
// sudo は、合言葉を入れた直後（覚えている間）の形で扱う（模擬の端末は合言葉を打つ口を持たないため。docs/tools.md 3.2）。
import { isDir, parentOf, readFile, stat, writeFile, type Fs } from '../fs.ts';
import {
	BUILTINS,
	canWrite,
	fail,
	GROUPS,
	lookPath,
	ok,
	pathOf,
	type Cmd,
	type ShellState
} from './run.ts';

const L = '‘';
const R = '’';

export type User = { name: string; uid: number; gid: number };
export const USERS: readonly User[] = [
	{ name: 'root', uid: 0, gid: 0 },
	{ name: 'learner', uid: 1000, gid: 1000 },
	{ name: 'nobody', uid: 65534, gid: 65534 }
];
const GIDS: Readonly<Record<string, number>> = { root: 0, sudo: 27, learner: 1000, nogroup: 65534 };
const primaryGroup = (u: User) => (u.name === 'nobody' ? 'nogroup' : u.name);
const groupsOf = (u: User) =>
	u.name === 'nobody' ? ['nogroup'] : [...(GROUPS[u.name] ?? [u.name])];
const userNamed = (n: string) => USERS.find((u) => u.name === n) ?? null;

const whoami: Cmd<unknown> = (s) => ok(s, s.user + '\n');

const id: Cmd<unknown> = (s, args) => {
	const name = args.find((a) => !a.startsWith('-')) ?? s.user;
	const u = userNamed(name);
	if (!u) return fail(s, `id: ${L}${name}${R}: no such user\n`);
	const g = (n: string) => `${GIDS[n]}(${n})`;
	const out = `uid=${u.uid}(${u.name}) gid=${g(primaryGroup(u))} groups=${groupsOf(u).map(g).join(',')}\n`;
	return ok(s, out);
};

const groups: Cmd<unknown> = (s, args) => {
	const names = args.filter((a) => !a.startsWith('-'));
	if (names.length === 0) {
		const u = userNamed(s.user);
		return ok(s, (u ? groupsOf(u) : [s.user]).join(' ') + '\n');
	}
	let out = '';
	let err = '';
	for (const n of names) {
		const u = userNamed(n);
		if (!u) err += `groups: ${L}${n}${R}: no such user\n`;
		else out += `${n} : ${groupsOf(u).join(' ')}\n`;
	}
	return { state: s, out, err, code: err ? 1 : 0 };
};

const tee: Cmd<unknown> = (s, args, io) => {
	const append = args.includes('-a');
	let fs = s.fs;
	let err = '';
	for (const a of args.filter((x) => !x.startsWith('-'))) {
		const path = pathOf(s, a);
		const node = stat(fs, path);
		if (node?.kind === 'dir') err += `tee: ${a}: Is a directory\n`;
		else if (!isDir(fs, parentOf(path))) err += `tee: ${a}: No such file or directory\n`;
		else if (node ? !canWrite(fs, path, s.user) : !canWrite(fs, parentOf(path), s.user))
			err += `tee: ${a}: Permission denied\n`;
		else fs = writeFile(fs, path, (append ? (readFile(fs, path) ?? '') : '') + io.stdin, io.now);
	}
	return { state: { ...s, fs }, out: io.stdin, err, code: err ? 1 : 0 };
};

// sudo が命令を探す道（Ubuntu の secure_path）
const SECURE_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin';

// root が作った物は root の物。権限は root の umask 022 による
function ownNew(before: Fs, after: Fs, owner: string): Fs {
	const out: Record<string, Fs[string]> = { ...after };
	for (const [p, n] of Object.entries(after))
		if (!before[p]) out[p] = { ...n, owner, mode: n.mode & ~0o022 };
	return out;
}

const sudo: Cmd<unknown> = (s, args, io) => {
	let k = 0;
	let target = 'root';
	if (args[0] === '-u') {
		target = args[1] ?? '';
		k = 2;
	}
	const [name, ...rest] = args.slice(k);
	if (name === undefined) return fail(s, '（模擬の sudo は「sudo 命令 引数」の形だけを扱う）\n', 1);
	if (!userNamed(target))
		return fail(
			s,
			`sudo: unknown user ${target}\nsudo: error initializing audit plugin sudoers_audit\n`
		);
	const asTarget: ShellState<unknown> = {
		...s,
		user: target,
		vars: { ...s.vars, PATH: SECURE_PATH }
	};
	const [found] = name.includes('/') ? [] : lookPath(asTarget, name, io.commands);
	const cmd = found?.kind === 'system' ? io.commands[found.name] : null;
	if (!cmd && BUILTINS.has(name))
		return fail(
			s,
			`sudo: ${name}: command not found\nsudo: "${name}" is a shell built-in command, it cannot be run directly.\nsudo: the -s option may be used to run a privileged shell.\nsudo: the -D option may be used to run a command in a specific directory.\n`
		);
	if (!cmd) return fail(s, `sudo: ${name}: command not found\n`);
	const r = cmd(asTarget, rest, io);
	const fs = target === s.user ? r.state.fs : ownNew(s.fs, r.state.fs, target);
	return { ...r, state: { ...r.state, fs, user: s.user, vars: s.vars } };
};

export const userCommands: Record<string, Cmd<unknown>> = { whoami, id, groups, tee, sudo };
