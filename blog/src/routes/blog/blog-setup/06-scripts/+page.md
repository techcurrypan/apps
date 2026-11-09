---
title: '無料でブログを作る (6) 記事を書いて公開する手順'
date: '2026-11-05'
summary: 何をするか選ぶと、打つコマンドがそのまま出る。書くときに開くページ。
tags: ['git']
---

<script>
	import Recipe from '../../../../lib/Recipe.svelte';
</script>

何をするか選ぶと、打つコマンドが出る。

<Recipe />

## 連載の見た目を変える

左の一覧に出る絵文字と表示名は `src/lib/posts.ts` で決めている。新しい連載を作ったら 1 行足す。

```typescript
const ICONS = { k8s: '☸' };
const LABELS = { k8s: 'Kubernetes 入門' };
```

書かなければ、既定の絵文字とフォルダ名のまま出る。

## 詰まったら

| 症状 | 対処 |
|---|---|
| 一覧に出ない | dev を再起動 |
| `Types file not found` | `npm run gen` |
| 型の誤りで check が落ちる | 直す。dev では出ない |
| 公開されない | Actions タブで赤い段を開く（第 5 回） |
| push が 403 | 第 10 回 |
