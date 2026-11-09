// 秘密情報らしい文字列を探す。見つけたら、どの決まりに当たったかと行番号を返す。

export type SecretHit = { file: string; line: number; rule: string };

type Rule = { name: string; re: RegExp };

const RULES: Rule[] = [
	{ name: 'github-token', re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/ },
	{ name: 'github-token', re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
	{ name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
	{ name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
	{ name: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
	{ name: 'api-key-sk', re: /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{32,}\b/ },
	{ name: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
	// VITE_ で始まる変数はブラウザに埋め込まれる。秘密らしい名前を付けない。
	{
		name: 'vite-secret-name',
		re: /\bVITE_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API_KEY|APIKEY)[A-Z0-9_]*\b/
	},
	// Cloudflare の鍵は Actions の secrets からだけ渡す。値の直書きを止める。
	{
		name: 'cloudflare-token-literal',
		re: /CLOUDFLARE_(API_TOKEN|API_KEY)\s*[:=]\s*["']?(?!\$\{\{)[A-Za-z0-9_-]{30,}/
	}
];

export function findSecrets(file: string, text: string): SecretHit[] {
	const hits: SecretHit[] = [];
	const lines = text.split(/\r?\n/);
	lines.forEach((line, i) => {
		for (const rule of RULES) {
			if (rule.re.test(line)) hits.push({ file, line: i + 1, rule: rule.name });
		}
	});
	return hits;
}
