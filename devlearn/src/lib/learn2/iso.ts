// 機械の絵の一式（learn-standard.md LS-D2・LS-L8）。1 つの作り方：等角の格子（30°）・光は左上から・色は --dl-kind-* の組。
// 形は 8 つ（台・塔・平たい箱・円筒・画面・立方体・重ね板・屋根）で、種類ごとに形・色の系統・前の面の印が違う。外の素材を使わない。
export type Shape = 'tower' | 'slab' | 'cyl' | 'screen' | 'cube' | 'stack' | 'roof' | 'plate';
export type Glyph =
	| 'slots'
	| 'ports'
	| 'rings'
	| 'window'
	| 'gear'
	| 'shield'
	| 'doc'
	| 'person'
	| 'chip'
	| 'queue'
	| 'wave'
	| 'lock'
	| 'eye'
	| 'arrow'
	| 'grid'
	| 'dot'
	| 'brain'
	| 'chart'
	| 'cloud'
	| 'clock'
	| 'key'
	| 'book'
	| 'scale'
	| 'tag';
export type Kind = { shape: Shape; family: 1 | 2 | 3 | 4 | 5; glyph: Glyph; name: string };

/** 絵の種類（Icon の名前 → 形・色・印）。同じ物は全レッスンで同じ絵 */
export const KINDS: Record<string, Kind> = {
	pc: { shape: 'screen', family: 1, glyph: 'window', name: '手元の PC' },
	laptop: { shape: 'screen', family: 1, glyph: 'window', name: 'ノート PC' },
	phone: { shape: 'screen', family: 1, glyph: 'dot', name: '携帯' },
	server: { shape: 'tower', family: 2, glyph: 'slots', name: 'サーバ' },
	router: { shape: 'slab', family: 3, glyph: 'arrow', name: 'ルータ' },
	switch: { shape: 'slab', family: 3, glyph: 'ports', name: 'スイッチ' },
	nic: { shape: 'plate', family: 3, glyph: 'chip', name: 'NIC' },
	cloud: { shape: 'roof', family: 5, glyph: 'cloud', name: 'クラウド' },
	db: { shape: 'cyl', family: 4, glyph: 'rings', name: 'データベース' },
	etcd: { shape: 'cyl', family: 2, glyph: 'key', name: 'etcd' },
	disk: { shape: 'cyl', family: 5, glyph: 'rings', name: 'ディスク' },
	file: { shape: 'plate', family: 5, glyph: 'doc', name: 'ファイル' },
	folder: { shape: 'plate', family: 4, glyph: 'doc', name: 'フォルダ' },
	book: { shape: 'plate', family: 2, glyph: 'book', name: '記録' },
	wall: { shape: 'tower', family: 4, glyph: 'shield', name: '防火壁' },
	lock: { shape: 'cube', family: 4, glyph: 'lock', name: '鍵' },
	node: { shape: 'stack', family: 3, glyph: 'grid', name: 'ノード' },
	pod: { shape: 'cube', family: 1, glyph: 'dot', name: 'Pod' },
	box: { shape: 'cube', family: 3, glyph: 'grid', name: 'コンテナ' },
	gear: { shape: 'cube', family: 2, glyph: 'gear', name: 'コントローラ' },
	api: { shape: 'tower', family: 1, glyph: 'arrow', name: 'API サーバ' },
	scheduler: { shape: 'cube', family: 4, glyph: 'clock', name: 'スケジューラ' },
	kubelet: { shape: 'slab', family: 2, glyph: 'eye', name: 'kubelet' },
	lb: { shape: 'slab', family: 1, glyph: 'scale', name: '振り分け' },
	queue: { shape: 'slab', family: 4, glyph: 'queue', name: 'キュー' },
	cpu: { shape: 'plate', family: 2, glyph: 'chip', name: 'CPU' },
	wire: { shape: 'plate', family: 5, glyph: 'wave', name: '線' },
	person: { shape: 'plate', family: 1, glyph: 'person', name: '人' },
	chart: { shape: 'plate', family: 3, glyph: 'chart', name: 'グラフ' },
	brain: { shape: 'cube', family: 2, glyph: 'brain', name: 'モデル' },
	tag: { shape: 'plate', family: 4, glyph: 'tag', name: '札' }
};

export const kindOf = (icon: string): Kind => KINDS[icon] ?? KINDS.box;

const C = Math.cos(Math.PI / 6);
const S = 0.5;
/** 等角の点：x は右下へ、y は左下へ、z は上へ */
export const iso = (x: number, y: number, z: number): [number, number] => [
	(x - y) * C,
	(x + y) * S - z
];
const pts = (ps: [number, number][]) =>
	ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

export type Faces = { top: string; left: string; right: string };

/** 底の中心を (0,0,z0) に置いた箱の 3 面（上・左手前・右手前） */
export function boxFaces(w: number, d: number, h: number, z0 = 0): Faces {
	const x0 = -w / 2;
	const x1 = w / 2;
	const y0 = -d / 2;
	const y1 = d / 2;
	const z1 = z0 + h;
	return {
		top: pts([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)]),
		left: pts([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)]),
		right: pts([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)])
	};
}

export type Part = { faces: Faces } | { cyl: { rx: number; ry: number; h: number; z0: number } };

/** 形ごとの部品（台座の上に立つ）。絵の中心は台座の上面の中心 */
export function partsOf(shape: Shape): Part[] {
	const base: Part = { faces: boxFaces(70, 70, 8, -8) };
	switch (shape) {
		case 'tower':
			return [base, { faces: boxFaces(40, 34, 62) }];
		case 'slab':
			return [base, { faces: boxFaces(60, 46, 18) }];
		case 'cyl':
			return [base, { cyl: { rx: 26, ry: 13, h: 46, z0: 0 } }];
		case 'screen':
			return [base, { faces: boxFaces(14, 14, 16) }, { faces: boxFaces(56, 8, 38, 16) }];
		case 'cube':
			return [base, { faces: boxFaces(42, 42, 38) }];
		case 'stack':
			return [
				base,
				{ faces: boxFaces(58, 50, 12) },
				{ faces: boxFaces(58, 50, 12, 16) },
				{ faces: boxFaces(58, 50, 12, 32) }
			];
		case 'roof':
			return [base, { faces: boxFaces(52, 44, 26) }];
		case 'plate':
			return [base, { faces: boxFaces(52, 40, 10) }];
	}
}

/** 前の面（左手前）の中心。印を描く所 */
export function glyphAt(shape: Shape): [number, number] {
	switch (shape) {
		case 'tower':
			return iso(0, 17, 34);
		case 'slab':
			return iso(0, 23, 9);
		case 'cyl':
			return [0, -10];
		case 'screen':
			return iso(0, 4, 35);
		case 'cube':
			return iso(0, 21, 19);
		case 'stack':
			return iso(0, 25, 38);
		case 'roof':
			return iso(0, 22, 13);
		case 'plate':
			return iso(0, 0, 10);
	}
}
