// 変数・台本の命令：export・unset・env・which・true・false・[・test・exit・bash。
// 本物の記録（lnx-008・009）と一字ずつ合わせる。
import { readFile, stat } from '../fs.ts';
import {
	canExec,
	canRead,
	fail,
	lookPath,
	ok,
	pathOf,
	runChild,
	type Cmd,
	type Io,
	type ShellState
} from './run.ts';

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// bash は変数を FNV-1 の 1024 の箱に入れて持ち、子に渡す環境は箱の順（同じ箱では新しい物が先）に並ぶ
export function bashHash(name: string): number {
	let h = 2166136261;
	for (const b of new TextEncoder().encode(name)) {
		h = Math.imul(h, 16777619) >>> 0;
		h = (h ^ b) >>> 0;
	}
	return h;
}

export function envOrder<X>(s: ShellState<X>): string[] {
	const names = Object.keys(s.vars).filter((k) => s.exported.includes(k));
	const born = new Map(names.map((n, i) => [n, i]));
	return names.sort((a, b) => {
		const d = (bashHash(a) & 1023) - (bashHash(b) & 1023);
		return d !== 0 ? d : (born.get(b) ?? 0) - (born.get(a) ?? 0);
	});
}

const exportCmd: Cmd<unknown> = (s, args, io) => {
	if (args.length === 0 || args[0] === '-p') {
		const out = [...envOrder(s)]
			.sort()
			.map((k) => `declare -x ${k}="${s.vars[k]}"\n`)
			.join('');
		return ok(s, out);
	}
	let vars = { ...s.vars };
	const exported = new Set(s.exported);
	let err = '';
	for (const a of args) {
		const eq = a.indexOf('=');
		const name = eq < 0 ? a : a.slice(0, eq);
		if (!NAME.test(name)) {
			err += `${io.prefix}export: \`${a}': not a valid identifier\n`;
			continue;
		}
		if (eq >= 0) vars = { ...vars, [name]: a.slice(eq + 1) };
		exported.add(name);
	}
	return { state: { ...s, vars, exported: [...exported] }, out: '', err, code: err ? 1 : 0 };
};

const unset: Cmd<unknown> = (s, args) => {
	const vars = { ...s.vars };
	for (const a of args) delete vars[a];
	return ok({ ...s, vars, exported: s.exported.filter((k) => !args.includes(k)) });
};

const env: Cmd<unknown> = (s, args) => {
	if (args.length > 0) return fail(s, '（模擬の env は、引数なしで一覧を出す形だけを扱う）\n', 125);
	const out = envOrder(s)
		.map((k) => `${k}=${s.vars[k]}\n`)
		.join('');
	return ok(s, out + '_=/usr/bin/env\n');
};

const which: Cmd<unknown> = (s, args, io) => {
	const all = args.includes('-a');
	const names = args.filter((a) => !a.startsWith('-'));
	let out = '';
	let missing = names.length === 0;
	for (const n of names) {
		if (n.includes('/')) {
			const p = pathOf(s, n);
			if (stat(s.fs, p)?.kind === 'file' && canExec(s.fs, p, s.user)) out += n + '\n';
			else missing = true;
			continue;
		}
		const found = lookPath(s, n, io.commands, all);
		if (found.length === 0) missing = true;
		for (const f of found) out += f.path + '\n';
	}
	return { state: s, out, err: '', code: missing ? 1 : 0 };
};

// [ と test の中身
function evaluate(a: string[], who: string, io: Io<unknown>): { code: number; err: string } {
	const bad = (m: string) => ({ code: 2, err: `${io.prefix}${who}: ${m}\n` });
	const int = (x: string) => /^\s*[-+]?\d+\s*$/.test(x);
	const yes = (b: boolean) => ({ code: b ? 0 : 1, err: '' });
	const not = (r: { code: number; err: string }) =>
		r.code === 2 ? r : { code: 1 - r.code, err: '' };
	if (a.length === 0) return yes(false);
	if (a.length === 1) return yes(a[0] !== '');
	if (a[0] === '!' && a.length <= 4) return not(evaluate(a.slice(1), who, io));
	if (a.length === 2) {
		const [op, x] = a;
		switch (op) {
			case '-z':
				return yes(x === '');
			case '-n':
				return yes(x !== '');
			default:
				return bad(`${op}: unary operator expected`);
		}
	}
	if (a.length === 3) {
		const [x, op, y] = a;
		switch (op) {
			case '=':
			case '==':
				return yes(x === y);
			case '!=':
				return yes(x !== y);
			case '-eq':
			case '-ne':
			case '-lt':
			case '-le':
			case '-gt':
			case '-ge': {
				if (!int(x)) return bad(`${x}: integer expression expected`);
				if (!int(y)) return bad(`${y}: integer expression expected`);
				const m = Number(x);
				const n = Number(y);
				const r = {
					'-eq': m === n,
					'-ne': m !== n,
					'-lt': m < n,
					'-le': m <= n,
					'-gt': m > n,
					'-ge': m >= n
				};
				return yes(r[op]);
			}
			default:
				return bad(`${op}: binary operator expected`);
		}
	}
	return bad('too many arguments');
}

function fileTest<X>(s: ShellState<X>, op: string, name: string): boolean | null {
	const p = pathOf(s, name);
	const n = stat(s.fs, p);
	switch (op) {
		case '-e':
			return !!n;
		case '-f':
			return n?.kind === 'file';
		case '-d':
			return n?.kind === 'dir';
		case '-s':
			return n?.kind === 'file' && n.data.length > 0;
		case '-r':
			return canRead(s.fs, p, s.user);
		case '-x':
			return canExec(s.fs, p, s.user);
		default:
			return null;
	}
}

function testWith(who: '[' | 'test'): Cmd<unknown> {
	return (s, args, io) => {
		let a = args;
		if (who === '[') {
			if (a.at(-1) !== ']') return fail(s, `${io.prefix}[: missing \`]'\n`, 2);
			a = a.slice(0, -1);
		}
		const neg = a[0] === '!' && a.length === 3;
		const b = neg ? a.slice(1) : a;
		if (b.length === 2 && b[0] !== '!') {
			const r = fileTest(s, b[0], b[1]);
			if (r !== null) return { state: s, out: '', err: '', code: r !== neg ? 0 : 1 };
		}
		const r = evaluate(a, who, io);
		return { state: s, out: '', err: r.err, code: r.code };
	};
}

const exit: Cmd<unknown> = (s, args, io) => {
	const code = args[0] === undefined ? s.lastCode : Number.parseInt(args[0], 10) & 255 || 0;
	if (io.interactive)
		return { state: s, out: '', err: '（模擬の端末は閉じない。exit は台本の中で使う）\n', code };
	return { state: s, out: '', err: '', code, exit: true };
};

const bash: Cmd<unknown> = (s, args, io) => {
	if (args[0] === '-c') {
		const text = args[1];
		if (text === undefined) return fail(s, 'bash: -c: option requires an argument\n', 2);
		return runChild(
			io.commands,
			s,
			text,
			{ kind: 'c' },
			args.slice(2).length > 0 ? args.slice(2) : ['bash'],
			io.now
		);
	}
	const file = args[0];
	if (file === undefined || file.startsWith('-'))
		return fail(s, '（模擬では、bash を対話で開き直さない。bash 台本.sh の形で使う）\n', 2);
	const path = pathOf(s, file);
	const node = stat(s.fs, path);
	if (!node) return fail(s, `bash: ${file}: No such file or directory\n`, 127);
	if (node.kind === 'dir') return fail(s, `bash: ${file}: Is a directory\n`, 126);
	if (!canRead(s.fs, path, s.user)) return fail(s, `bash: ${file}: Permission denied\n`, 126);
	return runChild(
		io.commands,
		s,
		readFile(s.fs, path) ?? '',
		{ kind: 'file', name: file },
		args,
		io.now
	);
};

export const envCommands: Record<string, Cmd<unknown>> = {
	export: exportCmd,
	unset,
	env,
	which,
	true: (s) => ok(s),
	false: (s) => ({ state: s, out: '', err: '', code: 1 }),
	'[': testWith('['),
	test: testWith('test'),
	exit,
	bash
};
