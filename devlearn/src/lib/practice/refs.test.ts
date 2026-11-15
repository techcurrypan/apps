import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { SOLUTIONS } from '../content/solutions.ts';
import { COMMAND_REFS, OFFICIAL, commandKeys } from './refs.ts';

describe('コマンドの参考の鍵', () => {
	it('git・docker は下の命令まで、shell は先頭の語', () => {
		expect(commandKeys('git', 'git add hello.txt')).toEqual(['git add']);
		expect(commandKeys('docker', 'docker compose up -d')).toEqual(['docker compose up']);
		expect(commandKeys('shell', 'cat a.txt | grep x > b.txt')).toEqual(['cat', 'grep']);
		expect(commandKeys('shell', 'sudo ufw allow 80/tcp')).toEqual(['ufw']);
	});
	it('SQL は先頭の語を大文字に。js は鍵を持たない', () => {
		expect(commandKeys('sql', 'select * from items;')).toEqual(['SELECT']);
		expect(commandKeys('js', 'console.log(1)')).toEqual([]);
	});
});

describe('コマンドの参考の表（LS-P8）', () => {
	it('自分で作った命令（./hello.sh・作業場所の report）は鍵にしない。公式の説明が無いため', () => {
		expect(commandKeys('shell', './hello.sh world')).toEqual([]);
		expect(commandKeys('shell', 'report')).toEqual([]);
	});
	it('全ての実戦の解き方で使うコマンドに、公式の説明の URL がある（https・ブログやまとめを載せない）', () => {
		const used = new Set<string>();
		for (const l of lessons) {
			const tool = l.practice.tool?.name;
			const sol = SOLUTIONS[l.id];
			if (tool && sol)
				for (const line of sol.pass) for (const k of commandKeys(tool, line)) used.add(k);
		}
		const missing = [...used].filter((k) => !COMMAND_REFS[k]);
		expect(missing).toEqual([]);
		for (const r of Object.values(COMMAND_REFS)) {
			expect(r.url.startsWith('https://')).toBe(true);
			expect(OFFICIAL.some((h) => new URL(r.url).host === h)).toBe(true);
		}
	});
});
