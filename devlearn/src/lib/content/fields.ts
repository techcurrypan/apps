// 分野の一覧（docs/curriculum.md 第 1 章・curriculum-standard.md 第 3 章）。並びは地図の並び。k8s・sys は第 2 版で足した（D-23）
export const FIELDS = [
	{ id: 'prg', name: 'プログラミングの基礎' },
	{ id: 'lnx', name: 'Linux' },
	{ id: 'net', name: 'ネットワーク' },
	{ id: 'sec', name: 'セキュリティ' },
	{ id: 'db', name: 'データベース' },
	{ id: 'git', name: 'Git' },
	{ id: 'ctr', name: 'コンテナ' },
	{ id: 'k8s', name: 'Kubernetes' },
	{ id: 'cld', name: 'クラウド' },
	{ id: 'sys', name: 'システム設計' },
	{ id: 'ci', name: 'CI' },
	{ id: 'ai', name: 'AI・機械学習' },
	{ id: 'sta', name: '統計' }
] as const;

export function fieldName(id: string): string {
	return FIELDS.find((f) => f.id === id)?.name ?? id;
}
