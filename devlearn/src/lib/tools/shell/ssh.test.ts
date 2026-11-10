// SSH の鍵の計算が本物と同じこと。本物の記録（sec-008）の鍵と指紋と絵から確かめる。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../session.ts';
import { shellCommands } from './commands.ts';
import { shellTool } from './run.ts';
import { base64, fingerprintOf, randomart, unbase64 } from './ssh.ts';
import { learnerWorld } from './world.ts';
import { worldFs, worldNet, type WorldSpec } from './worlds.ts';

type Step = { line: string; out: string };
const rec = JSON.parse(readFileSync('tools-real/recorded/sec-008-ssh.json', 'utf8')) as {
	steps: Step[];
};
const keygen = rec.steps.find(
	(s) => s.line.startsWith('ssh-keygen') && s.out.includes('randomart')
);
const pub = rec.steps.find((s) => s.line.startsWith('cat ~/.ssh/id_ed25519.pub'));

describe('SSH の鍵の計算', () => {
	it('base64 を行き来できる', () => {
		const b = Uint8Array.from([0, 1, 2, 250, 251, 252, 253]);
		expect(base64(b)).toBe('AAEC+vv8/Q==');
		expect([...unbase64(base64(b))]).toEqual([...b]);
	});
	it('公開鍵の形から、記録と同じ指紋になる', () => {
		const blob = unbase64(pub!.out.split(' ')[1]);
		expect(blob.length).toBe(51);
		expect(keygen!.out).toContain(`${fingerprintOf(blob)} learner@devbox`);
	});
	it('指紋から、記録と同じ絵になる', () => {
		const fp = keygen!.out.match(/SHA256:([A-Za-z0-9+/]{43})/)![1];
		const art = keygen!.out.slice(keygen!.out.indexOf('+--['));
		expect(randomart(unbase64(fp), '[ED25519 256]', '[SHA256]')).toBe(art);
	});
});

const sshWorld = JSON.parse(readFileSync('tools-real/worlds/ssh.json', 'utf8')) as WorldSpec;
const runSsh = (lines: string[]) => {
	const tool = shellTool<null>(shellCommands<null>());
	const init = { ...learnerWorld<null>(null, worldFs(sshWorld)), net: worldNet(sshWorld) };
	return lines.reduce(typeLine, start(tool, init)).entries;
};

describe('模擬の ssh', () => {
	it('名前を引けない相手・SSH を待たない相手', () => {
		const [a, b] = runSsh(['ssh nothing.example.com true', 'ssh shop.example.com true']);
		expect(a.err).toBe(
			'ssh: Could not resolve hostname nothing.example.com: Name or service not known\r\n'
		);
		expect(b.err).toBe('ssh: connect to host shop.example.com port 22: Connection refused\r\n');
		expect([a.code, b.code]).toEqual([255, 255]);
	});
	it('知らない相手は、確かめを問うて止まる（模擬の端末は答えられない）', () => {
		const [a] = runSsh(['ssh ssh.example.com true']);
		expect(a.err).toContain("The authenticity of host 'ssh.example.com (192.0.2.22)'");
		expect(a.err).toContain('Host key verification failed.');
		expect(a.code).toBe(255);
	});
	it('鍵を作り、置くと入れる。人も書ける権限だと入れない', () => {
		const e = runSsh([
			'ssh -o StrictHostKeyChecking=accept-new ssh.example.com true',
			"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519",
			'cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys',
			'chmod 666 ~/.ssh/authorized_keys',
			'ssh ssh.example.com true',
			'chmod 600 ~/.ssh/authorized_keys',
			'ssh ssh.example.com whoami',
			'wc -c ~/.ssh/id_ed25519 ~/.ssh/known_hosts'
		]);
		expect(e[4].err).toBe('learner@ssh.example.com: Permission denied (publickey).\r\n');
		expect(e[6].out).toBe('learner\n');
		// 秘密鍵と知っている機械の表の大きさは本物と同じ（記録の ls -l の 411 と 142）
		expect(e[7].out).toContain('411 /home/learner/.ssh/id_ed25519');
		expect(e[7].out).toContain('142 /home/learner/.ssh/known_hosts');
	});
});
