// シェルの実戦の舞台：作業場所の木の、打つ前 → 打った後（screen-design.md 3.4）。
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../tools/session.ts';
import { shellCommands } from '../tools/shell/commands.ts';
import { shellTool } from '../tools/shell/run.ts';
import { learnerWorld } from '../tools/shell/world.ts';
import { filesPicture, filesDiff } from './files-picture.ts';

const tool = shellTool<null>(shellCommands<null>());
const after = (lines: string[]) =>
	lines.reduce(typeLine, start(tool, learnerWorld(null))).entries.at(-1)?.state ??
	learnerWorld(null);

describe('作業場所の木', () => {
	it('名前・種類・権限・大きさを、木の順に並べる。今いる場所に印', () => {
		const s = after(['mkdir -p docs/notes', "printf 'ab\\n' > docs/a.txt", 'cd docs']);
		expect(filesPicture(s)).toEqual({
			root: '/home/learner/demo',
			cwd: 'docs',
			rows: [
				{
					path: 'docs',
					name: 'docs',
					depth: 0,
					kind: 'dir',
					mode: 'rwxrwxr-x',
					size: null,
					text: null
				},
				{
					path: 'docs/a.txt',
					name: 'a.txt',
					depth: 1,
					kind: 'file',
					mode: 'rw-rw-r--',
					size: 3,
					text: 'ab\n'
				},
				{
					path: 'docs/notes',
					name: 'notes',
					depth: 1,
					kind: 'dir',
					mode: 'rwxrwxr-x',
					size: null,
					text: null
				}
			]
		});
	});
	it('前と後の違い：増えた・消えた・変わった', () => {
		const before = filesPicture(after(['echo a > x', 'echo b > y']));
		const now = filesPicture(after(['echo a > x', 'echo c > y', 'rm x', 'touch z']));
		expect(filesDiff(before, now)).toEqual({ added: ['z'], removed: ['x'], changed: ['y'] });
	});
});
