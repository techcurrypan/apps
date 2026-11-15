import { describe, expect, it } from 'vitest';
import { commandKeys } from './refs.ts';

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
