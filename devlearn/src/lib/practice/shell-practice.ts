// シェルの実戦（docs/tools.md 4.1b）。初めの状態を作り、合格を判定する。打つ・戻すは tool-practice.ts と同じ形。
import { mkdir, stat, writeFile, type Fs } from '../tools/fs.ts';
import type { GitExt } from '../tools/git/repo.ts';
import { gitCommands } from '../tools/git/git.ts';
import type { Tool } from '../tools/session.ts';
import { CLOCK_BASE, shellTool, type ShellState } from '../tools/shell/run.ts';
import { learnerWorld, WORK } from '../tools/shell/world.ts';
import { worldFs, worldNet, worldSys, type WorldSpec } from '../tools/shell/worlds.ts';
import { plainText } from './terminal.ts';
import type { JudgeItem } from './tool-practice.ts';

export type ShellSetup = {
	world?: string;
	files?: Record<string, string>;
	dirs?: string[];
	modes?: Record<string, string>;
	cwd?: string;
};
export type ShellSuccess = {
	cwd?: string;
	exists?: string[];
	absent?: string[];
	files?: Record<string, string>;
	modes?: Record<string, string>;
	output?: string;
};

// 本物の機械と同じく、シェルの実戦にも git がある
export function shellPracticeTool(): Tool<ShellState<GitExt>> {
	return shellTool<GitExt>(gitCommands());
}

// 作業場所から数えた場所。/ で始まる場所はそのまま（/srv/shop/report.txt など、世界が置いた物）
const abs = (p: string) => (p.startsWith('/') ? p : `${WORK}/${p}`).replace(/\/+$/, '');

function ensureDir(fs: Fs, path: string): Fs {
	let out = fs;
	let cur = '';
	for (const part of path.split('/').filter(Boolean)) {
		cur += `/${part}`;
		if (!stat(out, cur)) out = mkdir(out, cur, CLOCK_BASE);
	}
	return out;
}

export function shellInitial(
	setup: ShellSetup,
	world: WorldSpec | null = null
): ShellState<GitExt> {
	let fs = worldFs(world);
	for (const d of setup.dirs ?? []) fs = ensureDir(fs, abs(d));
	for (const [p, data] of Object.entries(setup.files ?? {})) {
		const path = abs(p);
		fs = ensureDir(fs, path.slice(0, path.lastIndexOf('/')));
		fs = writeFile(fs, path, data, CLOCK_BASE);
	}
	for (const [p, m] of Object.entries(setup.modes ?? {})) {
		const n = fs[abs(p)];
		if (n) fs = { ...fs, [abs(p)]: { ...n, mode: Number.parseInt(m, 8) } };
	}
	const base = learnerWorld<GitExt>({ repos: {} }, fs);
	const cwd = setup.cwd ? abs(setup.cwd) : WORK;
	return {
		...base,
		cwd,
		vars: { ...base.vars, PWD: cwd },
		net: worldNet(world),
		sys: worldSys(world)
	};
}

const modeOf = (s: ShellState<unknown>, p: string) => {
	const n = stat(s.fs, abs(p));
	return n ? (n.mode & 0o7777).toString(8) : '（無い）';
};

export function judgeShell(
	s: ShellState<unknown>,
	lastOut: string,
	want: ShellSuccess
): JudgeItem[] {
	const items: JudgeItem[] = [];
	const has = (p: string) => stat(s.fs, abs(p)) !== null;
	if (want.cwd !== undefined)
		items.push({ label: '今いる場所', want: want.cwd, got: s.cwd, ok: s.cwd === want.cwd });
	for (const p of want.exists ?? [])
		items.push({ label: 'ある物', want: p, got: has(p) ? p : '（無い）', ok: has(p) });
	for (const p of want.absent ?? [])
		items.push({ label: '無い物', want: p, got: has(p) ? p : '（無い）', ok: !has(p) });
	for (const [p, data] of Object.entries(want.files ?? {})) {
		const n = stat(s.fs, abs(p));
		const got = n?.kind === 'file' ? n.data : '（無い）';
		items.push({ label: `${p} の中身`, want: data, got, ok: got === data });
	}
	for (const [p, m] of Object.entries(want.modes ?? {}))
		items.push({ label: `${p} の権限`, want: m, got: modeOf(s, p), ok: modeOf(s, p) === m });
	// 最後の出力は、字の飾り（curl の太字・押せる印）を外した、端末に見える字で比べて見せる
	const seen = plainText(lastOut);
	if (want.output !== undefined)
		items.push({ label: '最後の出力', want: want.output, got: seen, ok: seen === want.output });
	return items;
}
