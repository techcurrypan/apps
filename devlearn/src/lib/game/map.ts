// 状態が読む街の形（game-design.md 15.9・15.11）。gen の決まった出力のうち、建物の番号・形・住む人・働く場所、
// 始まりの区画、交差点、地形の高さだけを取り出す。保存しない（毎回 gen から作る）。
import { generateCity, terrainH } from '../city/gen.ts';

export type MapBuilding = {
	id: number;
	kind: string;
	x0: number;
	z0: number;
	x1: number;
	z1: number;
	residents: number;
	jobs: number;
	hidden: boolean;
};
export type MapLot = { x0: number; z0: number; x1: number; z1: number; cx: number; cz: number };
export type TownMap = {
	buildings: MapBuilding[];
	lots: MapLot[];
	nodes: { x: number; z: number }[];
	terrainH: (x: number, z: number) => number;
	/** 地面の高さ（歩道の上） */
	Y: number;
};

export function mapOf(city: ReturnType<typeof generateCity>): TownMap {
	return {
		buildings: city.B.map((b) => ({
			id: b.id,
			kind: b.kind,
			x0: b.x0,
			z0: b.z0,
			x1: b.x1,
			z1: b.z1,
			residents: b.residents || 0,
			jobs: b.jobs || 0,
			hidden: !!b.hidden
		})),
		lots: city.lots.map((l) => ({ x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, cx: l.cx, cz: l.cz })),
		nodes: city.nodes.map((n) => ({ x: n.x, z: n.z })),
		terrainH,
		Y: city.Y
	};
}

let cached: TownMap | null = null;
/** 試作の街の形（決まった出力なので 1 度だけ作る） */
export function townMap(): TownMap {
	cached ??= mapOf(generateCity());
	return cached;
}
