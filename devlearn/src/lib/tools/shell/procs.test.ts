// プロセスとサービスの模擬の、記録の外で確かめておく所。本物との一致は real.test.ts で確かめる。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../session.ts';
import { shellCommands } from './commands.ts';
import { shellTool } from './run.ts';
import { learnerWorld } from './world.ts';
import { worldFs, worldSys, type WorldSpec } from './worlds.ts';

const runIn = (name: string, lines: string[]) => {
	const w = JSON.parse(readFileSync(`tools-real/worlds/${name}.json`, 'utf8')) as WorldSpec;
	const tool = shellTool<null>(shellCommands<null>());
	const init = { ...learnerWorld<null>(null, worldFs(w)), sys: worldSys(w) };
	return lines.reduce(typeLine, start(tool, init)).entries;
};

describe('プロセスの模擬', () => {
	it('自分の端末のプロセスは bash と ps', () => {
		const [a, b] = runIn('procs', ['ps', 'ps']);
		expect(a.out).toMatch(
			/^ {4}PID TTY {10}TIME CMD\n +\d+ pts\/0 {4}00:00:00 bash\n +\d+ pts\/0 {4}00:00:00 ps\n$/
		);
		// ps は打つたびに新しい番号
		expect(a.out).not.toBe(b.out);
	});
	it('人のプロセスは pkill でも止められない', () => {
		const [a, b] = runIn('procs', ['pkill -f worker.py', 'pgrep -f worker.py']);
		expect(a.err).toMatch(/^pkill: killing pid \d+ failed: Operation not permitted\n$/);
		expect(a.code).toBe(3);
		expect(b.code).toBe(0);
	});
	it('kill の誤り：知らないシグナル・番号でない物・何も付けない', () => {
		const [a, b, c] = runIn('procs', ['kill -FOO 1', 'kill abc', 'kill']);
		expect(a.err).toBe('bash: kill: FOO: invalid signal specification\n');
		expect(b.err).toBe('bash: kill: abc: arguments must be process or job IDs\n');
		expect(c.code).toBe(2);
	});
	it('kill -l はシグナルの表', () => {
		const [a] = runIn('procs', ['kill -l']);
		expect(a.out.split('\n')[0]).toBe(
			' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 4) SIGILL\t 5) SIGTRAP'
		);
		expect(a.out).toContain('15) SIGTERM');
	});
});

describe('サービスの模擬', () => {
	it('sudo の無い stop は止まる。日誌は root でなければ読めない', () => {
		const [a, b] = runIn('service', ['systemctl stop shop', 'journalctl -u shop']);
		expect(a.err).toContain('Failed to stop shop.service: Interactive authentication required.');
		expect(b.err).toContain('Hint: You are currently not seeing messages from other users');
	});
	it('動かして止めると、ps から消え、status は止まった時刻と長さを出す', () => {
		const e = runIn('service', [
			'sudo systemctl start shop',
			'ps -u shop -o pid,cmd',
			'sudo systemctl stop shop',
			'ps -u shop -o pid,cmd',
			'systemctl status shop'
		]);
		expect(e[1].out).toContain('/usr/bin/python3 /opt/shop/web.py');
		expect(e[3].code).toBe(1);
		expect(e[4].out).toContain(
			'Active: inactive (dead) since Tue 2026-11-10 09:02:00 JST; 2min ago'
		);
		expect(e[4].out).toContain('Duration: 2min');
	});
	it('enable の後の disable は、作った印を外す', () => {
		const e = runIn('service', [
			'sudo systemctl enable shop',
			'sudo systemctl disable shop',
			'systemctl is-enabled shop'
		]);
		expect(e[1].err).toBe('Removed "/etc/systemd/system/multi-user.target.wants/shop.service".\n');
		expect(e[2].out).toBe('disabled\n');
		expect(e[2].code).toBe(1);
	});
});
