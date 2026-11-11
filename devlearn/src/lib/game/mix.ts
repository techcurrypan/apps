// 種と番号から決まる 32 ビットの整数の混ぜ合わせ（game-design.md 15.5）。
// 状態を決める処理で、乱数の代わりに使う。Math.sin を使わない（ブラウザによって最後の桁が違い得るため）。
export function mix32(...xs: number[]): number {
	let h = 0x811c9dc5;
	for (const x of xs) {
		h = Math.imul(h ^ (x | 0), 0x01000193);
		h ^= h >>> 15;
		h = Math.imul(h, 0x2c1b3c6d);
		h ^= h >>> 12;
		h = Math.imul(h, 0x297a2d39);
		h ^= h >>> 15;
	}
	return h >>> 0;
}
