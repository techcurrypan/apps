# 無料で使うサービスと、その条件

確認日: 2026-11-09。数字は確認日の公式文書による。変わることがあるので、使い方を変えるときに読み直す。

## Cloudflare Workers（Free プラン）

| 項目 | 値 | 出典 |
|---|---|---|
| Worker への要求 | 1 日 100,000 件。毎日 0 時（UTC）に戻る | [Limits](https://developers.cloudflare.com/workers/platform/limits/)「Daily requests」 |
| 上限を超えたとき | Error 1027 を返す（fail closed の経路）。Worker を通さない（fail open の経路）。課金の記述は無い | 同上 |
| 1 回の CPU 時間 | 10 ms | [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) / Limits |
| 静的アセットへの要求 | 無料・無制限。Worker の要求に数えない | [Static Assets: Billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| Worker を通る要求 | Workers の料金・上限に数える（SSR、`run_worker_first` に当たる物） | 同上 |
| 静的アセットのファイル数 | 1 版あたり 20,000 | Limits「Static Assets」 |
| 静的アセット 1 ファイルの大きさ | 25 MiB | 同上 |
| Worker の大きさ | 非圧縮で 64 MiB | Limits「Worker size」 |
| 有料プラン | 月 5 USD から。Free とは別の契約 | Pricing「Fine Print」 |

各ページの最終更新: Pricing 2026-10-02 / Limits 2026-10-29 / Static Assets 2026-11-03。

### この配信での使い方

- 画面は組み立て時に HTML にする（prerender）。静的アセットとして配るので、Worker の要求に数えない
- Worker が動くのは、静的アセットに無い道だけ（段 11 の MCP サーバなど）
- **カードを登録しない。** Free プランのまま使う。上限を超えたら Error 1027 で止まる側に倒れる。
  有料プランに上げない限り課金は始まらない
- Worker を通る道を足すとき（段 11）は、1 日 100,000 件・CPU 10 ms に収まるかをここに書き足す

## GitHub Actions

| 項目 | 値 | 出典 |
|---|---|---|
| 公開リポジトリの標準ランナー | 無料。含まれる使用量も減らさない | [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| 支払い方法が未登録のとき | 含まれる使用量を使い切ると止まる（課金されない） | 同上 |
| 大きいランナー | 公開リポジトリでも有料。使わない | 同上 |

- `techcurrypan/apps` は公開リポジトリ（2026-11-09 に GitHub の API で確認: `"visibility": "public"`）。
  標準ランナー `ubuntu-latest` だけを使う
