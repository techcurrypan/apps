// 等角の写し方と、立体の見える面の計算（learn-standard.md 第 16.2・第 20 章）。描かない。点の配列を返すだけの純粋な関数。
// 試作 learn11 の core.js（isoProj・localProj・rrectPts・rprism・hexPts・cylinder）と同じ形になるように作った。

export type Pt = [number, number];

/** 2:1 の等角。横の軸は右下と左下へ atan(0.5) ≈ 26.57°（LS3-K1） */
export const ISO = { ax: 0.894, ay: 0.447 } as const;

export type Proj = {
	/** 床の座標 (x, y) と高さ z を、画面の点にする */
	at(x: number, y: number, z?: number): Pt;
	ex: Pt;
	ey: Pt;
};

/** 画面の点 (cx, cy) を床の中心にして、縮尺 s で写す */
export function localProj(cx: number, cy: number, s = 1): Proj {
	const ex: Pt = [ISO.ax, ISO.ay];
	const ey: Pt = [-ISO.ax, ISO.ay];
	return {
		ex,
		ey,
		at: (x, y, z = 0) => [
			cx + (x * ex[0] + y * ey[0]) * s,
			cy + (x * ex[1] + y * ey[1]) * s - z * s
		]
	};
}

export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [
	[x, y],
	[x + w, y],
	[x + w, y + h],
	[x, y + h]
];

/** 角の丸い四角の床。角ごとに n + 1 点（右上から時計回り） */
export function rrectPts(x: number, y: number, w: number, h: number, r: number, n = 5): Pt[] {
	r = Math.min(r, w / 2, h / 2);
	const corners: [number, number, number][] = [
		[x + w - r, y + r, -Math.PI / 2],
		[x + w - r, y + h - r, 0],
		[x + r, y + h - r, Math.PI / 2],
		[x + r, y + r, Math.PI]
	];
	const pts: Pt[] = [];
	for (const [cx, cy, a0] of corners)
		for (let i = 0; i <= n; i++) {
			const a = a0 + (Math.PI / 2) * (i / n);
			pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
		}
	return pts;
}

export function hexPts(r: number): Pt[] {
	return Array.from({ length: 6 }, (_, i) => {
		const a = (Math.PI / 3) * i + Math.PI / 6;
		return [r * Math.cos(a), r * Math.sin(a)] as Pt;
	});
}

/** 横の面の明るさ（3 段）。左が一番暗く、右が一番明るい */
export type Shade = 'left' | 'front' | 'right';

export type PrismGeom = {
	/** 見える横の面。同じ明るさの続きは 1 枚にまとめる（筋を入れない） */
	sides: { shade: Shade; pts: Pt[] }[];
	/** 上の面 */
	top: Pt[];
	/** 外の輪郭：見える横の面の上の端から、下の線を通り、反対の上の端まで */
	outline: Pt[];
	/** 床の影（右下へ 7px ずらす） */
	shadow: Pt[];
};

/** 床の多角形 pts を高さ z0 から h だけ立てた柱の、見える面（試作の rprism） */
export function prism(pts: Pt[], z0: number, h: number, P: Proj): PrismGeom {
	const n = pts.length;
	const { ex, ey } = P;
	const shadeOf: (Shade | null)[] = [];
	for (let i = 0; i < n; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % n];
		const nx = b[1] - a[1];
		const ny = -(b[0] - a[0]);
		const L = Math.hypot(nx, ny) || 1;
		const sy = (nx * ex[1] + ny * ey[1]) / L;
		const sx = (nx * ex[0] + ny * ey[0]) / L;
		shadeOf.push(h > 0 && sy > 1e-4 ? (sx < -0.25 ? 'left' : sx > 0.25 ? 'right' : 'front') : null);
	}
	let start = shadeOf.findIndex((v, i) => v && !shadeOf[(i - 1 + n) % n]);
	if (start < 0) start = 0;
	const order = Array.from({ length: n }, (_, i) => (start + i) % n);
	const groups: { shade: Shade; idx: number[] }[] = [];
	let cur: { shade: Shade; idx: number[] } | null = null;
	for (const i of order) {
		const v = shadeOf[i];
		if (!v) {
			cur = null;
			continue;
		}
		if (!cur || cur.shade !== v) {
			cur = { shade: v, idx: [] };
			groups.push(cur);
		}
		cur.idx.push(i);
	}
	const sides = groups.map((g) => {
		const bot: Pt[] = [];
		const tp: Pt[] = [];
		for (const i of g.idx) {
			const a = pts[i];
			const b = pts[(i + 1) % n];
			if (!bot.length) bot.push(P.at(a[0], a[1], z0));
			bot.push(P.at(b[0], b[1], z0));
		}
		for (let j = g.idx.length - 1; j >= 0; j--) {
			const i = g.idx[j];
			const a = pts[i];
			const b = pts[(i + 1) % n];
			if (j === g.idx.length - 1) tp.push(P.at(b[0], b[1], z0 + h));
			tp.push(P.at(a[0], a[1], z0 + h));
		}
		return { shade: g.shade, pts: bot.concat(tp) };
	});
	const visIdx = order.filter((i) => shadeOf[i]);
	const outline: Pt[] = [];
	if (visIdx.length) {
		const first = pts[visIdx[0]];
		const last = pts[(visIdx[visIdx.length - 1] + 1) % n];
		outline.push(P.at(first[0], first[1], z0 + h), P.at(first[0], first[1], z0));
		for (const i of visIdx) {
			const b = pts[(i + 1) % n];
			outline.push(P.at(b[0], b[1], z0));
		}
		outline.push(P.at(last[0], last[1], z0 + h));
	}
	return {
		sides,
		top: pts.map((q) => P.at(q[0], q[1], z0 + h)),
		outline,
		shadow: pts.map((q) => {
			const [x, y] = P.at(q[0], q[1], 0);
			return [x + 7, y + 7] as Pt;
		})
	};
}

/** 円柱（帳簿・リング）。床の半径 r・高さ h・縮尺 s。body は横の面の SVG の道 */
export function cylinder(cx: number, cy: number, r: number, h: number, s = 1) {
	const rx = Math.SQRT2 * r * ISO.ax * s;
	const ry = Math.SQRT2 * r * ISO.ay * s;
	const H = h * s;
	const body = `M${cx - rx} ${cy}V${cy - H}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy - H}V${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}Z`;
	/** 横の面の帯 k 本目（下から）の道 */
	const band = (i: number, of: number) =>
		`M${cx - rx} ${cy - (H * (i + 1)) / (of + 1)}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy - (H * (i + 1)) / (of + 1)}`;
	return { rx, ry, topY: cy - H, body, band };
}

/** 点の配列を SVG の points の文字列にする（小数 1 桁） */
export const ptsStr = (a: Pt[]) => a.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
