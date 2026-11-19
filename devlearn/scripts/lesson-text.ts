// 学習者役の比べ（learn-standard.md LS-L1 の ②）に渡す本番の教材を、画面に出る順の文字にする。
// 語り（詳しさ 3 段）・囲み・変わったこと・具体値・出来事の札・状態の札・指標・層とキュー・中身の板・ログ・用語・やってみるの記録。
// 思い出すの答えは出さない（試験と重なるため）。
//   npx tsx scripts/lesson-text.ts <レッスン ID> > <置き場>/<id>.txt
// やってみるの記録は、解き方（solutions.ts の pass）を模擬の道具に打った出力。run.ts は Vite の書き方を使うので Vite に読み込ませる。
import { createServer } from 'vite';
import type { Lesson } from '../src/lib/lesson/types.ts';

const id = process.argv[2];
const server = await createServer({
	configFile: false,
	server: { middlewareMode: true, hmr: false },
	appType: 'custom',
	logLevel: 'error'
});
const { lessons } = (await server.ssrLoadModule('/src/lib/content/lessons.ts')) as {
	lessons: Lesson[];
};
const { SOLUTIONS } = (await server.ssrLoadModule('/src/lib/content/solutions.ts')) as {
	SOLUTIONS: Record<string, { pass: string[] }>;
};
type RunMod = typeof import('../src/lib/practice/run.ts');
const { openRun, typeRun } = (await server.ssrLoadModule('/src/lib/practice/run.ts')) as RunMod;

const l = lessons.find((x) => x.id === id);
if (!l) {
	console.error(`レッスン ${id} が無い`);
	process.exit(1);
}
const o: string[] = [];
const p = (s = '') => o.push(s);
p(`# ${l.title}`);
p(`目標：${l.goal}`);
if (l.learn) p(`学べること：\n${l.learn.map((x) => `- ${x}`).join('\n')}`);
if (l.metrics)
	p(`指標の帯：${l.metrics.map((m) => `${m.label}${m.unit ? `（${m.unit}）` : ''}`).join('・')}`);
if (l.terms) p(`用語：\n${l.terms.map((t) => `- ${t.word}：${t.mean}`).join('\n')}`);
p();
for (const s of l.explain) {
	p(`## ステップ ${s.n} / ${l.explain.length} ${s.title}${s.kind ? `（${s.kind}）` : ''}`);
	p(s.lead);
	if (s.depth) {
		p('### はじめて');
		s.depth.intro.forEach((x) => p(x));
		p('### 現場');
		s.depth.work.forEach((x) => p(x));
		p('### 中身まで');
		s.depth.deep.forEach((x) => p(x));
	} else s.body.forEach((x) => p(x));
	if (s.callout) p(`【囲み】${s.callout.text}`);
	if (s.changes) p(`変わったこと：${s.changes.map((c) => `${c.mark} ${c.text}`).join(' / ')}`);
	if (s.facts.length) p(`具体値：${s.facts.map((f) => `${f.k} = ${f.v}`).join(' / ')}`);
	if (s.board) p(`出来事の札：${s.board.join(' → ')}`);
	if (s.badges)
		p(
			`状態の札：${Object.entries(s.badges)
				.map(([k, v]) => `${k}「${v}」`)
				.join(' / ')}`
		);
	if (s.metrics)
		p(
			`指標：${Object.entries(s.metrics)
				.map(([k, v]) => `${k}=${v}`)
				.join(' / ')}`
		);
	if (s.layers)
		for (const ly of s.layers)
			p(
				`層「${ly.label}」：${ly.boxes
					.map(
						(b) =>
							b.impl +
							(b.queues?.length
								? `［${b.queues.map((q) => `${q.label}: ${q.items.join('・') || '空'}`).join('／')}］`
								: '')
					)
					.join(' → ')}`
			);
	if (s.impl)
		p(
			`関数と文脈：${s.impl.map((i) => `${i.name}${i.context ? `〔${i.context}〕` : ''}`).join(' ')}`
		);
	const moves = s.scene.filter((x) => x.op === 'move');
	if (moves.length)
		p(`図の流れ：${moves.map((m) => `${m.from}→${m.to}「${m.payload}」`).join(' / ')}`);
	if (s.inside?.packet) {
		const k = s.inside.packet;
		p(`中身の板（荷物）：${k.name} ${k.size}`);
		for (const part of k.parts)
			p(`  ${part.name}：${part.fields.map((f) => `${f.k}=${f.v}`).join('、')}`);
	}
	if (s.inside?.hosts)
		for (const h of s.inside.hosts)
			p(`中身の板（OS の中 ${h.name}）：${h.rows.map((r) => `${r.what}=${r.state}`).join('、')}`);
	if (s.inside?.logs) p(`ログ：\n${s.inside.logs.map((x) => `  ${x.text}`).join('\n')}`);
	if (s.ask)
		p(
			`予想の問い：${s.ask.q}（${s.ask.opts.join(' / ')}）→ 答え ${s.ask.opts[s.ask.a]}。${s.ask.why}`
		);
	if (s.town) p(`町では：${s.town}`);
	if (s.work) p(`仕事では：${s.work}`);
	p();
}
if (l.teach) p(`## 教えるとき\n${JSON.stringify(l.teach, null, 1)}`);
p(`## やってみる：${l.practice.goal}`);
const sol = SOLUTIONS[l.id];
if (sol && l.practice.tool) {
	let r = openRun(l.practice);
	for (const line of sol.pass) {
		r = await typeRun(r, line);
		const st = r.steps.at(-1);
		p(`$ ${line}`);
		p(`${st?.out ?? ''}${st?.err ?? ''}`.replace(/\n$/, ''));
	}
}
process.stdout.write(o.join('\n') + '\n');
await server.close();
