/**
 * 描画の 1 コマの長さ（秒。0〜0.1）。見た目だけの動きに使う（状態は決めない）。
 * requestAnimationFrame の時刻はコマの始まりの時刻なので、重い組み立ての後に取った時刻より前になることがある。負にすると船の道の番号が −1 になる
 */
export function frameSeconds(now: number, last: number): number {
	const d = (now - last) / 1000;
	return Number.isFinite(d) ? Math.max(0, Math.min(0.1, d)) : 0;
}
