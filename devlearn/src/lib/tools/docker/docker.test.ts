// 模擬の docker の、記録の外で確かめておく所。本物との一致は real.test.ts で確かめる。
import { describe, expect, it } from 'vitest';
import { current, rewind, start, typeLine, type Session } from '../session.ts';
import { shellTool, type ShellState } from '../shell/run.ts';
import { learnerWorld } from '../shell/world.ts';
import { dockerCommands } from './docker.ts';
import { parseYaml } from './compose.ts';
import {
	emptyDocker,
	ellipsis,
	humanDuration,
	humanSize,
	tabTable,
	type DockerExt
} from './state.ts';

type S = ShellState<DockerExt>;
const tool = shellTool<DockerExt>(dockerCommands());
const begin = () => start(tool, learnerWorld<DockerExt>(emptyDocker(['busybox:1.37'])));
const run = (lines: string[]): Session<S> => lines.reduce(typeLine, begin());
const out = (s: Session<S>, k: number) => s.entries[k];
const lines = run;

describe('docker の形の部品', () => {
	it('どれだけ前・大きさ・切り詰め・表', () => {
		expect([0, 1, 59, 60, 120, 3600, 86400 * 3].map(humanDuration)).toEqual([
			'Less than a second',
			'1 second',
			'59 seconds',
			'About a minute',
			'2 minutes',
			'About an hour',
			'3 days'
		]);
		expect([0, 15, 4_421_000, 123_456].map(humanSize)).toEqual(['0B', '15B', '4.42MB', '123kB']);
		expect(ellipsis('sh -c echo hello > /tmp/x', 20)).toBe('sh -c echo hello > …');
		expect(
			tabTable([
				['A', 'LONGER'],
				['xyz', '1']
			])
		).toBe('A         LONGER\nxyz       1\n');
	});
	it('compose.yaml の小さな部分を読む', () => {
		const y = parseYaml(
			'services:\n  web:\n    image: busybox:1.37\n    command: ["sh", "-c", "echo \'a\'"]\n    ports:\n      - "8080:80"\n'
		);
		expect(y).toEqual({
			services: {
				web: { image: 'busybox:1.37', command: ['sh', '-c', "echo 'a'"], ports: ['8080:80'] }
			}
		});
	});
});

describe('模擬の docker', () => {
	it('大文字を含む名前は、本物の言い方を作らず、模擬だと分かる言い方で断る（D-13）', () => {
		const s = lines([
			'mkdir app',
			"echo 'FROM busybox:1.37' > app/Dockerfile",
			'docker build -t Shop-Web:1.1 app',
			'docker images'
		]);
		expect(out(s, 2).err).toBe(
			'（模擬の docker build は、大文字を含む名前 Shop-Web:1.1 を扱わない。小文字で付ける）\n'
		);
		expect(out(s, 2).code).toBe(1);
		expect(out(s, 3).out).not.toContain('Shop-Web');
	});
	it('名前の重なり・中に無い命令・動いていない物への exec', () => {
		const s = run([
			'docker run -d --name web busybox:1.37 sleep 600',
			'docker run -d --name web busybox:1.37 sleep 600',
			'docker run busybox:1.37 nothing',
			'docker run --name once busybox:1.37 true',
			'docker exec once true'
		]);
		expect(out(s, 1).err).toContain(
			'Conflict. The container name "/web" is already in use by container'
		);
		expect(out(s, 1).code).toBe(125);
		expect(out(s, 2).err).toContain('exec: "nothing": executable file not found in $PATH');
		expect(out(s, 2).code).toBe(127);
		expect(out(s, 4).err).toMatch(
			/^Error response from daemon: container [0-9a-f]{64} is not running\n$/
		);
	});
	it('sleep の時が来たら終わる（作り物の時計は 1 行で 1 分）', () => {
		const s = run([
			'docker run -d --name nap busybox:1.37 sleep 120',
			'docker ps',
			'docker ps',
			'docker ps -a'
		]);
		expect(out(s, 1).out).toContain('nap');
		expect(out(s, 2).out).not.toContain('nap');
		expect(out(s, 3).out).toContain('Exited (0) About a minute ago');
	});
	it('使っているボリュームは消せない。名前の無いコンテナには名前が付く', () => {
		const s = run([
			'docker run -v data:/data busybox:1.37 true',
			'docker volume rm data',
			'docker ps -a'
		]);
		expect(out(s, 1).err).toMatch(
			/^Error response from daemon: remove data: volume is in use - \[[0-9a-f]{64}\]\n$/
		);
		expect(out(s, 2).out).toMatch(/ [a-z]+_[a-z]+\n$/);
	});
	it('口を出しても、中で待つ物が無ければ curl は切られる。出していなければつながらない', () => {
		const s = run([
			'docker run -d -p 8080:80 busybox:1.37 sleep 600',
			'curl http://localhost:8080/',
			'curl http://localhost:9090/'
		]);
		expect(out(s, 1)).toMatchObject({
			err: 'curl: (56) Recv failure: Connection reset by peer\n',
			code: 56
		});
		expect(out(s, 2).code).toBe(7);
	});
	it('compose.yaml が無い', () => {
		const s = run(['docker compose up -d']);
		expect(out(s, 0)).toMatchObject({
			err: 'no configuration file provided: not found\n',
			code: 1
		});
	});
	it('巻き戻すと、その時点のコンテナ・イメージ・ボリュームに戻る（段 7 の完成条件 2）', () => {
		const s = run([
			'docker volume create v',
			'docker run -d --name ab busybox:1.37 sleep 600',
			'docker rm -f ab',
			'docker volume rm v'
		]);
		const back = rewind(s, 2);
		expect(current(back)).toBe(s.entries[1].state);
		const again = typeLine(back, 'docker ps');
		expect(again.entries.at(-1)?.out).toContain(' ab\n');
		expect(current(again).ext.volumes.map((v) => v.name)).toEqual(['v']);
	});
});
