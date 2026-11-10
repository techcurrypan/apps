// 模擬の出力とエラーが本物と一致すること（段 7 の完成条件 1）。
// 本物の出力は CI の Ubuntu で記録した物（tools-real/recorded/*.json。docs/tools.md 2 章）。
// 場面ごとに同じ行を模擬で打ち、標準出力・標準エラー・終了コードを一字ずつ比べる。
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dockerCommands } from './docker/docker.ts';
import { emptyDocker, type DockerExt } from './docker/state.ts';
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

// コンテナの ID・作る時間・表の時刻は本物では毎回変わる。表は見出しの位置で升に分け、ID と時刻の升を揃える
const TABLE_HEAD = /^(CONTAINER ID|REPOSITORY|IMAGE {3,}CREATED|NETWORK ID|NAME {3,}IMAGE|DRIVER)/;
function dockerFixed(text: string): string {
	const t = text
		.replace(/\b[0-9a-f]{64}\b/g, 'H64')
		.replace(/DONE \d+\.\d+s/g, 'DONE Xs')
		.replace(/^(#\d+) \d+\.\d+ /gm, '$1 X ')
		.replace(/round-trip min\/avg\/max = [\d./]+ ms/g, 'round-trip min/avg/max = X ms');
	const lines = t.split('\n');
	if (lines[0].startsWith('#0 building')) {
		// BuildKit の行は、時間のかかった物だけ「途中」の行と「時間 done」の行の 2 つになる（同じ build でも記録ごとに違う）。
		// 時間を落とし、すぐ後に「同じ字 … done」が続く途中の行を落とす
		const done = lines.map((l) => l.replace(/ \d+\.\d+s done$/, ' done'));
		return done
			.filter(
				(l, i) =>
					!(done[i + 1]?.startsWith(l) && done[i + 1].endsWith(' done') && done[i + 1] !== l)
			)
			.join('\n');
	}
	if (!TABLE_HEAD.test(lines[0])) return t;
	const heads = [...lines[0].matchAll(/\S+(?: \S+)*/g)].map((m) => ({ at: m.index, name: m[0] }));
	return lines
		.map((row, r) => {
			if (r === 0) return heads.map((h) => h.name).join(' | ');
			if (row === '') return row;
			return heads
				.map((h, k) => {
					const cell = row.slice(h.at, heads[k + 1]?.at ?? row.length).trim();
					if (/ID$/.test(h.name) || (h.name === 'IMAGE' && /^[0-9a-f]{12}$/.test(cell)))
						return 'ID';
					if (h.name === 'CREATED') return cell.replace(/^.* ago$/, 'X ago');
					if (h.name === 'STATUS')
						return cell.replace(/^Up .*$/, 'Up X').replace(/^(Exited \(\d+\)) .* ago$/, '$1 X ago');
					return cell;
				})
				.join(' | ');
		})
		.join('\n');
}

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
// コンテナの道具：シェルに docker を足した物。初めのイメージは世界が決める
const withDocker = (world: WorldSpec | null): AnyTool => ({
	tool: shellTool<DockerExt>(dockerCommands()) as unknown as Tool<ShellState<unknown>>,
	initial: learnerWorld<DockerExt>(
		emptyDocker(world?.docker?.images ?? []),
		worldFs(world)
	) as ShellState<unknown>
});
const tools: Record<string, (w: WorldSpec | null) => AnyTool> = {
	git: withGit,
	shell: withGit,
	docker: withDocker
};

describe('本物の記録がある', () => {
	it('記録が 1 件以上ある', () => {
		expect(recorded.length).toBeGreaterThan(0);
	});
});

// 本物の記録はあるが、模擬がまだ追いついていない場面。黙って飛ばさず、保留として一覧に出す。
// 段 7 を終えるときは空にする（docs/progress/phase-7.md）
export const PENDING: ReadonlySet<string> = new Set([]);

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
		const byDocker = rec.tool === 'docker';
		const fix = (marks: (t: string) => string, line: string, t: string) =>
			byPid
				? serviceFixed(marks(unfixed(line, t)))
				: byDocker
					? dockerFixed(unfixed(line, t))
					: unfixed(line, t);
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
