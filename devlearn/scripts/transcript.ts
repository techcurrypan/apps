// 例（打った物と返った物）の下書きを作る道具。道具に命令を順に打ち、端末と同じ形で出す。
// 模擬は本物の記録と一字ずつ比べてあるので（real.test.ts）、ここで出た物は本物の出力と同じ。
// run.ts は import.meta.glob（Vite の書き方）を使うので、Vite に読み込ませて走らせる。
//   npx tsx scripts/transcript.ts <道具> '<setup の JSON>' '<命令>' '<命令>' …
// 例: npx tsx scripts/transcript.ts shell '{"files":{"a.txt":"x\n"}}' 'ls' 'cat a.txt'
import { createServer } from 'vite';

const [name, setupJson, ...lines] = process.argv.slice(2);
const server = await createServer({
	configFile: false,
	server: { middlewareMode: true, hmr: false },
	appType: 'custom',
	logLevel: 'error'
});
type RunMod = typeof import('../src/lib/practice/run.ts');
const { openRun, typeRun } = (await server.ssrLoadModule('/src/lib/practice/run.ts')) as RunMod;
const prompt: Record<string, string> = { sql: 'sqlite> ' };
let r = openRun({
	goal: '',
	tool: { name, mode: name === 'js' || name === 'sql' ? 'real' : 'mock' },
	setup: JSON.parse(setupJson || '{}'),
	success: {},
	mistakes: []
});
for (const line of lines) {
	r = await typeRun(r, line);
	const st = r.steps.at(-1);
	process.stdout.write(`${prompt[name] ?? '$ '}${line}\n${st?.out ?? ''}${st?.err ?? ''}`);
	if (st && st.code !== 0) process.stdout.write(`[終了コード ${st.code}]\n`);
}
const last = r.states.at(-1) as { cwd?: string } | undefined;
if (last?.cwd) process.stdout.write(`[今いる場所 ${last.cwd}]\n`);
await server.close();
