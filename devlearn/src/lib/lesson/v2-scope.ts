// 検査 26〜40（第 2 版。explanation-standard.md 第 3 章）を当てるレッスンと分野。
// 10-R の見本 2 本から始め、10-D で分野ごとに足す。最後は全て（plan.md 10-D の 4）。
// 第 2 版を当てたレッスンは、第 1 版の検査 1・5・11・12 の数を、検査 26・27・36・37 の数に替える。
export const V2_LESSONS: ReadonlySet<string> = new Set<string>([]);
export const V2_FIELDS: ReadonlySet<string> = new Set<string>([]);

export function inV2Scope(l: { id: string; field: string }): boolean {
	return V2_LESSONS.has(l.id) || V2_FIELDS.has(l.field);
}
