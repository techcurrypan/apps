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
import { worldFs, worldNet, worldSys, type WorldSpec } from './shell/worlds.ts';

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

// 本物でも決まらない物を揃える（docs/tools.md 2 章）。打った行ごとに当てる
const sortRows = (text: string, keepHead: boolean) => {
	const lines = text.split('\n');
	const last = lines.pop() ?? '';
	const head = keepHead ? lines.splice(0, 1) : [];
	return [...head, ...lines.sort()].join('\n') + '\n' + last;
};
function unfixed(line: string, text: string): string {
	let t = text;
	// ping の往復の時間
	t = t.replace(/time=\d+(\.\d+)? ms/g, 'time=X ms').replace(/, time \d+ms/g, ', time Xms');
	t = t.replace(/rtt min\/avg\/max\/mdev = [\d./]+ ms/g, 'rtt min/avg/max/mdev = X ms');
	// dig の問い合わせの番号と、かかった時間
	t = t
		.replace(/, id: \d+$/gm, ', id: X')
		.replace(/^;; Query time: \d+ msec$/gm, ';; Query time: X msec');
	// SSH の鍵は本物では毎回の乱数。指紋・指紋の絵・公開鍵の字を揃える（sec-008）
	t = t
		.replace(/SHA256:[A-Za-z0-9+/]{43}/g, 'SHA256:X')
		.replace(/^\|[ .o+=*BOX@%&#/^SE]{17}\|$/gm, '|X|')
		.replace(/ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI[A-Za-z0-9+/]{43}/g, 'ssh-ed25519 KEY');
	// curl のつながらなかったときの時間
	t = t.replace(/ after \d+ ms:/g, ' after X ms:');
	// 近くの機械の表と、待ち受けの口の並びは、OS の中の表の並び（機械ごとに違う）
	if (/^ip (-4 )?neigh/.test(line) && t !== '') t = sortRows(t, false);
	if (/^ss /.test(line) && t !== '') t = sortRows(t, true);
	return t;
}

// プロセスの番号は機械ごとに違う。出てきた順の印（P1・P2…）に揃える。記録と模擬で別々に数える（lnx-007・lnx-010）
function pidMarks(): (text: string) => string {
	const seen = new Map<string, string>();
	const mark = (n: string) => {
		if (!seen.has(n)) seen.set(n, `P${seen.size + 1}`);
		return seen.get(n) ?? n;
	};
	return (text) =>
		text
			.replace(/^( *)(\d+)( +)(\d+)( )/gm, (_, a, p, b, q, c) => a + mark(p) + b + mark(q) + c)
			.replace(/^(\d+)( |$)/gm, (_, p, c) => mark(p) + c)
			.replace(/\((\d+)\)/g, (_, p) => `(${mark(p)})`)
			.replace(/\[(\d+)\]:/g, (_, p) => `[${mark(p)}]:`)
			.replace(/(Main PID: |Process: |└─)(\d+)/g, (_, h, p) => h + mark(p));
}
// サービスの状態の、本物でも毎回変わる値（時刻・使った量・機械の名前）
function serviceFixed(text: string): string {
	return text
		.replace(/ since .*$/gm, ' since X')
		.replace(/\(limit: \d+\)/g, '(limit: X)')
		.replace(/Memory: .*$/gm, 'Memory: X')
		.replace(/CPU: \d+ms/g, 'CPU: X')
		.replace(/Duration: .*$/gm, 'Duration: X')
		.replace(/^[A-Z][a-z]{2} \d\d \d\d:\d\d:\d\d \S+ /gm, 'TIME HOST ');
}
const PID_LESSONS = new Set(['lnx-007', 'lnx-010']);

type AnyTool = { tool: Tool<ShellState<unknown>>; initial: ShellState<unknown> };
// シェルの道具も git の入った同じ世界（本物の機械にも git がある）。場面の前に置く物があれば置く
const withGit = (world: WorldSpec | null): AnyTool => ({
	tool: shellTool<GitExt>(gitCommands()) as unknown as Tool<ShellState<unknown>>,
	initial: {
		...learnerWorld<GitExt>({ repos: {} }, worldFs(world)),
		net: worldNet(world),
		sys: worldSys(world)
	} as ShellState<unknown>
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
	'ctr-001-run',
	'ctr-002-lifecycle',
	'ctr-003-port',
	'ctr-004-build',
	'ctr-005-volume',
	'ctr-006-env',
	'ctr-007-compose',
	'ctr-008-cache',
	'ctr-009-network'
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
		const byPid = PID_LESSONS.has(rec.lesson);
		const [mockMarks, realMarks] = [pidMarks(), pidMarks()];
		const fix = (marks: (t: string) => string, line: string, t: string) =>
			byPid ? serviceFixed(marks(unfixed(line, t))) : unfixed(line, t);
		rec.steps.forEach((step, j) => {
			session = typeLine(session, step.line);
			const got = session.entries[j];
			// 番号の印は出てきた順なので、行ごとに標準出力 → 標準エラーの順で数える
			const mock = {
				out: fix(mockMarks, step.line, got.out),
				err: fix(mockMarks, step.line, got.err)
			};
			const real = {
				out: fix(realMarks, step.line, step.out),
				err: fix(realMarks, step.line, step.err)
			};
			it(`${j + 1} 行目 $ ${step.line}`, () => {
				expect({ out: mock.out, err: normalize(mock.err), code: got.code }).toEqual({
					out: real.out,
					err: normalize(real.err),
					code: step.code
				});
			});
		});
	});
}
