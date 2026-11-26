// 部品集の色と大きさ（learn-standard.md 第 16.2・17 章）。色は --dl-obj-* のトークン（明暗の両方。app.css）。
import type { Shade } from '../iso';

/** 物の色。同じ物は全レッスンで同じ色（LS3-K3） */
export type Tone = 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'teal' | 'yellow' | 'gray';
export const TONES: Tone[] = ['blue', 'orange', 'green', 'red', 'purple', 'teal', 'yellow', 'gray'];

export const col = (t: Tone) => `var(--dl-obj-${t})`;
/** 淡い面：物の色を pct% だけ図の地に混ぜる */
export const face = (t: Tone, pct: number) =>
	`color-mix(in srgb, ${col(t)} ${pct}%, var(--dl-scene-pn))`;
/** 濃い色（名前の字・印） */
export const edge = (t: Tone) => `color-mix(in srgb, ${col(t)} 62%, var(--dl-ink))`;
/** 横の面の 3 段の明るさ（左が暗い） */
export const SHADE: Record<Shade, number> = { left: 30, front: 39, right: 48 };

/** 部品の床の大きさ [幅, 奥行き] と高さ（図の単位。試作の objFoot・OBJH と同じ） */
export const FOOT = {
	func: [124, 92, 46],
	block: [130, 100, 40],
	queue: [230, 84, 16],
	ring: [120, 120, 20],
	nic: [156, 100, 12],
	laptop: [130, 92, 8],
	hex: [130, 130, 50],
	db: [120, 120, 70],
	platform: [300, 200, 14]
} as const;
export type Kind = keyof typeof FOOT;

/** 実行の文脈の色（func。第 17 章） */
export const CTX: Record<string, Tone> = {
	syscall: 'blue',
	softirq: 'orange',
	hardirq: 'red',
	other: 'gray'
};
/** Pod の状態の色と札 */
export const POD: Record<string, [Tone, string]> = {
	ready: ['green', 'Ready'],
	run: ['green', '動いている'],
	create: ['orange', '起動中'],
	dead: ['red', '落ちた'],
	paper: ['purple', '置き場未定'],
	gray: ['gray', '']
};
/** 荷物の種類の色 */
export const TOKEN: Record<string, Tone> = {
	data: 'blue',
	clone: 'purple',
	ack: 'green',
	drop: 'red'
};

/** 字の幅の見積もり（全角は 1 字、半角は 0.6 字） */
export const textWidth = (s: string, size: number) =>
	[...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2000 ? size : size * 0.6), 0);
