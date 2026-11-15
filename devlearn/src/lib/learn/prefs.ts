// 学習画面の好み（LS-X7）と、上の帯に出す街の数（LS-A1）。ブラウザ内に置く。
export const PREFS_KEY = 'devlearn.learn.prefs';
export const SUMMARY_KEY = 'devlearn.town.summary';
export const NOTES_KEY = 'devlearn.learn.notes';

export type Depth = 1 | 2 | 3;
export type Prefs = {
	depth: Depth;
	town: boolean;
	view: 'map' | 'seq';
	speed: 0.5 | 1 | 2;
	follow: boolean;
};
export const DEFAULT_PREFS: Prefs = { depth: 1, town: true, view: 'map', speed: 1, follow: true };

export function parsePrefs(text: string | null): Prefs {
	try {
		const x = JSON.parse(text ?? '{}') as Partial<Prefs>;
		return {
			depth: x.depth === 2 || x.depth === 3 ? x.depth : 1,
			town: x.town !== false,
			view: x.view === 'seq' ? 'seq' : 'map',
			speed: x.speed === 0.5 || x.speed === 2 ? x.speed : 1,
			follow: x.follow !== false
		};
	} catch {
		return { ...DEFAULT_PREFS };
	}
}

/** 街の画面が保存のたびに書く、上の帯の数 */
export type TownSummary = { money: number; happy: number };
export function parseSummary(text: string | null): TownSummary | null {
	try {
		const x = JSON.parse(text ?? 'null') as Partial<TownSummary> | null;
		return x && typeof x.money === 'number' && typeof x.happy === 'number'
			? { money: x.money, happy: x.happy }
			: null;
	} catch {
		return null;
	}
}

/** 手帳の 1 枚（思い出すを終えると残る。LS-R4・R5） */
export type Note = { id: string; title: string; point: string; town: string; score: string };
export function parseNotes(text: string | null): Note[] {
	try {
		const x = JSON.parse(text ?? '[]') as unknown;
		return Array.isArray(x)
			? x.filter(
					(n): n is Note =>
						typeof n === 'object' && n !== null && typeof (n as Note).id === 'string'
				)
			: [];
	} catch {
		return [];
	}
}

export function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}
export function write(key: string, v: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(v));
	} catch {
		/* 置けなくても、この画面の間は効く */
	}
}
