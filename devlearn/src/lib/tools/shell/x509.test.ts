// 証明書を読み、署名を確かめる（本物の OpenSSL で作った証明書。tools-real/worlds/certs.json）。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nameLine, verifyChain } from './openssl.ts';
import { CLOCK_BASE } from './run.ts';
import { readPem, signedBy, type Cert } from './x509.ts';

type W = { files: { path: string; data: string }[] };
const world = JSON.parse(readFileSync('tools-real/worlds/certs.json', 'utf8')) as W;
const cert = (name: string): Cert => {
	const f = world.files.find((x) => x.path.endsWith(`/${name}`));
	const c = f ? readPem(f.data) : null;
	if (!c) throw new Error(name);
	return c[0];
};

describe('証明書', () => {
	const root = cert('root-ca.pem');
	const inter = cert('inter-ca.pem');
	const server = cert('server.pem');
	const other = cert('other-ca.pem');
	it('持ち主と発行者を読む', () => {
		expect(nameLine(server.subject)).toBe('C = JP, O = Example Shop, CN = shop.example.com');
		expect(nameLine(server.issuer)).toBe(nameLine(inter.subject));
		expect(server.san).toEqual(['DNS:shop.example.com']);
		expect(server.serialHex).toBe('1003');
	});
	it('署名は発行者の公開鍵で合い、別の鍵では合わない', () => {
		expect(signedBy(server, inter)).toBe(true);
		expect(signedBy(inter, root)).toBe(true);
		expect(signedBy(root, root)).toBe(true);
		expect(signedBy(server, root)).toBe(false);
		expect(signedBy(inter, other)).toBe(false);
	});
	it('根まで辿る。中間が無いと 20、期限切れは 10', () => {
		expect(verifyChain(server, [root], [inter], CLOCK_BASE)).toEqual({ ok: true });
		expect(verifyChain(server, [root], [], CLOCK_BASE)).toMatchObject({ code: 20, depth: 0 });
		expect(verifyChain(server, [inter], [], CLOCK_BASE)).toMatchObject({ code: 2, depth: 1 });
		expect(verifyChain(cert('old.pem'), [root], [inter], CLOCK_BASE)).toMatchObject({
			code: 10,
			depth: 0
		});
	});
});
