// 模擬の出力とエラーが本物と一致すること（段 7 の完成条件 1）。
// 本物の出力は CI の Ubuntu で記録した物（tools-real/recorded/*.json。docs/tools.md 2 章）。
// 場面ごとに同じ行を模擬で打ち、標準出力・標準エラー・終了コードを一字ずつ比べる。
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gitCommands } from './git/git.ts';
import type { GitExt } from './git/repo.ts';
import { start, typeLine, type Tool } from './session.ts';
import { shellTool, type ShellState } from './shell/run.ts';
import { learnerWorld } from './shell/world.ts';
import { worldFs, type WorldSpec } from './shell/worlds.ts';

type Step = { line: string; out: string; err: string; code: number };
type Recorded = { id: string; tool: string; lesson: string; world?: string; steps: Step[] };

const DIR = 'tools-real/recorded';
const recorded: Recorded[] = readdirSync(DIR)
	.filter((f) => f.endsWith('.json'))
	.sort()
	.map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Recorded);

// 本物の記録は台本の中の bash（eval）で打っているので、bash の言い方に「line 1:」「eval: line 8:」が付き、
// 読めない行を 2 行目に写す。端末で打ったときの言い方に揃える（置き換えた物は docs/tools.md 2 章に記録）
const normalize = (s: string) =>
	s.replace(/^bash: (eval: )?line \d+: /gm, 'bash: ').replace(/^bash: `.*'\n/gm, '');

type AnyTool = { tool: Tool<ShellState<unknown>>; initial: ShellState<unknown> };
// シェルの道具も git の入った同じ世界（本物の機械にも git がある）。場面の前に置く物があれば置く
const withGit = (world: WorldSpec | null): AnyTool => ({
	tool: shellTool<GitExt>(gitCommands()) as unknown as Tool<ShellState<unknown>>,
	initial: learnerWorld<GitExt>({ repos: {} }, worldFs(world)) as ShellState<unknown>
});
const worldOf = (name?: string): WorldSpec | null =>
	name ? (JSON.parse(readFileSync(`tools-real/worlds/${name}.json`, 'utf8')) as WorldSpec) : null;
const tools: Record<string, (w: WorldSpec | null) => AnyTool> = { git: withGit, shell: withGit };

describe('本物の記録がある', () => {
	it('記録が 1 件以上ある', () => {
		expect(recorded.length).toBeGreaterThan(0);
	});
});

// 本物の記録はあるが、模擬がまだ追いついていない場面。黙って飛ばさず、保留として一覧に出す。
// 段 7 を終えるときは空にする（docs/progress/phase-7.md）
export const PENDING: ReadonlySet<string> = new Set([
	'net-002-arp',
	'net-003-route',
	'net-004-dns',
	'net-006-ports',
	'net-007-http',
	'net-008-status',
	'net-013-cache'
]);

for (const rec of recorded) {
	if (PENDING.has(rec.id)) {
		it.todo(`${rec.id}（${rec.lesson}）：模擬が追いつくまで保留`);
		continue;
	}
	describe(`${rec.id}（${rec.lesson}）`, () => {
		const make = tools[rec.tool];
		it('この道具の模擬がある', () => {
			expect(make).toBeDefined();
		});
		if (!make) return;
		const { tool, initial } = make(worldOf(rec.world));
		let session = start(tool, initial);
		rec.steps.forEach((step, j) => {
			session = typeLine(session, step.line);
			const got = session.entries[j];
			it(`${j + 1} 行目 $ ${step.line}`, () => {
				expect({ out: got.out, err: normalize(got.err), code: got.code }).toEqual({
					out: step.out,
					err: normalize(step.err),
					code: step.code
				});
			});
		});
	});
}
