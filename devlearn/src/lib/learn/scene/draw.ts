// 構図の置き場（sceneAt）から、描く物の並びを作る（learn-standard.md 16.1 S2・S5・第 17 章）。
// 等角の図は奥（y が小さい）から手前へ描く。同じ y は ID の順で、描く順は毎回同じ（CLAUDE.md 第 8 章）。
import type { Tone } from '../../ui/scene/kit/paint.ts';
import { sceneAt, type Layout, type Place } from './layout.ts';

/** 部品の種類（第 17 章） */
export type ObjKind =
	| 'laptop'
	| 'func'
	| 'block'
	| 'queue'
	| 'ring'
	| 'nic'
	| 'hex'
	| 'db'
	| 'platform'
	| 'pod'
	| 'frame'
	| 'var';

/** レッスンの物：種類・名前・色。置き場は構図（Layout）が決める */
export type SceneObj = { kind: ObjKind; name: string; tone?: Tone; glyph?: string; term?: string };

export type Drawn = SceneObj & Place & { id: string };

/** 物の名前の札を物の真下に置く時の、物の中心からの下がり（図の単位。縮尺 1 の時。LS3-S4） */
export const NAME_DROP: Record<ObjKind, number> = {
	laptop: 74,
	func: 78,
	block: 80,
	queue: 72,
	ring: 84,
	nic: 76,
	hex: 92,
	db: 92,
	platform: 130,
	pod: 0,
	frame: 0,
	var: 0
};
/** 線を物の外枠の手前で止める長さ（図の単位。縮尺 1 の時。LS3-K4） */
export const REACH: Record<ObjKind, number> = {
	laptop: 92,
	func: 86,
	block: 90,
	queue: 142,
	ring: 88,
	nic: 112,
	hex: 88,
	db: 82,
	platform: 200,
	pod: 46,
	frame: 120,
	var: 42
};
/** 床の部品（上に物を乗せる。先に描く） */
const FLOOR: ReadonlySet<ObjKind> = new Set(['platform', 'frame']);
/** 自分で名前を描く部品（pod・frame・var） */
export const SELF_NAMED: ReadonlySet<ObjKind> = new Set(['pod', 'frame', 'var']);

export function drawList(
	objs: Record<string, SceneObj>,
	now: Layout,
	prev: Layout | null,
	t: number,
	o: { reduce?: boolean } = {}
): Drawn[] {
	const at = sceneAt(now, prev, t, o);
	const out: Drawn[] = [];
	for (const [id, p] of Object.entries(at)) {
		const ob = objs[id];
		if (ob) out.push({ ...ob, ...p, id });
	}
	// 台（platform・frame）は床なので、上に乗る物より先に描く
	const floor = (d: Drawn) => (FLOOR.has(d.kind) ? 0 : 1);
	return out.sort(
		(a, b) => floor(a) - floor(b) || a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
	);
}
