// やってみる（learn-standard.md 第 6 章・LS-I9）。打った命令の並びから「やってみるのレッスン」を作り、
// 見ると同じ図・中身の板・記録で描く。打った命令 1 つが出来事 1 つ。状態（打った命令と道具の状態）だけから作る純粋な関数。
import type {
	Host,
	HostRow,
	Lesson,
	LogLine,
	Mistake,
	Packet,
	SceneOp,
	Step
} from '../lesson/types.ts';
import type { Board } from '../practice/board.ts';
import type { JudgeItem } from '../practice/tool-practice.ts';

type JudgeLike = Pick<JudgeItem, 'label' | 'want' | 'got' | 'ok'>;
import { commandKeys } from '../practice/refs.ts';

export type TryCmd = { line: string; out: string; err: string; code: number };

const firstLine = (s: string) => s.split('\n').find((l) => l.trim() !== '') ?? '';
const linesOf = (s: string) =>
	s
		.replace(/\n$/, '')
		.split('\n')
		.filter((l) => l !== '');
const utf8Len = (s: string) => new TextEncoder().encode(s).length;
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** 自分の機械（打つ所）。PC の絵の機械、無ければ最初に現れる機械 */
export function homeOf(lesson: Lesson): string {
	const nodes = lesson.map?.nodes ?? {};
	const pc = Object.entries(nodes).find(([, n]) => n.icon === 'pc' || n.icon === 'laptop');
	if (pc) return pc[0];
	for (const s of lesson.explain) for (const o of s.scene) if (o.op === 'appear') return o.id;
	return 'me';
}

function firstAppears(lesson: Lesson): SceneOp[] {
	const seen = new Set<string>();
	const out: SceneOp[] = [];
	for (const s of lesson.explain)
		for (const o of s.scene)
			if (o.op === 'appear' && !seen.has(o.id)) {
				seen.add(o.id);
				out.push(o);
			}
	return out;
}

/** 道具の状態の絵を、OS の中の箱 1 つにする */
export function hostOf(lesson: Lesson, b: Board, addr: string): Host {
	const home = homeOf(lesson);
	const rows: HostRow[] = b.cols.flatMap((c) => [
		{ id: `c:${c.key}`, depth: 0 as const, what: c.title, state: c.sub },
		...c.rows.map((r) => ({
			id: `${c.key}/${r.key}`,
			depth: 1 as const,
			what: r.text.trim(),
			state: r.tag ?? ''
		}))
	]);
	return {
		name: 'あなたの端末',
		town: lesson.map?.nodes[home]?.town ?? '作業机',
		addr,
		rows
	};
}

function packetOf(c: TryCmd, n: number, tool: string): Packet {
	const out = linesOf(c.out);
	const err = linesOf(c.err);
	const level = (j: number): 1 | 2 | 3 => (j < 3 ? 1 : j < 8 ? 2 : 3);
	return {
		name: `命令 ${n}`,
		size: `${utf8Len(c.line)} B`,
		parts: [
			{
				name: '打った命令',
				fields: [
					{ k: '命令', v: c.line, level: 1 },
					{ k: '道具', v: tool, level: 2 },
					{ k: '終了コード', v: String(c.code), level: 1 }
				]
			},
			{
				name: '返ってきた物',
				fields: [
					...out.map((v, j) => ({ k: `出力 ${j + 1}`, v, level: level(j) })),
					...err.map((v, j) => ({ k: `エラー ${j + 1}`, v, level: level(j) })),
					...(out.length + err.length === 0
						? [{ k: '出力', v: '（何も出ない。成功した命令は黙ることが多い）', level: 1 as const }]
						: [])
				]
			}
		]
	};
}

/**
 * 打った命令の並び cmds と、各時点の道具の状態 boards（[0] は打つ前、[i] は i 行目の後）から、やってみるのレッスンを作る。
 * 図の機械と線・区画は元のレッスンのまま。
 */
export function tryLesson(lesson: Lesson, cmds: TryCmd[], boards: Board[], addr = ''): Lesson {
	// 打つ前は、元のレッスンの概要（出来事 0）を描く。出来事 0 の図は全ての機械
	if (cmds.length === 0) return lesson;
	const tool = lesson.practice.tool?.name ?? '';
	const home = homeOf(lesson);
	const appears = firstAppears(lesson);
	const label = (id: string) => {
		const o = appears.find((x) => x.op === 'appear' && x.id === id);
		return o?.op === 'appear' ? o.label : id;
	};
	const flows = (lesson.practice.flow ?? []).map((f) => ({ ...f, re: new RegExp(f.match) }));
	const explain: Step[] = cmds.map((c, i) => {
		const f = flows.find((x) => x.re.test(c.line));
		const from = f?.from ?? home;
		const to = f?.to ?? home;
		const ok = c.code === 0;
		const key = commandKeys(tool, c.line)[0] ?? cut(c.line, 14);
		const said = firstLine(c.err) || firstLine(c.out);
		const logs: LogLine[] = [...linesOf(c.err), ...linesOf(c.out)]
			.slice(0, 3)
			.map((text) => ({ t: `#${i + 1}`, src: tool, text: cut(text, 90) }));
		const scene: SceneOp[] = [
			...(i === 0 ? appears : []),
			{ op: 'move', from, to, payload: key, kind: ok ? '命令' : 'エラー' },
			{ op: 'change', id: to, k: ok ? '返事' : 'エラー', v: cut(said || '（何も出ない）', 40) }
		];
		return {
			n: i + 1,
			title: cut(c.line, 20),
			lead: said ? cut(said, 40) : '何も出ない',
			body: [`${c.line} を打った。終了コードは ${c.code}。`],
			facts: [{ k: '命令', v: c.line }],
			scene,
			log: {
				t: `#${i + 1}`,
				from: label(from),
				to: label(to),
				kind: ok ? '命令' : 'エラー',
				info: cut(said || c.line, 60),
				size: `${utf8Len(c.out) + utf8Len(c.err)} B`
			},
			inside: {
				packet: packetOf(c, i + 1, tool),
				hosts: [hostOf(lesson, boards[i + 1] ?? boards[i] ?? { cols: [] }, addr)],
				...(logs.length > 0 ? { logs } : {})
			}
		};
	});
	return { ...lesson, id: `${lesson.id}:try`, explain };
}

export type Goal = { label: string; want: string; got: string; state: 'ok' | 'cur' | 'todo' };

/** やることの一覧（済・今・まだ）。合格の項目の順で、最初の済んでいない物が「今」 */
export function goalsOf(judge: readonly JudgeLike[]): Goal[] {
	const cur = judge.findIndex((j) => !j.ok);
	return judge.map((j, i) => ({
		label: j.label,
		want: j.want,
		got: j.got,
		state: j.ok ? 'ok' : i === cur ? 'cur' : 'todo'
	}));
}

/** 命令の見本：例の「$ 」の行（例は答えそのものではなく、同じ道具の使い方） */
export function samplesOf(lesson: Lesson): string[] {
	const out: string[] = [];
	for (const l of lesson.example.lines)
		if (l.startsWith('$ ')) {
			const s = l.slice(2);
			if (!out.includes(s)) out.push(s);
		}
	return out.slice(0, 6);
}

/** n 回目のヒント（1 から）。押すたびに 1 段具体になる。直前に間違えていれば、その「次の一手」から */
export function hintOf(
	lesson: Lesson,
	judge: readonly JudgeLike[],
	mistake: Mistake | null,
	n: number
): string {
	const cur = judge.find((j) => !j.ok);
	const cmds = lesson.practice.commands ?? [];
	const samples = samplesOf(lesson);
	const ladder = [
		...(mistake ? [`直前の間違い：${mistake.why}。次の一手：${mistake.next}`] : []),
		cur
			? `まだの項目は「${cur.label}」。目標は ${cur.want}、今は ${cur.got || '（まだ無い）'}。`
			: 'もう全ての項目を満たしている。',
		cmds.length > 0
			? `使う命令：${cmds.join('・')}。下の「コマンドの参考」で公式の説明を読める。`
			: `目的：${lesson.practice.goal}`,
		samples.length > 0
			? `例では ${samples.join(' → ')} と打っていた。同じ形で、この場面の名前に替える。`
			: `解説の最後の章（仕事では）を見返す。`
	];
	return ladder[Math.min(Math.max(1, n), ladder.length) - 1];
}
