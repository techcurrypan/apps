// 分野の一覧（docs/curriculum.md 第 1 章）。並びは地図の並び。
export const FIELDS = [
	{ id: 'prg', name: 'プログラミングの基礎' },
	{ id: 'lnx', name: 'Linux' },
	{ id: 'net', name: 'ネットワーク' },
	{ id: 'sec', name: 'セキュリティ' },
	{ id: 'db', name: 'データベース' },
	{ id: 'git', name: 'Git' },
	{ id: 'ctr', name: 'コンテナ' },
	{ id: 'cld', name: 'クラウド' },
	{ id: 'ci', name: 'CI' },
	{ id: 'ai', name: 'AI・機械学習' },
	{ id: 'sta', name: '統計' }
] as const;

export function fieldName(id: string): string {
	return FIELDS.find((f) => f.id === id)?.name ?? id;
}
