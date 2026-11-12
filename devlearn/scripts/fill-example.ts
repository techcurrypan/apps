// 例（打った物と返った物）を、道具に打った結果でレッスンのファイルに書き込む。手で写すと末尾の空白などを誤るため。
//   npx tsx scripts/fill-example.ts <レッスン ID> '<setup の JSON。空なら実戦の setup>' '<命令>' '<命令>' …
// レッスンの example.lines を書き替え、使った setup が実戦と違えば src/lib/content/solutions.ts の EXAMPLE_SETUP に書くよう知らせる。
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const [id, setupJson, ...cmds] = process.argv.slice(2);
const server = await createServer({
	configFile: false,
	server: { middlewareMode: true, hmr: false },
	appType: 'custom',
	logLevel: 'error'
});
type RunMod = typeof import('../src/lib/practice/run.ts');
type Lessons = typeof import('../src/lib/content/lessons.ts');
const { openRun, typeRun } = (await server.ssrLoadModule('/src/lib/practice/run.ts')) as RunMod;
const path = `src/lib/content/lessons/${id}.ts`;
const { lessons } = (await server.ssrLoadModule('/src/lib/content/lessons.ts')) as Lessons;
const lesson = lessons.find((l) => l.id === id);
if (!lesson?.practice.tool)
	throw new Error(`${id} は道具の実戦のレッスンでない（lessons.ts に載っているか）`);
const setup = setupJson ? JSON.parse(setupJson) : lesson.practice.setup;
const name = lesson.practice.tool.name;
let r = openRun({ ...lesson.practice, setup });
const lines: string[] = [];
const NL = String.fromCharCode(10);
for (const c of cmds) {
	r = await typeRun(r, c);
	const st = r.steps.at(-1);
	const out = `${st?.out ?? ''}${st?.err ?? ''}`;
	const rows = out.split(NL);
	if (rows.at(-1) === '') rows.pop();
	lines.push(`${name === 'sql' ? 'sqlite> ' : '$ '}${c}`, ...rows);
}
const src = readFileSync(path, 'utf8');
const ex = src.indexOf('example: {');
const a = src.indexOf('lines: [', ex);
const b = src.indexOf('practice: {', a);
const close = src.lastIndexOf(']', b);
const out = src.slice(0, a) + `lines: ${JSON.stringify(lines)}` + src.slice(close + 1);
writeFileSync(path, out);
console.log(lines.join(NL));
if (setupJson) console.log(`\n※ EXAMPLE_SETUP に '${id}': ${setupJson} を書く`);
await server.close();
