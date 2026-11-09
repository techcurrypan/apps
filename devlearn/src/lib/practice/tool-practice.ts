// 道具を使う実戦（docs/tools.md 4 章）。初めの状態を作り、1 行ずつ打ち、合格と間違いを判定する。
// 巻き戻すと、その時点の状態・合格・間違いに戻る。
import { writeFile } from '../tools/fs.ts';
import { shortStatus } from '../tools/git/common.ts';
import { gitCommands } from '../tools/git/git.ts';
import { reachable } from '../tools/git/history.ts';
import { emptyRepo, headCommit, type GitExt } from '../tools/git/repo.ts';
import { rewind, start, typeLine, type Session } from '../tools/session.ts';
import { mkdir } from '../tools/fs.ts';
import { CLOCK_BASE, shellTool, type ShellState } from '../tools/shell/run.ts';
import { baseFs, learnerWorld, WORK } from '../tools/shell/world.ts';
import type { Mistake, Practice } from '../lesson/types.ts';

export type GitSetup = { initialized: boolean; files: Record<string, string> };
export type GitSuccess = { commits: number; tracked: string[]; statusShort: string };

export type JudgeItem = { label: string; want: string; got: string; ok: boolean };

export type PracticeStep = {
	line: string;
	out: string;
	err: string;
	code: number;
	mistake: Mistake | null;
	passedHere: boolean; // この行を打った後に合格していたか
};

export type PracticeRun = {
	practice: Practice;
	session: Session<ShellState<GitExt>>;
	steps: PracticeStep[];
	judge: JudgeItem[];
	passed: boolean;
};

function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null;
}

function gitSetup(x: unknown): GitSetup {
	if (!isRecord(x)) return { initialized: false, files: {} };
	const files: Record<string, string> = {};
	if (isRecord(x.files))
		for (const [k, v] of Object.entries(x.files)) if (typeof v === 'string') files[k] = v;
	return { initialized: x.initialized === true, files };
}

function gitSuccess(x: unknown): GitSuccess {
	const r = isRecord(x) ? x : {};
	return {
		commits: typeof r.commits === 'number' ? r.commits : 1,
		tracked: Array.isArray(r.tracked)
			? r.tracked.filter((t): t is string => typeof t === 'string')
			: [],
		statusShort: typeof r.statusShort === 'string' ? r.statusShort : ''
	};
}

export function gitInitial(setup: GitSetup): ShellState<GitExt> {
	let fs = baseFs();
	for (const [name, data] of Object.entries(setup.files))
		fs = writeFile(fs, `${WORK}/${name}`, data, CLOCK_BASE);
	const repos: GitExt['repos'] = {};
	if (setup.initialized) {
		fs = mkdir(fs, `${WORK}/.git`, CLOCK_BASE);
		return learnerWorld<GitExt>({ repos: { [WORK]: emptyRepo('main') } }, fs);
	}
	return learnerWorld<GitExt>({ repos }, fs);
}

export function judgeGit(state: ShellState<GitExt>, want: GitSuccess): JudgeItem[] {
	const repo = state.ext.repos[WORK];
	const head = repo ? headCommit(repo) : null;
	const commits = repo && head ? reachable(repo, [head]).size : 0;
	const tracked = repo ? Object.keys(repo.index).sort() : [];
	const st = repo ? shortStatus({ ...state, cwd: WORK }, WORK, repo) : '';
	const wantTracked = [...want.tracked].sort();
	return [
		{
			label: 'commit の数',
			want: String(want.commits),
			got: String(commits),
			ok: commits === want.commits
		},
		{
			label: '記録に入っているファイル',
			want: wantTracked.join(' ') || '（無し）',
			got: tracked.join(' ') || '（無し）',
			ok: tracked.join('\n') === wantTracked.join('\n')
		},
		{
			label: 'git status --short',
			want: want.statusShort.trimEnd() || '（空）',
			got: st.trimEnd() || '（空）',
			ok: st === want.statusShort
		}
	];
}

export function mistakeFor(mistakes: Mistake[], out: string, err: string): Mistake | null {
	const text = out + err;
	return (
		mistakes.find((m) => m.match !== undefined && m.match !== '' && text.includes(m.match)) ?? null
	);
}

const tool = shellTool<GitExt>(gitCommands());

function derive(
	practice: Practice,
	session: Session<ShellState<GitExt>>,
	steps: PracticeStep[]
): PracticeRun {
	const state = session.entries.at(-1)?.state ?? session.initial;
	const judge = judgeGit(state, gitSuccess(practice.success));
	return { practice, session, steps, judge, passed: judge.every((j) => j.ok) };
}

export function openPractice(practice: Practice): PracticeRun {
	if (practice.tool?.name !== 'git')
		throw new Error(`道具 ${practice.tool?.name ?? '無し'} の実戦はまだ無い`);
	return derive(practice, start(tool, gitInitial(gitSetup(practice.setup))), []);
}

export function typePractice(run: PracticeRun, line: string): PracticeRun {
	const session = typeLine(run.session, line);
	const e = session.entries[session.entries.length - 1];
	const next = derive(run.practice, session, run.steps);
	const step: PracticeStep = {
		line,
		out: e.out,
		err: e.err,
		code: e.code,
		mistake: mistakeFor(run.practice.mistakes, e.out, e.err),
		passedHere: next.passed
	};
	return { ...next, steps: [...run.steps, step] };
}

export function rewindPractice(run: PracticeRun, k: number): PracticeRun {
	const session = rewind(run.session, k);
	return derive(run.practice, session, run.steps.slice(0, session.entries.length));
}

export const practiceTools = ['git'] as const;
