// コマンドの参考（LS-P8・検査 20）。コマンドごとに、その道具の公式の説明だけへのリンク。
// まとめサイト・個人のブログは載せない。足すときは URL を開いて、そのコマンドの説明だと確かめ、
// 確かめた日を docs/content-sources.md の「コマンドの参考」に書く。

export type CommandRef = { url: string; site: string };

export const COMMAND_REFS: Readonly<Record<string, CommandRef>> = {};

/** 打った 1 行から、参考の鍵（"git add" "curl" "SELECT"）を取り出す。js は鍵を持たない */
export function commandKeys(tool: string, line: string): string[] {
	const t = line.trim();
	if (t === '' || tool === 'js') return [];
	if (tool === 'sql') {
		const m = /^([A-Za-z]+)/.exec(t);
		return m ? [m[1].toUpperCase()] : [];
	}
	const out: string[] = [];
	for (const seg of t.split(/\|\||&&|\||;/)) {
		const w = seg
			.trim()
			.replace(/^sudo\s+/, '')
			.split(/\s+/);
		if (!w[0] || /^[A-Z_]+=/.test(w[0])) continue;
		if (
			(w[0] === 'git' || w[0] === 'docker' || w[0] === 'kubectl') &&
			w[1] &&
			!w[1].startsWith('-')
		) {
			if (w[0] === 'docker' && w[1] === 'compose' && w[2]) out.push(`docker compose ${w[2]}`);
			else out.push(`${w[0]} ${w[1]}`);
		} else out.push(w[0]);
	}
	return [...new Set(out)];
}
