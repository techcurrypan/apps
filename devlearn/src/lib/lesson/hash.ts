// レッスンの中身の指紋（検査 38：査読がいまの本文を読んだ物か）。FNV-1a 64 ビットを JSON の文字に当てる。
export function lessonHash(l: unknown): string {
	const s = JSON.stringify(l);
	let h = 0xcbf29ce484222325n;
	const P = 0x100000001b3n;
	const M = (1n << 64n) - 1n;
	for (let i = 0; i < s.length; i++) {
		h ^= BigInt(s.charCodeAt(i));
		h = (h * P) & M;
	}
	return h.toString(16).padStart(16, '0');
}
