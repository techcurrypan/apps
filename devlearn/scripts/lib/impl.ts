// 検査 39 の「名前が版を決めたソースにある」（explanation-standard.md 第 3 章・curriculum-standard.md 第 6 章）。
// 取得先は公式のリポジトリの版の tag だけ。取った物は .cache/impl/ に置く（git に入れない）。
import type { Impl, Lesson } from '../../src/lib/lesson/types.ts';

export const REPOS: Record<string, string> = {
	linux: 'torvalds/linux',
	kubernetes: 'kubernetes/kubernetes',
	git: 'git/git',
	postgres: 'postgres/postgres',
	etcd: 'etcd-io/etcd',
	containerd: 'containerd/containerd',
	runc: 'opencontainers/runc'
};

export function rawUrl(i: Pick<Impl, 'project' | 'version' | 'where'>): string | null {
	const repo = REPOS[i.project];
	if (!repo || i.where.startsWith('/')) return null;
	return `https://raw.githubusercontent.com/${repo}/${i.version}/${i.where}`;
}

/** 探す言葉。関数の () と構造体の struct を外す */
export function needle(name: string): string {
	return name
		.replace(/\(\)$/, '')
		.replace(/^struct\s+/, '')
		.trim();
}

/** ソースの文の中に、名前が識別子として現れるか */
export function hasName(src: string, name: string): boolean {
	const n = needle(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(^|[^A-Za-z0-9_])${n}([^A-Za-z0-9_]|$)`).test(src);
}

export type Want = { lesson: string; step: number; impl: Impl; url: string };

/** 確かめる物の一覧（kind 'command' と、ファイルの道で無い物は除く） */
export function wants(lessons: readonly Lesson[]): { list: Want[]; skipped: string[] } {
	const list: Want[] = [];
	const skipped: string[] = [];
	for (const l of lessons)
		for (const s of l.explain)
			for (const i of s.impl ?? []) {
				if (i.kind === 'command') continue;
				const url = rawUrl(i);
				if (!url) skipped.push(`${l.id} ステップ ${s.n}：${i.name}（${i.project} ${i.where}）`);
				else list.push({ lesson: l.id, step: s.n, impl: i, url });
			}
	return { list, skipped };
}
