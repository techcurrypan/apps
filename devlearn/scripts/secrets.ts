// 秘密情報の検査。リポジトリに入る物と、組み立てた配信物を調べる。
// 1 件でも見つかれば失敗で終わる。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findSecrets, type SecretHit } from './lib/secret-scan.ts';

const root = process.cwd();

function gitFiles(): string[] {
	const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
		cwd: root,
		encoding: 'utf8'
	});
	return out.split('\n').filter((f) => f !== '');
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) files.push(...walk(p));
		else files.push(relative(root, p));
	}
	return files;
}

const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|wasm|zip|gz)$/i;

const targets = [
	...gitFiles(),
	// 配信物（組み立て済みなら）
	...walk(join(root, '.svelte-kit', 'cloudflare')),
	// リポジトリの根にある、この配信の CI 設定
	'../.github/workflows/deploy-devlearn.yml'
].filter((f) => !BINARY.test(f) && existsSync(join(root, f)));

const hits: SecretHit[] = [];
for (const f of targets) {
	hits.push(...findSecrets(f, readFileSync(join(root, f), 'utf8')));
}

if (hits.length > 0) {
	for (const h of hits) console.error(`秘密情報らしい物: ${h.file}:${h.line}（${h.rule}）`);
	console.error(`${hits.length} 件。取り除いてからやり直す。`);
	process.exit(1);
}
console.log(`秘密情報の検査: ${targets.length} 件のファイルを調べ、見つからなかった。`);
