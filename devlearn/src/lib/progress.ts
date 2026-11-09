// 修了の記録（L-6）。ブラウザ内（localStorage）に残す。利用者の登録はしない（X-5）。
export const PROGRESS_KEY = 'devlearn.progress';

export type Progress = { v: 1; done: string[] };

export const emptyProgress = (): Progress => ({ v: 1, done: [] });

export function markDone(p: Progress, lessonId: string): Progress {
	return p.done.includes(lessonId) ? p : { ...p, done: [...p.done, lessonId] };
}

export function serialize(p: Progress): string {
	return JSON.stringify(p);
}

export function parseProgress(text: string | null): Progress {
	if (!text) return emptyProgress();
	try {
		const x: unknown = JSON.parse(text);
		if (typeof x !== 'object' || x === null || !('done' in x) || !Array.isArray(x.done))
			return emptyProgress();
		return { v: 1, done: x.done.filter((d: unknown): d is string => typeof d === 'string') };
	} catch {
		return emptyProgress();
	}
}

// ブラウザの外（組み立て・テスト）では何もしない
export function loadProgress(): Progress {
	try {
		return parseProgress(localStorage.getItem(PROGRESS_KEY));
	} catch {
		return emptyProgress();
	}
}

export function saveProgress(p: Progress): void {
	try {
		localStorage.setItem(PROGRESS_KEY, serialize(p));
	} catch {
		// 保存できなくても、この画面の間は効く
	}
}
