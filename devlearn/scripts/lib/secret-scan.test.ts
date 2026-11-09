import { describe, expect, it } from 'vitest';
import { findSecrets } from './secret-scan.ts';

describe('findSecrets', () => {
	it('GitHub のトークンを見つける', () => {
		const hits = findSecrets('a.ts', 'const t = "ghp_' + 'A'.repeat(36) + '";');
		expect(hits.map((h) => h.rule)).toContain('github-token');
	});
	it('秘密鍵の頭を見つける', () => {
		const hits = findSecrets('k.pem', '-----BEGIN ' + 'RSA PRIVATE KEY-----\nabc');
		expect(hits.map((h) => h.rule)).toContain('private-key');
	});
	it('AWS のアクセスキーを見つける', () => {
		const hits = findSecrets('a.txt', 'AKIA' + 'ABCDEFGHIJKLMNOP');
		expect(hits.map((h) => h.rule)).toContain('aws-access-key');
	});
	it('秘密らしい名前の VITE_ 変数を見つける', () => {
		const hits = findSecrets('.env.example', 'VITE_' + 'API_TOKEN=abc');
		expect(hits.map((h) => h.rule)).toContain('vite-secret-name');
	});
	it('値を直書きした CLOUDFLARE_API_TOKEN を見つける', () => {
		const hits = findSecrets('a.yml', 'CLOUDFLARE_API_TOKEN: ' + 'x'.repeat(40));
		expect(hits.map((h) => h.rule)).toContain('cloudflare-token-literal');
	});
	it('GitHub Actions の secrets 参照は通す', () => {
		const hits = findSecrets(
			'deploy.yml',
			'CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}'
		);
		expect(hits).toEqual([]);
	});
	it('普通の文は通す', () => {
		expect(findSecrets('a.md', '鍵・トークンをリポジトリに書かない')).toEqual([]);
	});
	it('見つけた行番号を返す', () => {
		const hits = findSecrets('a.ts', 'ok\nok\nghp_' + 'B'.repeat(36));
		expect(hits[0]?.line).toBe(3);
	});
});
