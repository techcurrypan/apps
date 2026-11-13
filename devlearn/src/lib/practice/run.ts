// 道具を使う実戦を、5 つの道具で同じ形にする（段 10-0。docs/tools.md 1 章・4 章）。
// 道具ごとに「初めの状態・打つ・合格の判定・舞台の絵」を持ち、打つ・戻すは同じ手順で扱う。
// git・shell・docker は模擬、js・sql は本物。本物は答えが後から返るので、打つ所だけ待つ。
import type { Mistake, Practice } from '../lesson/types.ts';
import { dockerCommands } from '../tools/docker/docker.ts';
import { emptyDocker, type DockerExt } from '../tools/docker/state.ts';
import type { GitExt } from '../tools/git/repo.ts';
import { jsTool, type JsState } from '../tools/js/run.ts';
import type { Result } from '../tools/session.ts';
import { shellTool, type ShellState } from '../tools/shell/run.ts';
import { learnerWorld } from '../tools/shell/world.ts';
import { worldFs, type WorldSpec } from '../tools/shell/worlds.ts';
import { sqlTool, type SqlState } from '../tools/sql/run.ts';
import { dockerBoard, outputBoard, shellBoard, type Board } from './board.ts';
import { gitPicture, type GitPicture } from './git-picture.ts';
import {
	judgeShell,
	shellInitial,
	shellPracticeTool,
	type ShellSuccess
} from './shell-practice.ts';
import { gitStart, judgeGit, mistakeFor, type JudgeItem } from './tool-practice.ts';

const WORLDS = import.meta.glob<WorldSpec>('../../../tools-real/worlds/*.json', {
	eager: true,
	import: 'default'
});
export function worldNamed(name: string | undefined): WorldSpec | null {
	if (!name) return null;
	const w = WORLDS[`../../../tools-real/worlds/${name}.json`];
	if (!w) throw new Error(`世界 ${name} が無い`);
	return w;
}

const rec = (x: unknown): Record<string, unknown> =>
	typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
const strs = (x: unknown): string[] =>
	Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);

type Kit = {
	/** 端末の頭（使う人に見せる） */
	prompt: string;
	/** 1 行で打つか、書いた物の全体を走らせるか */
	editor: boolean;
	initial(setup: unknown): unknown;
	run(state: unknown, line: string): Promise<Result & { state: unknown }>;
	judge(state: unknown, last: Result | null, success: unknown): JudgeItem[];
	board(state: unknown, last: Result | null): Board;
	git?(state: unknown): GitPicture;
};

const outputItem = (label: string, want: string | undefined, last: Result | null): JudgeItem[] =>
	want === undefined
		? []
		: [
				{
					label,
					want,
					got: last ? last.out : '（まだ打っていない）',
					ok: !!last && last.out === want
				}
			];

// 本物と同じく、シェルにも git がある
const shellKit = (): Kit => {
	const tool = shellPracticeTool();
	return {
		prompt: 'learner@demo $',
		editor: false,
		initial: (setup) => {
			const s = rec(setup);
			return shellInitial(
				{
					world: str(s.world),
					files: rec(s.files) as Record<string, string>,
					dirs: strs(s.dirs),
					modes: rec(s.modes) as Record<string, string>,
					cwd: str(s.cwd)
				},
				worldNamed(str(s.world))
			);
		},
		run: async (state, line) => tool.run(state as ShellState<GitExt>, line),
		judge: (state, last, success) =>
			judgeShell(state as ShellState<GitExt>, last?.out ?? '', success as ShellSuccess),
		board: (state) => shellBoard(state as ShellState<GitExt>)
	};
};

const gitKit = (): Kit => {
	const k = shellKit();
	return {
		...k,
		initial: (setup) => {
			const s = rec(setup);
			return gitStart({
				initialized: s.initialized === true,
				files: rec(s.files) as Record<string, string>,
				prelude: strs(s.prelude)
			});
		},
		judge: (state, _last, success) => {
			const w = rec(success);
			return judgeGit(state as ShellState<GitExt>, {
				commits: typeof w.commits === 'number' ? w.commits : 1,
				tracked: strs(w.tracked),
				statusShort: str(w.statusShort) ?? '',
				branch: str(w.branch),
				branches:
					w.branches === undefined ? undefined : (rec(w.branches) as Record<string, number>),
				files: w.files === undefined ? undefined : (rec(w.files) as Record<string, string>),
				parents: typeof w.parents === 'number' ? w.parents : undefined,
				pushed: w.pushed === undefined ? undefined : strs(w.pushed)
			});
		},
		git: (state) => gitPicture(state as ShellState<GitExt>)
	};
};

const dockerKit = (): Kit => {
	const tool = shellTool<DockerExt>(dockerCommands());
	return {
		prompt: 'learner@demo $',
		editor: false,
		initial: (setup) => {
			const s = rec(setup);
			const world = worldNamed(str(s.world));
			return learnerWorld<DockerExt>(
				emptyDocker(strs(s.images).length ? strs(s.images) : (world?.docker?.images ?? [])),
				worldFs(world)
			);
		},
		run: async (state, line) => tool.run(state as ShellState<DockerExt>, line),
		judge: (state, last, success) => {
			const d = (state as ShellState<DockerExt>).ext;
			const w = rec(success);
			const items: JudgeItem[] = [];
			const status = (name: string) => {
				const c = d.containers.find((x) => x.name === name);
				return c
					? c.status === 'running'
						? '動いている'
						: c.status === 'exited'
							? '止まった'
							: '作っただけ'
					: '（無い）';
			};
			for (const n of strs(w.running))
				items.push({
					label: `コンテナ ${n}`,
					want: '動いている',
					got: status(n),
					ok: status(n) === '動いている'
				});
			for (const n of strs(w.absent))
				items.push({
					label: `コンテナ ${n}`,
					want: '（無い）',
					got: status(n),
					ok: status(n) === '（無い）'
				});
			for (const t of strs(w.images)) {
				const has = d.images.some((i) => i.tags.includes(t));
				items.push({
					label: `イメージ ${t}`,
					want: 'ある',
					got: has ? 'ある' : '（無い）',
					ok: has
				});
			}
			return [...items, ...outputItem('最後の出力', str(w.output), last)];
		},
		board: (state) => dockerBoard(state as ShellState<DockerExt>)
	};
};

const jsKit = (): Kit => {
	const tool = jsTool();
	return {
		prompt: 'JavaScript',
		editor: true,
		initial: (setup): JsState => ({ code: str(rec(setup).code) ?? '' }),
		run: (state, code) => tool.run(state as JsState, code),
		judge: (_s, last, success) => outputItem('出力（console.log）', str(rec(success).output), last),
		board: (_s, last) => outputBoard(last, '出力', 'console.log の行')
	};
};

let sqlWasm: string | undefined;
/** ブラウザでは sql.js の wasm の置き場所を渡す（Node では sql.js が自分で見つける） */
export function useSqlWasm(url: string) {
	sqlWasm = url;
}
const sqlKit = (): Kit => ({
	prompt: 'sqlite>',
	editor: false,
	initial: (setup): SqlState => ({ setup: str(rec(setup).sql) ?? '', lines: [] }),
	run: (state, line) => sqlTool(sqlWasm).run(state as SqlState, line),
	judge: (_s, last, success) => outputItem('結果の表', str(rec(success).output), last),
	board: (_s, last) => outputBoard(last, '結果', '最後に打った文の答え')
});

const KITS: Record<string, () => Kit> = {
	git: gitKit,
	shell: shellKit,
	docker: dockerKit,
	js: jsKit,
	sql: sqlKit
};
export const runTools = Object.keys(KITS);

export type RunStep = Result & {
	line: string;
	mistake: Mistake | null;
	passedHere: boolean;
};

export type Run = {
	practice: Practice;
	kit: Kit;
	initial: unknown;
	/** 打った後の状態の並び（0 件目が 1 行目の後） */
	states: unknown[];
	steps: RunStep[];
	judge: JudgeItem[];
	passed: boolean;
	board: Board;
	git: GitPicture | null;
	/** 書いた物の全体を走らせる道具（js）の、今の書きかけ */
	editor: string | null;
};

function derive(r: Omit<Run, 'judge' | 'passed' | 'board' | 'git'>): Run {
	const state = r.states.at(-1) ?? r.initial;
	const last = r.steps.at(-1) ?? null;
	const judge = r.kit.judge(state, last, r.practice.success);
	return {
		...r,
		judge,
		passed: judge.length > 0 && judge.every((j) => j.ok),
		board: r.kit.board(state, last),
		git: r.kit.git ? r.kit.git(state) : null
	};
}

export function openRun(practice: Practice): Run {
	const make = KITS[practice.tool?.name ?? ''];
	if (!make) throw new Error(`道具 ${practice.tool?.name ?? '無し'} の実戦は無い`);
	const kit = make();
	const initial = kit.initial(practice.setup);
	return derive({
		practice,
		kit,
		initial,
		states: [],
		steps: [],
		editor: kit.editor ? (initial as JsState).code : null
	});
}

export async function typeRun(r: Run, line: string): Promise<Run> {
	const prev = r.states.at(-1) ?? r.initial;
	const res = await r.kit.run(prev, line);
	const next = derive({
		...r,
		states: [...r.states, res.state],
		steps: [
			...r.steps,
			{
				line,
				out: res.out,
				err: res.err,
				code: res.code,
				mistake: mistakeFor(r.practice.mistakes, res.out, res.err),
				passedHere: false
			}
		],
		editor: r.kit.editor ? line : null
	});
	const steps = next.steps.slice();
	steps[steps.length - 1] = { ...steps[steps.length - 1], passedHere: next.passed };
	return { ...next, steps };
}

/** k 行目まで戻す（0 は初めの状態） */
export function rewindRun(r: Run, k: number): Run {
	const n = Math.max(0, Math.min(r.steps.length, Math.trunc(k)));
	const steps = r.steps.slice(0, n);
	return derive({
		...r,
		states: r.states.slice(0, n),
		steps,
		editor: r.kit.editor ? (steps.at(-1)?.line ?? (r.initial as JsState).code) : null
	});
}

/** k 行目の後の舞台の絵（0 は初め）。前 → 後を見せるため */
export function boardAt(r: Run, k: number): { board: Board; git: GitPicture | null } {
	const state = k === 0 ? r.initial : r.states[k - 1];
	const last = k === 0 ? null : r.steps[k - 1];
	return { board: r.kit.board(state, last), git: r.kit.git ? r.kit.git(state) : null };
}
