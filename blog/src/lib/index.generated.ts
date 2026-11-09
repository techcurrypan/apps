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
		"slug": "blog-setup/10-troubles",
		"series": "blog-setup",
		"title": "無料でブログを作る (10) つまずいた所まとめ",
		"date": "2026-11-09",
		"summary": "実際に詰まった 13 か所。症状・原因・直し方。上から読まず、症状で探す回。",
		"icon": "",
		"cover": "",
		"minutes": 6,
		"tags": [
			"ci",
			"cloudflare",
			"git",
			"svelte"
		]
	},
	{
		"slug": "blog-setup/09-discovery",
		"series": "blog-setup",
		"title": "無料でブログを作る (9) 見つけてもらう",
		"date": "2026-11-08",
		"summary": "title と description、OGP、RSS、sitemap、robots.txt、アクセス解析。全部で 1 時間かからない。",
		"icon": "",
		"cover": "",
		"minutes": 7,
		"tags": [
			"cloudflare",
			"svelte"
		]
	},
	{
		"slug": "blog-setup/08-readable",
		"series": "blog-setup",
		"title": "無料でブログを作る (8) 読みやすくする",
		"date": "2026-11-07",
		"summary": "コードの色分けと行番号、コピー釦、追従する目次、ダークモード、アイキャッチ、検索。殺風景な技術ブログを読める形にする。",
		"icon": "",
		"cover": "",
		"minutes": 5,
		"tags": [
			"css",
			"svelte",
			"typescript"
		]
	},
	{
		"slug": "blog-setup/07-scale",
		"series": "blog-setup",
		"title": "無料でブログを作る (7) 記事が増えても重くしない",
		"date": "2026-11-06",
		"summary": "全記事を読み込む作りは 2000 本で破綻する。組み立て時に索引だけを作る形に変えた理由と、自動タグの閾値の話。",
		"icon": "",
		"cover": "",
		"minutes": 8,
		"tags": [
			"ci",
			"cloudflare",
			"svelte",
			"typescript"
		]
	},
	{
		"slug": "blog-setup/06-scripts",
		"series": "blog-setup",
		"title": "無料でブログを作る (6) 記事を書いて公開する手順",
		"date": "2026-11-05",
		"summary": "何をするか選ぶと、打つコマンドがそのまま出る。書くときに開くページ。",
		"icon": "",
		"cover": "",
		"minutes": 1,
		"tags": [
			"git"
		]
	},
	{
		"slug": "blog-setup/05-deploy",
		"series": "blog-setup",
		"title": "無料でブログを作る (5) 自動公開の道を通す",
		"date": "2026-11-04",
		"summary": "push したら検査して Cloudflare へ出す。トークンの権限、Secrets、ワークフローの全文、gen と check と build の役割。",
		"icon": "",
		"cover": "",
		"minutes": 12,
		"tags": [
			"ci",
			"cloudflare",
			"security"
		]
	},
	{
		"slug": "blog-setup/04-markdown",
		"series": "blog-setup",
		"title": "無料でブログを作る (4) Markdown で記事を書く",
		"date": "2026-11-03",
		"summary": "mdsvex を入れて、Markdown のファイルがそのままページになる形にする。記事の置き場所と URL の対応、frontmatter、連載はフォルダで分ける話。",
		"icon": "",
		"cover": "",
		"minutes": 9,
		"tags": [
			"docker",
			"svelte"
		]
	},
	{
		"slug": "blog-setup/03-sveltekit",
		"series": "blog-setup",
		"title": "無料でブログを作る (3) 手元の準備",
		"date": "2026-11-02",
		"summary": "Node を確認して SvelteKit の土台を作る。作られたフォルダが何なのか、設定がどこに書かれているか。手元で画面が出るまで。",
		"icon": "",
		"cover": "",
		"minutes": 6,
		"tags": [
			"cloudflare",
			"svelte",
			"typescript"
		]
	},
	{
		"slug": "blog-setup/02-cloudflare",
		"series": "blog-setup",
		"title": "無料でブログを作る (2) Cloudflare とは何か",
		"date": "2026-11-01",
		"summary": "公開先に Cloudflare を選んだ理由。Workers と Pages の違い、無料枠の具体値、課金が始まる条件。アカウントを作って公開用のサブドメインを登録する。",
		"icon": "",
		"cover": "",
		"minutes": 8,
		"tags": [
			"cloudflare"
		]
	},
	{
		"slug": "blog-setup/01-overview",
		"series": "blog-setup",
		"title": "無料でブログを作る (1) 全体像",
		"date": "2026-10-31",
		"summary": "SvelteKit と Cloudflare で技術ブログを一から作る。何ができるか、どういう流れで動くか、本当に無料なのか。連載の地図。",
		"icon": "",
		"cover": "",
		"minutes": 6,
		"tags": [
			"ci",
			"cloudflare",
			"svelte"
		]
	}
];
