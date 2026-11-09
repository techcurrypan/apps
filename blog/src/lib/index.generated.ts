// 自動生成。直接編集しない。npm run index で作り直す。
export type Post = {
	slug: string;
	series: string;
	title: string;
	date: string;
	summary: string;
	icon: string;
	cover: string;
	minutes: number;
	tags: string[];
};

export const allPosts: Post[] = [
	{
		"slug": "blog-setup/06-scripts",
		"series": "blog-setup",
		"title": "無料でブログを作る (6) 書くのを楽にする道具と、つまずいた所",
		"date": "2026-11-09",
		"summary": "記事 1 本を足すのに毎回同じ手順を踏むのは続かない。対話で選ぶだけにした。最後に全部のつまずきをまとめる。",
		"icon": "",
		"cover": "",
		"minutes": 1,
		"tags": []
	},
	{
		"slug": "blog-setup/05-deploy",
		"series": "blog-setup",
		"title": "無料でブログを作る (5) GitHub Actions で自動公開する",
		"date": "2026-11-08",
		"summary": "push したら検査して Cloudflare へ出すまで。トークンの作り方と、途中で止まった 3 か所。",
		"icon": "",
		"cover": "",
		"minutes": 3,
		"tags": [
			"cloudflare"
		]
	},
	{
		"slug": "blog-setup/04-markdown",
		"series": "blog-setup",
		"title": "無料でブログを作る (4) Markdown で記事を書けるようにする",
		"date": "2026-11-07",
		"summary": "md ファイルを置くだけで記事になり、一覧とタグに自動で載る形を作る。記事が増えても重くならない組み方も。",
		"icon": "",
		"cover": "",
		"minutes": 2,
		"tags": [
			"docker",
			"k8s"
		]
	},
	{
		"slug": "blog-setup/03-sveltekit",
		"series": "blog-setup",
		"title": "無料でブログを作る (3) SvelteKit で土台を作る",
		"date": "2026-11-06",
		"summary": "Node を入れ、SvelteKit のひな形を作り、手元で動かすところまで。選択肢をどう選んだかも書く。",
		"icon": "",
		"cover": "",
		"minutes": 2,
		"tags": [
			"cloudflare",
			"svelte"
		]
	},
	{
		"slug": "blog-setup/02-cloudflare",
		"series": "blog-setup",
		"title": "無料でブログを作る (2) Cloudflare とは何か",
		"date": "2026-11-05",
		"summary": "公開先に Cloudflare を選んだ。CDN から始まった会社が、今は何を提供しているのか。Workers と Pages の違いと、無料枠の考え方。",
		"icon": "",
		"cover": "",
		"minutes": 3,
		"tags": [
			"cloudflare"
		]
	},
	{
		"slug": "blog-setup/01-overview",
		"series": "blog-setup",
		"title": "無料でブログを作る (1) 全体像",
		"date": "2026-11-04",
		"summary": "SvelteKit と Cloudflare で技術ブログを作る。完成形と、使う道具と、かかる費用。",
		"icon": "",
		"cover": "",
		"minutes": 1,
		"tags": [
			"cloudflare",
			"svelte"
		]
	}
];
