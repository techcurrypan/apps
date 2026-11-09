// 配信されたコミットと組み立て日時を、画面に出す形に整える。

export function shortCommit(sha: string): string {
	const s = sha.trim();
	if (s === '') return '不明';
	return s.slice(0, 7);
}

const pad = (n: number): string => String(n).padStart(2, '0');

// 組み立てた時刻（UTC の ISO 文字列）を日本時間で表す。
// 日本時間は夏時間が無く、常に UTC+9。
export function formatBuiltAt(iso: string): string {
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return '不明';
	const d = new Date(ms + 9 * 60 * 60 * 1000);
	const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
	const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
	return `${date} ${time}（日本時間）`;
}
