import { readFileSync } from 'node:fs';
import { start, typeLine } from '../src/lib/tools/session.ts';
import { shellCommands } from '../src/lib/tools/shell/commands.ts';
import { shellTool } from '../src/lib/tools/shell/run.ts';
import { learnerWorld } from '../src/lib/tools/shell/world.ts';
import { worldFs, worldK8s, type WorldSpec } from '../src/lib/tools/shell/worlds.ts';
const w = JSON.parse(readFileSync('tools-real/worlds/k8s.json', 'utf8')) as WorldSpec;
const tool = shellTool<null>(shellCommands<null>());
const init = { ...learnerWorld<null>(null, worldFs(w)), k8s: worldK8s(w) };
const lines = process.argv.slice(2);
const s = lines.reduce(typeLine, start(tool, init));
for (const e of s.entries) { console.log('$ ' + (e as any).line); console.log((e as any).out ?? ''); if ((e as any).err) console.log('ERR ' + (e as any).err); }
