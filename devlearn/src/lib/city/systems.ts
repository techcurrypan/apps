// 仕組みの建物と業者の箱の置き場（game-design.md 15.4）。試作の街の形（gen）の上の決まったデータ。
// git・db・sec は試作の街にある隠れた建物（記録庫・帳簿の倉庫・門番の小屋）をそのまま使う。
// 残りの 8 つと箱は、依頼主の建物の近くで、建物（1 m あける）・区画・道・水・坂（高さ 3 より上）・役場の街区・公園の街区と
// 重ならない所を、gen の出力から 1 m 刻みで探して決めた（2026-11-11。探し方は docs/progress/phase-8.md 8-2c）。
import type { FeatKey } from '../game/map.ts';

export type Rect = { x0: number; z0: number; x1: number; z1: number };

/** 分野の色（地下の仕組みの流れ。15.4。3D の街の中だけで使う） */
export const FIELD_COLOR: Record<string, string> = {
	git: '#b48cff',
	db: '#3fd0c0',
	sec: '#ffb000',
	net: '#56d68a',
	prg: '#ff8fb8',
	lnx: '#b9d36a',
	ctr: '#5ac8ff',
	cld: '#e8ecf4',
	ci: '#f5e663',
	ai: '#ff6fd8',
	sta: '#7d8cff'
};

/** 試作の街にある隠れた建物を使う分野 */
export const SYSTEM_FEAT: Partial<Record<string, FeatKey>> = {
	git: 'annex',
	db: 'dbvault',
	sec: 'gate'
};

/** 新しく建てる分野の置き場（8 × 8 m）。街の中心は建て込んでいて、役場の裏と商店街の裏は 1 つ先の街区になった */
export const SYSTEM_SPOT: Record<string, Rect> = {
	net: { x0: -124, z0: 27.5, x1: -116, z1: 35.5 },
	prg: { x0: 28.96, z0: 111.15, x1: 36.96, z1: 119.15 },
	lnx: { x0: 15.96, z0: 111.15, x1: 23.96, z1: 119.15 },
	ctr: { x0: -61.5, z0: 198.5, x1: -53.5, z1: 206.5 },
	ai: { x0: -74.5, z0: 198.5, x1: -66.5, z1: 206.5 },
	sta: { x0: -48.5, z0: 198.5, x1: -40.5, z1: 206.5 },
	cld: { x0: 27.75, z0: -191.5, x1: 35.75, z1: -183.5 },
	ci: { x0: 47.75, z0: -191.5, x1: 55.75, z1: -183.5 }
};

/** 業者の箱の置き場（6 × 6 m。依頼主の建物ごと） */
export const BOX_SPOT: Record<string, Rect> = {
	shopMain: { x0: 59.96, z0: -17.85, x1: 65.96, z1: -11.85 },
	board: { x0: 11.5, z0: -25.5, x1: 16.5, z1: -20.5 },
	school: { x0: -135, z0: 28.5, x1: -129, z1: 34.5 },
	clinic: { x0: -134.75, z0: -50.5, x1: -128.75, z1: -44.5 },
	warehouse: { x0: -87.5, z0: 198.5, x1: -81.5, z1: 204.5 },
	hall: { x0: 45.75, z0: -50.5, x1: 51.75, z1: -44.5 }
};

/** 依頼主の印と一覧の頭の字・色（試作の 5 つに、運送屋と組合を足した） */
export const CLIENT_LOOK: Record<string, { icon: string; color: string }> = {
	商店街のパン屋の店主: { icon: '店', color: '#f2c14e' },
	町内会長: { icon: '町', color: '#ff9d4d' },
	港の学校の先生: { icon: '学', color: '#6fb3ff' },
	診療所の受付: { icon: '診', color: '#3fd0c0' },
	港の倉庫の番頭: { icon: '港', color: '#ff7a59' },
	運送屋の配車係: { icon: '運', color: '#ff7a59' },
	組合の事務長: { icon: '組', color: '#b48cff' }
};

export const SYSTEM_ID = 5000;
export const BOX_ID = 5100;
