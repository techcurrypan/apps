// 書き出した物。手で直さない。元は docs/game-design.md 第 8・9 章と docs/curriculum.md 第 5 章。
// 作り直すとき: npx tsx scripts/game-data.ts（data.test.ts が文書と一致することを確かめる）
import type { CauseRow, GroupRow, MoveRow } from './data-parse.ts';

export const MOVES: readonly MoveRow[] = [
	{
		lesson: 'prg-001',
		name: '値を追って確かめる',
		tests: ['c-var'],
		fixes: ['c-var']
	},
	{
		lesson: 'prg-002',
		name: '境目の値で試す',
		tests: ['c-branch'],
		fixes: ['c-branch']
	},
	{
		lesson: 'prg-003',
		name: '回るごとに値を追う',
		tests: ['c-loop'],
		fixes: ['c-loop']
	},
	{
		lesson: 'prg-004',
		name: '戻り値を確かめる',
		tests: ['c-ret'],
		fixes: ['c-ret']
	},
	{
		lesson: 'prg-005',
		name: '絞り込みの条件を確かめる',
		tests: ['c-filter'],
		fixes: ['c-filter']
	},
	{
		lesson: 'prg-006',
		name: '複製して渡す',
		tests: ['c-ref'],
		fixes: ['c-ref']
	},
	{
		lesson: 'prg-007',
		name: 'エラーを受け止めて知らせる',
		tests: ['c-swallow'],
		fixes: ['c-swallow']
	},
	{
		lesson: 'prg-008',
		name: '待つ所に await を置く',
		tests: ['c-await'],
		fixes: ['c-await']
	},
	{
		lesson: 'prg-009',
		name: 'テストで再現する',
		tests: ['c-regress'],
		fixes: ['c-regress']
	},
	{
		lesson: 'prg-010',
		name: '手数を数える',
		tests: ['c-slowalgo'],
		fixes: ['c-slowalgo']
	},
	{
		lesson: 'prg-011',
		name: '止まる条件を確かめる',
		tests: ['c-recur'],
		fixes: ['c-recur']
	},
	{
		lesson: 'prg-012',
		name: 'バイト列で確かめる',
		tests: ['c-mojibake'],
		fixes: ['c-mojibake']
	},
	{
		lesson: 'lnx-001',
		name: '場所を確かめる',
		tests: ['c-path', 'c-deleted'],
		fixes: ['c-path']
	},
	{
		lesson: 'lnx-002',
		name: '写しから戻す',
		tests: [],
		fixes: ['c-deleted', 'c-oldconf']
	},
	{
		lesson: 'lnx-003',
		name: '中身を読む',
		tests: ['c-oldconf', 'c-redirect'],
		fixes: []
	},
	{
		lesson: 'lnx-004',
		name: '権限を読んで直す',
		tests: ['c-perm'],
		fixes: ['c-perm']
	},
	{
		lesson: 'lnx-005',
		name: '出力の向きを直す',
		tests: [],
		fixes: ['c-redirect']
	},
	{
		lesson: 'lnx-006',
		name: 'ログを絞る',
		tests: ['c-perm', 'c-svcdown', 'c-swallow', 'c-brute'],
		fixes: []
	},
	{
		lesson: 'lnx-007',
		name: 'プロセスを止める',
		tests: ['c-hung'],
		fixes: ['c-hung']
	},
	{
		lesson: 'lnx-008',
		name: '環境変数を確かめる',
		tests: ['c-env'],
		fixes: ['c-env']
	},
	{
		lesson: 'lnx-009',
		name: '終了コードを確かめる',
		tests: ['c-exitcode'],
		fixes: ['c-exitcode']
	},
	{
		lesson: 'lnx-010',
		name: 'サービスの状態を見る',
		tests: ['c-svcdown'],
		fixes: ['c-svcdown']
	},
	{
		lesson: 'lnx-011',
		name: '利用者と組を確かめる',
		tests: ['c-sudo'],
		fixes: ['c-sudo']
	},
	{
		lesson: 'net-001',
		name: '網の部分を比べる',
		tests: ['c-subnet'],
		fixes: ['c-subnet']
	},
	{
		lesson: 'net-002',
		name: '隣の住所を確かめる',
		tests: ['c-dupaddr'],
		fixes: ['c-dupaddr']
	},
	{
		lesson: 'net-003',
		name: '経路を辿る',
		tests: ['c-route'],
		fixes: ['c-route']
	},
	{
		lesson: 'net-004',
		name: '名前を引く',
		tests: ['c-dns'],
		fixes: ['c-dns']
	},
	{
		lesson: 'net-005',
		name: '接続のやり取りを見る',
		tests: ['c-refused'],
		fixes: []
	},
	{
		lesson: 'net-006',
		name: '待ち受けの口を見る',
		tests: ['c-port', 'c-refused'],
		fixes: ['c-port']
	},
	{
		lesson: 'net-007',
		name: '要求と応答を読む',
		tests: ['c-url'],
		fixes: ['c-url']
	},
	{
		lesson: 'net-008',
		name: '状態コードを読む',
		tests: ['c-status', 'c-stale'],
		fixes: []
	},
	{
		lesson: 'net-009',
		name: '証明書の期限を見る',
		tests: ['c-cert'],
		fixes: ['c-cert']
	},
	{
		lesson: 'net-010',
		name: '外からの入口を作る',
		tests: ['c-nat'],
		fixes: ['c-nat']
	},
	{
		lesson: 'net-011',
		name: '配る範囲を確かめる',
		tests: ['c-dhcp'],
		fixes: ['c-dhcp']
	},
	{
		lesson: 'net-012',
		name: '網を分け直す',
		tests: ['c-small'],
		fixes: ['c-small']
	},
	{
		lesson: 'net-013',
		name: 'キャッシュの指定を直す',
		tests: ['c-stale'],
		fixes: ['c-stale']
	},
	{
		lesson: 'sec-001',
		name: '認可を確かめる',
		tests: ['c-authz'],
		fixes: ['c-authz']
	},
	{
		lesson: 'sec-002',
		name: '保存の形を確かめる',
		tests: ['c-plainpw'],
		fixes: ['c-plainpw']
	},
	{
		lesson: 'sec-003',
		name: '鍵の渡し方を変える',
		tests: ['c-keyshare'],
		fixes: ['c-keyshare']
	},
	{
		lesson: 'sec-004',
		name: '証明書の連なりを見る',
		tests: ['c-cert'],
		fixes: []
	},
	{
		lesson: 'sec-005',
		name: 'プレースホルダに直す',
		tests: ['c-sqli'],
		fixes: ['c-sqli']
	},
	{
		lesson: 'sec-006',
		name: '出力を変換する',
		tests: ['c-xss'],
		fixes: ['c-xss']
	},
	{
		lesson: 'sec-007',
		name: 'Cookie の属性を直す',
		tests: ['c-csrf'],
		fixes: ['c-csrf']
	},
	{
		lesson: 'sec-008',
		name: '鍵で入るようにする',
		tests: ['c-sshpw'],
		fixes: ['c-sshpw']
	},
	{
		lesson: 'sec-009',
		name: '規則を並べ直す',
		tests: ['c-fwopen'],
		fixes: ['c-fwopen']
	},
	{
		lesson: 'sec-010',
		name: '権限を絞る',
		tests: ['c-overpriv'],
		fixes: ['c-overpriv']
	},
	{
		lesson: 'sec-011',
		name: '差出人と URL を見る',
		tests: ['c-phish'],
		fixes: []
	},
	{
		lesson: 'sec-012',
		name: '攻撃の跡を探す',
		tests: ['c-brute', 'c-sqli'],
		fixes: []
	},
	{
		lesson: 'sec-013',
		name: '鍵を替えて外す',
		tests: ['c-secret'],
		fixes: ['c-secret']
	},
	{
		lesson: 'db-001',
		name: '列を確かめる',
		tests: ['c-column'],
		fixes: ['c-column']
	},
	{
		lesson: 'db-002',
		name: '条件を確かめる',
		tests: ['c-where'],
		fixes: ['c-where']
	},
	{
		lesson: 'db-003',
		name: '並びを直す',
		tests: ['c-order'],
		fixes: ['c-order']
	},
	{
		lesson: 'db-004',
		name: '集計を確かめる',
		tests: ['c-group'],
		fixes: ['c-group']
	},
	{
		lesson: 'db-005',
		name: 'つなぎ方を確かめる',
		tests: ['c-join'],
		fixes: ['c-join']
	},
	{
		lesson: 'db-006',
		name: '変わった行数を見る',
		tests: ['c-updall'],
		fixes: ['c-updall']
	},
	{
		lesson: 'db-007',
		name: '制約を付ける',
		tests: ['c-dup'],
		fixes: ['c-dup']
	},
	{
		lesson: 'db-008',
		name: '表を分ける',
		tests: ['c-anomaly'],
		fixes: ['c-anomaly']
	},
	{
		lesson: 'db-009',
		name: '計画を見る',
		tests: ['c-noindex'],
		fixes: ['c-noindex']
	},
	{
		lesson: 'db-010',
		name: 'まとめて取り消す',
		tests: ['c-halfwrite'],
		fixes: ['c-halfwrite']
	},
	{
		lesson: 'db-011',
		name: 'NULL を確かめる',
		tests: ['c-null'],
		fixes: ['c-null']
	},
	{
		lesson: 'git-001',
		name: '記録されたかを確かめる',
		tests: ['c-uncommitted'],
		fixes: ['c-uncommitted']
	},
	{
		lesson: 'git-002',
		name: '違いを見る',
		tests: ['c-unknownchange', 'c-badcommit'],
		fixes: []
	},
	{
		lesson: 'git-003',
		name: '記録を打ち消す',
		tests: [],
		fixes: ['c-badcommit', 'c-unknownchange']
	},
	{
		lesson: 'git-004',
		name: '今の枝を確かめる',
		tests: ['c-wrongbranch'],
		fixes: ['c-wrongbranch']
	},
	{
		lesson: 'git-005',
		name: '枝を合わせる',
		tests: ['c-unmerged'],
		fixes: ['c-unmerged']
	},
	{
		lesson: 'git-006',
		name: '衝突を解く',
		tests: ['c-conflict'],
		fixes: ['c-conflict']
	},
	{
		lesson: 'git-007',
		name: '遠くと合わせる',
		tests: ['c-notpushed'],
		fixes: ['c-notpushed']
	},
	{
		lesson: 'git-008',
		name: '土台を積み直す',
		tests: ['c-stalebase'],
		fixes: ['c-stalebase']
	},
	{
		lesson: 'git-009',
		name: '記録しない物を決める',
		tests: ['c-junk'],
		fixes: ['c-junk']
	},
	{
		lesson: 'git-010',
		name: 'レビューの流れを作る',
		tests: ['c-noreview'],
		fixes: ['c-noreview']
	},
	{
		lesson: 'ctr-001',
		name: 'イメージの名前を確かめる',
		tests: ['c-image'],
		fixes: ['c-image']
	},
	{
		lesson: 'ctr-002',
		name: '止まったコンテナを片付ける',
		tests: ['c-dead'],
		fixes: ['c-dead']
	},
	{
		lesson: 'ctr-003',
		name: 'ポートをつなぐ',
		tests: ['c-portmap'],
		fixes: ['c-portmap']
	},
	{
		lesson: 'ctr-004',
		name: 'Dockerfile を直す',
		tests: ['c-dockerfile'],
		fixes: ['c-dockerfile']
	},
	{
		lesson: 'ctr-005',
		name: 'ボリュームにつなぐ',
		tests: ['c-volume'],
		fixes: ['c-volume']
	},
	{
		lesson: 'ctr-006',
		name: '設定を渡す',
		tests: ['c-env'],
		fixes: ['c-env']
	},
	{
		lesson: 'ctr-007',
		name: '定義を確かめる',
		tests: ['c-compose'],
		fixes: ['c-compose']
	},
	{
		lesson: 'ctr-008',
		name: '層の順を直す',
		tests: ['c-slowbuild'],
		fixes: ['c-slowbuild']
	},
	{
		lesson: 'ctr-009',
		name: '同じ網に入れる',
		tests: ['c-ctrnet'],
		fixes: ['c-ctrnet']
	},
	{
		lesson: 'cld-001',
		name: '受け持ちを確かめる',
		tests: ['c-resp'],
		fixes: ['c-resp']
	},
	{
		lesson: 'cld-002',
		name: 'サービスの形を選び直す',
		tests: ['c-svcform'],
		fixes: ['c-svcform']
	},
	{
		lesson: 'cld-003',
		name: '区画を分ける',
		tests: ['c-onezone'],
		fixes: ['c-onezone']
	},
	{
		lesson: 'cld-004',
		name: '網を分け直す',
		tests: ['c-dbpublic'],
		fixes: ['c-dbpublic']
	},
	{
		lesson: 'cld-005',
		name: '公開の範囲を絞る',
		tests: ['c-bucket'],
		fixes: ['c-bucket']
	},
	{
		lesson: 'cld-006',
		name: '台数を求める',
		tests: ['c-overload'],
		fixes: ['c-overload']
	},
	{
		lesson: 'cld-007',
		name: '費用を見積もる',
		tests: ['c-cost'],
		fixes: ['c-cost']
	},
	{
		lesson: 'cld-008',
		name: '方針を絞る',
		tests: ['c-overpriv'],
		fixes: ['c-overpriv']
	},
	{
		lesson: 'cld-009',
		name: '差分を確かめる',
		tests: ['c-drift'],
		fixes: ['c-drift']
	},
	{
		lesson: 'cld-010',
		name: '警報を置く',
		tests: ['c-noalert'],
		fixes: ['c-noalert']
	},
	{
		lesson: 'ci-001',
		name: '自動の検査を置く',
		tests: ['c-noci'],
		fixes: ['c-noci']
	},
	{
		lesson: 'ci-002',
		name: '段を並べ直す',
		tests: ['c-slowfirst'],
		fixes: ['c-slowfirst']
	},
	{
		lesson: 'ci-003',
		name: '設定を直す',
		tests: ['c-ciconf'],
		fixes: ['c-ciconf']
	},
	{
		lesson: 'ci-004',
		name: '失敗のログを読む',
		tests: ['c-cilog', 'c-ciconf'],
		fixes: []
	},
	{
		lesson: 'ci-005',
		name: 'キャッシュを置く',
		tests: ['c-nocache'],
		fixes: ['c-nocache']
	},
	{
		lesson: 'ci-006',
		name: '秘密を置き場へ移す',
		tests: ['c-cisecret'],
		fixes: ['c-cisecret']
	},
	{
		lesson: 'ci-007',
		name: '配信に条件を付ける',
		tests: ['c-baddeploy'],
		fixes: ['c-baddeploy']
	},
	{
		lesson: 'ci-008',
		name: '並べて走らせる',
		tests: ['c-serial'],
		fixes: ['c-serial']
	},
	{
		lesson: 'ai-001',
		name: '期待を整理する',
		tests: ['c-hype'],
		fixes: ['c-hype']
	},
	{
		lesson: 'ai-002',
		name: '想定外の場面を探す',
		tests: ['c-frame'],
		fixes: ['c-frame']
	},
	{
		lesson: 'ai-003',
		name: '探し方を変える',
		tests: ['c-searchblow'],
		fixes: ['c-searchblow']
	},
	{
		lesson: 'ai-004',
		name: '規則を辿る',
		tests: ['c-rulegap'],
		fixes: ['c-rulegap']
	},
	{
		lesson: 'ai-005',
		name: '学び方を見分ける',
		tests: ['c-learntype'],
		fixes: ['c-learntype']
	},
	{
		lesson: 'ai-006',
		name: '直線で予測を置く',
		tests: ['c-nobaseline'],
		fixes: ['c-nobaseline']
	},
	{
		lesson: 'ai-007',
		name: '決定木で分ける',
		tests: ['c-needtree'],
		fixes: ['c-needtree']
	},
	{
		lesson: 'ai-008',
		name: '似た物でまとめる',
		tests: ['c-needcluster'],
		fixes: ['c-needcluster']
	},
	{
		lesson: 'ai-009',
		name: '軸を減らす',
		tests: ['c-manyfeat'],
		fixes: ['c-manyfeat']
	},
	{
		lesson: 'ai-010',
		name: '指標を選び直す',
		tests: ['c-metric'],
		fixes: ['c-metric']
	},
	{
		lesson: 'ai-011',
		name: '訓練と検証を比べる',
		tests: ['c-overfit'],
		fixes: []
	},
	{
		lesson: 'ai-012',
		name: '報酬で学ばせる',
		tests: ['c-needrl'],
		fixes: ['c-needrl']
	},
	{
		lesson: 'ai-013',
		name: '出力を計算で確かめる',
		tests: ['c-nnout'],
		fixes: ['c-nnout']
	},
	{
		lesson: 'ai-014',
		name: '学習率を確かめる',
		tests: ['c-lr'],
		fixes: ['c-lr']
	},
	{
		lesson: 'ai-015',
		name: '勾配を辿る',
		tests: ['c-grad'],
		fixes: ['c-grad']
	},
	{
		lesson: 'ai-016',
		name: '最適化手法を替える',
		tests: ['c-optslow'],
		fixes: ['c-optslow']
	},
	{
		lesson: 'ai-037',
		name: '正則化を足す',
		tests: [],
		fixes: ['c-overfit']
	},
	{
		lesson: 'ai-017',
		name: '畳み込みを使う',
		tests: ['c-imgfeat'],
		fixes: ['c-imgfeat']
	},
	{
		lesson: 'ai-018',
		name: '正規化とスキップを足す',
		tests: ['c-deepunstable'],
		fixes: ['c-deepunstable']
	},
	{
		lesson: 'ai-019',
		name: '順番を覚える層にする',
		tests: ['c-seq'],
		fixes: ['c-seq']
	},
	{
		lesson: 'ai-020',
		name: '注意の仕組みにする',
		tests: ['c-longctx'],
		fixes: ['c-longctx']
	},
	{
		lesson: 'ai-021',
		name: '画像を水増しする',
		tests: ['c-fewimg'],
		fixes: ['c-fewimg']
	},
	{
		lesson: 'ai-022',
		name: '出力の形を選ぶ',
		tests: ['c-visiontask'],
		fixes: ['c-visiontask']
	},
	{
		lesson: 'ai-023',
		name: '次の語の確率を見る',
		tests: ['c-halluc'],
		fixes: []
	},
	{
		lesson: 'ai-024',
		name: '音声を文字にして渡す',
		tests: ['c-voice'],
		fixes: ['c-voice']
	},
	{
		lesson: 'ai-025',
		name: '深層強化学習を当てる',
		tests: ['c-control'],
		fixes: ['c-control']
	},
	{
		lesson: 'ai-026',
		name: '生成物の出所を確かめる',
		tests: ['c-genmisuse'],
		fixes: []
	},
	{
		lesson: 'ai-027',
		name: '学んだ網を使い回す',
		tests: ['c-littledata'],
		fixes: ['c-littledata']
	},
	{
		lesson: 'ai-028',
		name: '寄与を示す',
		tests: ['c-blackbox'],
		fixes: ['c-blackbox']
	},
	{
		lesson: 'ai-029',
		name: '量子化で軽くする',
		tests: ['c-toobig'],
		fixes: ['c-toobig']
	},
	{
		lesson: 'ai-030',
		name: '企画を立て直す',
		tests: ['c-noplan'],
		fixes: ['c-noplan', 'c-hype']
	},
	{
		lesson: 'ai-031',
		name: 'データを整える',
		tests: ['c-leak'],
		fixes: ['c-leak']
	},
	{
		lesson: 'ai-032',
		name: '個人情報の区分を確かめる',
		tests: ['c-personal'],
		fixes: ['c-personal']
	},
	{
		lesson: 'ai-033',
		name: '権利を確かめる',
		tests: ['c-copyright'],
		fixes: ['c-copyright']
	},
	{
		lesson: 'ai-034',
		name: '契約で決める',
		tests: ['c-contract'],
		fixes: ['c-contract']
	},
	{
		lesson: 'ai-035',
		name: '偏りを確かめる',
		tests: ['c-bias'],
		fixes: ['c-bias']
	},
	{
		lesson: 'ai-036',
		name: '備えの体制を作る',
		tests: ['c-nogov'],
		fixes: ['c-nogov', 'c-genmisuse', 'c-halluc']
	},
	{
		lesson: 'sta-001',
		name: '尺度を確かめる',
		tests: ['c-scale'],
		fixes: ['c-scale']
	},
	{
		lesson: 'sta-002',
		name: '分布の形を見る',
		tests: ['c-shape'],
		fixes: ['c-shape']
	},
	{
		lesson: 'sta-003',
		name: '中央値で示す',
		tests: ['c-outmean'],
		fixes: ['c-outmean']
	},
	{
		lesson: 'sta-004',
		name: '散らばりを測る',
		tests: ['c-spread'],
		fixes: ['c-spread']
	},
	{
		lesson: 'sta-005',
		name: '箱ひげで外れ値を見る',
		tests: ['c-outlier', 'c-outmean'],
		fixes: ['c-outlier']
	},
	{
		lesson: 'sta-006',
		name: '標準化して比べる',
		tests: ['c-unit'],
		fixes: ['c-unit']
	},
	{
		lesson: 'sta-007',
		name: '季節の動きを除く',
		tests: ['c-season'],
		fixes: ['c-season']
	},
	{
		lesson: 'sta-008',
		name: '相関を測る',
		tests: ['c-corr'],
		fixes: ['c-corr']
	},
	{
		lesson: 'sta-009',
		name: '組に分けて数える',
		tests: ['c-groupmix'],
		fixes: ['c-groupmix']
	},
	{
		lesson: 'sta-010',
		name: '回帰の直線で予測する',
		tests: ['c-forecast'],
		fixes: ['c-forecast']
	},
	{
		lesson: 'sta-011',
		name: '実験に組み直す',
		tests: ['c-confound'],
		fixes: ['c-confound']
	},
	{
		lesson: 'sta-012',
		name: '取り方を直す',
		tests: ['c-samplebias'],
		fixes: ['c-samplebias']
	},
	{
		lesson: 'sta-013',
		name: '数え上げて確かめる',
		tests: ['c-probread'],
		fixes: ['c-probread']
	},
	{
		lesson: 'sta-014',
		name: 'ベイズで確かめる',
		tests: ['c-baserate'],
		fixes: ['c-baserate']
	},
	{
		lesson: 'sta-015',
		name: '期待値で比べる',
		tests: ['c-expect'],
		fixes: ['c-expect']
	},
	{
		lesson: 'sta-016',
		name: '二項分布で確かめる',
		tests: ['c-binom'],
		fixes: ['c-binom']
	},
	{
		lesson: 'sta-017',
		name: 'ポアソン分布で確かめる',
		tests: ['c-rare'],
		fixes: ['c-rare']
	},
	{
		lesson: 'sta-018',
		name: '正規分布で範囲を求める',
		tests: ['c-normal'],
		fixes: ['c-normal']
	},
	{
		lesson: 'sta-019',
		name: '標本の大きさを確かめる',
		tests: ['c-smalln'],
		fixes: ['c-smalln']
	},
	{
		lesson: 'sta-020',
		name: '分布の表で境を読む',
		tests: ['c-smalln', 'c-chance'],
		fixes: []
	},
	{
		lesson: 'sta-021',
		name: '不偏分散で求め直す',
		tests: ['c-biasedest'],
		fixes: ['c-biasedest']
	},
	{
		lesson: 'sta-022',
		name: '信頼区間を付ける',
		tests: ['c-nointerval'],
		fixes: ['c-nointerval']
	},
	{
		lesson: 'sta-023',
		name: '比率の区間を付ける',
		tests: ['c-rateint'],
		fixes: ['c-rateint']
	},
	{
		lesson: 'sta-024',
		name: '検定で確かめる',
		tests: ['c-chance'],
		fixes: ['c-chance']
	},
	{
		lesson: 'sta-025',
		name: '平均の差を検定する',
		tests: ['c-chance'],
		fixes: []
	},
	{
		lesson: 'sta-026',
		name: '比率の差を検定する',
		tests: ['c-ratediff'],
		fixes: ['c-ratediff']
	},
	{
		lesson: 'sta-027',
		name: '独立性を検定する',
		tests: ['c-indep'],
		fixes: ['c-indep']
	},
	{
		lesson: 'sta-028',
		name: '当てはまりを確かめる',
		tests: ['c-weakfit'],
		fixes: ['c-weakfit']
	},
	{
		lesson: 'sta-029',
		name: '分散分析で比べる',
		tests: ['c-multigroup'],
		fixes: ['c-multigroup']
	}
];

export const CAUSES: readonly CauseRow[] = [
	{
		id: 'c-var',
		label: '似た名前の変数を取り違えている',
		restartable: false
	},
	{
		id: 'c-branch',
		label: '条件の境目（以上と超える）が違う',
		restartable: false
	},
	{
		id: 'c-loop',
		label: '繰り返しの回数が 1 つずれている',
		restartable: false
	},
	{
		id: 'c-ret',
		label: '関数の戻り値を使っていない',
		restartable: false
	},
	{
		id: 'c-filter',
		label: '絞り込みの条件が逆',
		restartable: false
	},
	{
		id: 'c-ref',
		label: '同じ物を指す変数から書き換えている',
		restartable: false
	},
	{
		id: 'c-swallow',
		label: 'エラーを受け止めて黙っている',
		restartable: false
	},
	{
		id: 'c-await',
		label: '結果を待たずに次へ進んでいる',
		restartable: false
	},
	{
		id: 'c-regress',
		label: '直した所が別の所を壊した',
		restartable: false
	},
	{
		id: 'c-slowalgo',
		label: '件数の 2 乗で手数が増える処理',
		restartable: false
	},
	{
		id: 'c-recur',
		label: '再帰が止まらない',
		restartable: true
	},
	{
		id: 'c-mojibake',
		label: '文字の符号の取り違え',
		restartable: false
	},
	{
		id: 'c-path',
		label: '置き場所を取り違えている',
		restartable: false
	},
	{
		id: 'c-deleted',
		label: 'ファイルを消した・上書きした',
		restartable: false
	},
	{
		id: 'c-oldconf',
		label: '設定ファイルの中身が古い',
		restartable: false
	},
	{
		id: 'c-perm',
		label: '読み書きの権限が足りない',
		restartable: false
	},
	{
		id: 'c-redirect',
		label: '出力を上書きで消している',
		restartable: false
	},
	{
		id: 'c-hung',
		label: '止まったプロセスが居座っている',
		restartable: true
	},
	{
		id: 'c-env',
		label: '要る環境変数が無い',
		restartable: false
	},
	{
		id: 'c-exitcode',
		label: '失敗を終了コードで見逃している',
		restartable: false
	},
	{
		id: 'c-svcdown',
		label: 'サービスが止まっている',
		restartable: true
	},
	{
		id: 'c-sudo',
		label: '権限を持つ利用者でない',
		restartable: false
	},
	{
		id: 'c-subnet',
		label: '違う網のアドレスを設定している',
		restartable: false
	},
	{
		id: 'c-dupaddr',
		label: '同じアドレスの機械が 2 台ある',
		restartable: false
	},
	{
		id: 'c-route',
		label: '経路の設定が違う',
		restartable: false
	},
	{
		id: 'c-dns',
		label: '名前の登録が古い住所を指している',
		restartable: false
	},
	{
		id: 'c-refused',
		label: '相手が待ち受けていない',
		restartable: false
	},
	{
		id: 'c-port',
		label: '口が閉じている・違う口を使っている',
		restartable: false
	},
	{
		id: 'c-url',
		label: '要求の宛先や方法が違う',
		restartable: false
	},
	{
		id: 'c-status',
		label: '相手の中で失敗している（500 番台）',
		restartable: false
	},
	{
		id: 'c-cert',
		label: '証明書の期限が切れている',
		restartable: false
	},
	{
		id: 'c-nat',
		label: '外から内へ入る道が無い',
		restartable: false
	},
	{
		id: 'c-dhcp',
		label: '配るアドレスが尽きた',
		restartable: false
	},
	{
		id: 'c-small',
		label: '網が小さくアドレスが足りない',
		restartable: false
	},
	{
		id: 'c-stale',
		label: '古い応答を使い回している',
		restartable: false
	},
	{
		id: 'c-uncommitted',
		label: '変更を記録していない',
		restartable: false
	},
	{
		id: 'c-unknownchange',
		label: '誰かの変更が混ざって壊れた',
		restartable: false
	},
	{
		id: 'c-badcommit',
		label: '壊す記録が入った',
		restartable: false
	},
	{
		id: 'c-wrongbranch',
		label: '違う枝で作業した',
		restartable: false
	},
	{
		id: 'c-unmerged',
		label: '枝を合わせ忘れた',
		restartable: false
	},
	{
		id: 'c-conflict',
		label: '衝突が残ったまま',
		restartable: false
	},
	{
		id: 'c-notpushed',
		label: '遠くへ送っていない',
		restartable: false
	},
	{
		id: 'c-stalebase',
		label: '古い土台の上の枝',
		restartable: false
	},
	{
		id: 'c-junk',
		label: '要らない物を記録している',
		restartable: false
	},
	{
		id: 'c-noreview',
		label: '見直しなしで入った',
		restartable: false
	},
	{
		id: 'c-authz',
		label: '誰が何をしてよいかを確かめていない',
		restartable: false
	},
	{
		id: 'c-plainpw',
		label: '合言葉をそのまま保存している',
		restartable: false
	},
	{
		id: 'c-keyshare',
		label: '鍵の渡し方が危うい',
		restartable: false
	},
	{
		id: 'c-sqli',
		label: '入力が SQL に混ざる',
		restartable: false
	},
	{
		id: 'c-xss',
		label: '入力が頁の中で動く',
		restartable: false
	},
	{
		id: 'c-csrf',
		label: '他のサイトから勝手に要求される',
		restartable: false
	},
	{
		id: 'c-sshpw',
		label: '合言葉で SSH に入れる',
		restartable: false
	},
	{
		id: 'c-fwopen',
		label: '要らない口が開いている',
		restartable: false
	},
	{
		id: 'c-overpriv',
		label: '要らない権限まで渡している',
		restartable: false
	},
	{
		id: 'c-phish',
		label: 'だましのメールで入られた',
		restartable: false
	},
	{
		id: 'c-brute',
		label: '合言葉を総当たりされている',
		restartable: false
	},
	{
		id: 'c-secret',
		label: '鍵がリポジトリに入っている',
		restartable: false
	},
	{
		id: 'c-column',
		label: '違う列を見ている',
		restartable: false
	},
	{
		id: 'c-where',
		label: '絞る条件が違う',
		restartable: false
	},
	{
		id: 'c-order',
		label: '並べ方が違う',
		restartable: false
	},
	{
		id: 'c-group',
		label: '集計の組の取り方が違う',
		restartable: false
	},
	{
		id: 'c-join',
		label: 'つなぐと行が消える',
		restartable: false
	},
	{
		id: 'c-updall',
		label: '条件なしで全行を変えた',
		restartable: false
	},
	{
		id: 'c-dup',
		label: '同じ行が 2 度入った',
		restartable: false
	},
	{
		id: 'c-anomaly',
		label: '同じ事を 2 か所に持ち食い違った',
		restartable: false
	},
	{
		id: 'c-noindex',
		label: '索引が無く全行を見ている',
		restartable: false
	},
	{
		id: 'c-halfwrite',
		label: '変更が途中で止まった',
		restartable: false
	},
	{
		id: 'c-null',
		label: '値の無い行で数が合わない',
		restartable: false
	},
	{
		id: 'c-image',
		label: 'イメージの名前や版が違う',
		restartable: false
	},
	{
		id: 'c-dead',
		label: '止まったコンテナが残っている',
		restartable: true
	},
	{
		id: 'c-portmap',
		label: 'ポートをつないでいない',
		restartable: false
	},
	{
		id: 'c-dockerfile',
		label: '作り方の定義が違う',
		restartable: false
	},
	{
		id: 'c-volume',
		label: 'データを残す所につないでいない',
		restartable: false
	},
	{
		id: 'c-compose',
		label: 'まとめて動かす定義が違う',
		restartable: false
	},
	{
		id: 'c-slowbuild',
		label: '毎回全部を作り直している',
		restartable: false
	},
	{
		id: 'c-ctrnet',
		label: 'コンテナが違う網にいる',
		restartable: false
	},
	{
		id: 'c-resp',
		label: '受け持ちを事業者任せと思っていた',
		restartable: false
	},
	{
		id: 'c-svcform',
		label: '合わない形のサービスを借りている',
		restartable: false
	},
	{
		id: 'c-onezone',
		label: '1 つの区画にしか置いていない',
		restartable: false
	},
	{
		id: 'c-dbpublic',
		label: 'データベースが公開の網にある',
		restartable: false
	},
	{
		id: 'c-bucket',
		label: '倉庫が誰でも読める',
		restartable: false
	},
	{
		id: 'c-overload',
		label: '台数が足りない',
		restartable: true
	},
	{
		id: 'c-cost',
		label: '使わない物に費用がかかっている',
		restartable: false
	},
	{
		id: 'c-drift',
		label: '手で変えて定義とずれた',
		restartable: false
	},
	{
		id: 'c-noalert',
		label: '止まっても知らせが来ない',
		restartable: false
	},
	{
		id: 'c-noci',
		label: '検査が自動で走らない',
		restartable: false
	},
	{
		id: 'c-slowfirst',
		label: '遅い段が先にある',
		restartable: false
	},
	{
		id: 'c-ciconf',
		label: '検査の設定が違う',
		restartable: false
	},
	{
		id: 'c-cilog',
		label: '失敗の原因がログに埋もれている',
		restartable: false
	},
	{
		id: 'c-nocache',
		label: '毎回入れ直している',
		restartable: false
	},
	{
		id: 'c-cisecret',
		label: '秘密を設定に直に書いている',
		restartable: false
	},
	{
		id: 'c-baddeploy',
		label: '落ちた物まで配っている',
		restartable: false
	},
	{
		id: 'c-serial',
		label: '全部を順に走らせている',
		restartable: false
	},
	{
		id: 'c-hype',
		label: '何でもできると期待している',
		restartable: false
	},
	{
		id: 'c-frame',
		label: '想定外の場面で止まる',
		restartable: false
	},
	{
		id: 'c-searchblow',
		label: '道順を総当たりで探している',
		restartable: false
	},
	{
		id: 'c-rulegap',
		label: '規則に漏れがある',
		restartable: false
	},
	{
		id: 'c-learntype',
		label: '学び方を取り違えている',
		restartable: false
	},
	{
		id: 'c-nobaseline',
		label: '比べる土台の予測が無い',
		restartable: false
	},
	{
		id: 'c-needtree',
		label: '分け方の規則が要る',
		restartable: false
	},
	{
		id: 'c-needcluster',
		label: '似た物どうしをまとめる必要がある',
		restartable: false
	},
	{
		id: 'c-manyfeat',
		label: '項目が多すぎる',
		restartable: false
	},
	{
		id: 'c-metric',
		label: '評価の指標が合っていない',
		restartable: false
	},
	{
		id: 'c-overfit',
		label: '訓練のデータに合わせすぎている',
		restartable: false
	},
	{
		id: 'c-needrl',
		label: '試して報酬から学ぶ必要がある',
		restartable: false
	},
	{
		id: 'c-nnout',
		label: '網の出力を確かめていない',
		restartable: false
	},
	{
		id: 'c-lr',
		label: '学習率が大きすぎる',
		restartable: false
	},
	{
		id: 'c-grad',
		label: '勾配が前の層へ届いていない',
		restartable: false
	},
	{
		id: 'c-optslow',
		label: '学習の進みが遅い',
		restartable: false
	},
	{
		id: 'c-imgfeat',
		label: '画像の形の特徴を捉えていない',
		restartable: false
	},
	{
		id: 'c-deepunstable',
		label: '深い網の値が崩れる',
		restartable: false
	},
	{
		id: 'c-seq',
		label: '並びの順を無視している',
		restartable: false
	},
	{
		id: 'c-longctx',
		label: '遠くの語を見ていない',
		restartable: false
	},
	{
		id: 'c-fewimg',
		label: '画像の数が少ない',
		restartable: false
	},
	{
		id: 'c-visiontask',
		label: '求める出力の形が違う',
		restartable: false
	},
	{
		id: 'c-halluc',
		label: '事実と違う文をもっともらしく作る',
		restartable: false
	},
	{
		id: 'c-voice',
		label: '音声の入力を扱えない',
		restartable: false
	},
	{
		id: 'c-control',
		label: '動かし方を試して学ぶ必要がある',
		restartable: false
	},
	{
		id: 'c-genmisuse',
		label: '作った物の出所を示していない',
		restartable: false
	},
	{
		id: 'c-littledata',
		label: '学ばせるデータが少ない',
		restartable: false
	},
	{
		id: 'c-blackbox',
		label: '判断の理由を示せない',
		restartable: false
	},
	{
		id: 'c-toobig',
		label: 'モデルが大きく店の機械で動かない',
		restartable: false
	},
	{
		id: 'c-noplan',
		label: '目的が決まっていない',
		restartable: false
	},
	{
		id: 'c-leak',
		label: '答えが混ざった列がある',
		restartable: false
	},
	{
		id: 'c-personal',
		label: '個人の情報を同意なく使う',
		restartable: false
	},
	{
		id: 'c-copyright',
		label: '他人の作った物の扱いを確かめていない',
		restartable: false
	},
	{
		id: 'c-contract',
		label: '契約で決めていない事がある',
		restartable: false
	},
	{
		id: 'c-bias',
		label: 'データの偏りで不公平になる',
		restartable: false
	},
	{
		id: 'c-nogov',
		label: '悪用への備えが無い',
		restartable: false
	},
	{
		id: 'c-scale',
		label: '順の数を平均している',
		restartable: false
	},
	{
		id: 'c-shape',
		label: '分布の形を見ていない',
		restartable: false
	},
	{
		id: 'c-outmean',
		label: '外れ値に平均が引っ張られている',
		restartable: false
	},
	{
		id: 'c-spread',
		label: '散らばりを見ていない',
		restartable: false
	},
	{
		id: 'c-outlier',
		label: '外れ値が混ざっている',
		restartable: false
	},
	{
		id: 'c-unit',
		label: '単位の違う値を比べている',
		restartable: false
	},
	{
		id: 'c-season',
		label: '季節の動きを見ていない',
		restartable: false
	},
	{
		id: 'c-corr',
		label: '2 つの量の関係を見ていない',
		restartable: false
	},
	{
		id: 'c-groupmix',
		label: '組を混ぜて割合を出している',
		restartable: false
	},
	{
		id: 'c-forecast',
		label: '予測の直線が要る',
		restartable: false
	},
	{
		id: 'c-confound',
		label: '観察だけで原因と決めた',
		restartable: false
	},
	{
		id: 'c-samplebias',
		label: '標本の取り方が偏っている',
		restartable: false
	},
	{
		id: 'c-probread',
		label: '確率を読み違えている',
		restartable: false
	},
	{
		id: 'c-baserate',
		label: 'もとの割合を見落としている',
		restartable: false
	},
	{
		id: 'c-expect',
		label: '期待値で比べていない',
		restartable: false
	},
	{
		id: 'c-binom',
		label: '回数の確率を読み違えている',
		restartable: false
	},
	{
		id: 'c-rare',
		label: 'まれな出来事の回数を読み違えている',
		restartable: false
	},
	{
		id: 'c-normal',
		label: '普通の範囲を読み違えている',
		restartable: false
	},
	{
		id: 'c-smalln',
		label: '標本が小さく揺れている',
		restartable: false
	},
	{
		id: 'c-biasedest',
		label: '偏った推定を使っている',
		restartable: false
	},
	{
		id: 'c-nointerval',
		label: '値の幅を示していない',
		restartable: false
	},
	{
		id: 'c-rateint',
		label: '割合の幅を示していない',
		restartable: false
	},
	{
		id: 'c-chance',
		label: '偶然の揺れを差と見ている',
		restartable: false
	},
	{
		id: 'c-ratediff',
		label: '割合の差を確かめていない',
		restartable: false
	},
	{
		id: 'c-indep',
		label: '関係の有無を確かめていない',
		restartable: false
	},
	{
		id: 'c-weakfit',
		label: '当てはまりの弱い直線で予測している',
		restartable: false
	},
	{
		id: 'c-multigroup',
		label: '3 つ以上の組を 2 つずつ比べている',
		restartable: false
	}
];

export const GROUPS: readonly GroupRow[] = [
	{
		id: 'G01',
		week: 1,
		client: 'パン屋の店主',
		symptom: '注文の合計が合わない',
		weight: 1,
		doubt: 1,
		causes: ['c-var', 'c-branch', 'c-loop', 'c-ret', 'c-filter', 'c-ref']
	},
	{
		id: 'G02',
		week: 1,
		client: 'パン屋の店主',
		symptom: '注文の頁が途中で止まる',
		weight: 1,
		doubt: 0,
		causes: ['c-swallow', 'c-await', 'c-recur', 'c-env', 'c-mojibake']
	},
	{
		id: 'G03',
		week: 1,
		client: 'パン屋の店主',
		symptom: '注文の頁が開かない',
		weight: 2,
		doubt: 1,
		causes: ['c-dns', 'c-port', 'c-svcdown', 'c-refused', 'c-cert', 'c-route']
	},
	{
		id: 'G04',
		week: 1,
		client: 'パン屋の店主',
		symptom: '注文の頁が遅い',
		weight: 1,
		doubt: 1,
		causes: ['c-slowalgo', 'c-noindex', 'c-overload', 'c-hung']
	},
	{
		id: 'G05',
		week: 1,
		client: 'パン屋の店主',
		symptom: '店のパソコンから共有に入れない',
		weight: 1,
		doubt: 0,
		causes: ['c-perm', 'c-sudo', 'c-path', 'c-subnet', 'c-dupaddr', 'c-dhcp']
	},
	{
		id: 'G06',
		week: 1,
		client: 'パン屋の店主',
		symptom: '昨日の直しが見当たらない',
		weight: 1,
		doubt: 0,
		causes: ['c-uncommitted', 'c-wrongbranch', 'c-unmerged', 'c-notpushed', 'c-deleted']
	},
	{
		id: 'G07',
		week: 1,
		client: 'パン屋の店主',
		symptom: '直したら別の所が壊れた',
		weight: 2,
		doubt: 1,
		causes: [
			'c-regress',
			'c-unknownchange',
			'c-badcommit',
			'c-conflict',
			'c-stalebase',
			'c-noreview'
		]
	},
	{
		id: 'G08',
		week: 1,
		client: 'パン屋の店主',
		symptom: '頁が古い・字が化ける',
		weight: 1,
		doubt: 0,
		causes: ['c-stale', 'c-mojibake', 'c-status', 'c-url']
	},
	{
		id: 'G09',
		week: 1,
		client: 'パン屋の店主',
		symptom: '夜の集計が動かない',
		weight: 1,
		doubt: 0,
		causes: ['c-exitcode', 'c-hung', 'c-redirect', 'c-env', 'c-oldconf']
	},
	{
		id: 'G10',
		week: 1,
		client: 'パン屋の店主',
		symptom: '機械を増やしたらつながらない',
		weight: 1,
		doubt: 1,
		causes: ['c-small', 'c-dhcp', 'c-nat', 'c-dupaddr']
	},
	{
		id: 'G11',
		week: 1,
		client: 'パン屋の店主',
		symptom: '記録を取ってくるのが遅い',
		weight: 1,
		doubt: 0,
		causes: ['c-junk', 'c-notpushed', 'c-stalebase', 'c-uncommitted']
	},
	{
		id: 'G12',
		week: 2,
		client: '診療所の受付',
		symptom: '予約の数が合わない',
		weight: 1,
		doubt: 1,
		causes: ['c-where', 'c-group', 'c-join', 'c-null', 'c-column', 'c-dup']
	},
	{
		id: 'G13',
		week: 2,
		client: '診療所の受付',
		symptom: '予約の中身が書き換わった',
		weight: 2,
		doubt: 1,
		causes: ['c-updall', 'c-halfwrite', 'c-anomaly', 'c-sqli', 'c-authz', 'c-overpriv']
	},
	{
		id: 'G14',
		week: 2,
		client: '診療所の受付',
		symptom: '知らない人が入った形跡がある',
		weight: 2,
		doubt: 2,
		causes: ['c-brute', 'c-sshpw', 'c-phish', 'c-fwopen', 'c-secret', 'c-plainpw', 'c-keyshare']
	},
	{
		id: 'G15',
		week: 2,
		client: '診療所の受付',
		symptom: '予約の頁に変な物が出る',
		weight: 2,
		doubt: 1,
		causes: ['c-xss', 'c-csrf', 'c-sqli', 'c-authz']
	},
	{
		id: 'G16',
		week: 2,
		client: '診療所の受付',
		symptom: '一覧が遅い・並びが変',
		weight: 1,
		doubt: 0,
		causes: ['c-noindex', 'c-order', 'c-slowalgo', 'c-join']
	},
	{
		id: 'G17',
		week: 2,
		client: '診療所の受付',
		symptom: '患者の情報を AI で使いたい',
		weight: 2,
		doubt: 2,
		causes: ['c-personal', 'c-copyright', 'c-contract', 'c-bias', 'c-nogov', 'c-genmisuse']
	},
	{
		id: 'G18',
		week: 3,
		client: '運送屋の配車係',
		symptom: '売上が落ちた理由を知りたい',
		weight: 1,
		doubt: 1,
		causes: [
			'c-season',
			'c-chance',
			'c-outmean',
			'c-groupmix',
			'c-samplebias',
			'c-confound',
			'c-multigroup'
		]
	},
	{
		id: 'G19',
		week: 3,
		client: '運送屋の配車係',
		symptom: '配達の時間がばらつく',
		weight: 1,
		doubt: 0,
		causes: ['c-spread', 'c-outlier', 'c-shape', 'c-unit', 'c-normal', 'c-biasedest']
	},
	{
		id: 'G20',
		week: 3,
		client: '運送屋の配車係',
		symptom: 'お客の声の読み方が分からない',
		weight: 1,
		doubt: 1,
		causes: ['c-scale', 'c-indep', 'c-ratediff', 'c-nointerval', 'c-rateint', 'c-samplebias']
	},
	{
		id: 'G21',
		week: 3,
		client: '運送屋の配車係',
		symptom: '破損の検査が当てにならない',
		weight: 1,
		doubt: 1,
		causes: ['c-baserate', 'c-probread', 'c-metric', 'c-binom', 'c-rare', 'c-expect']
	},
	{
		id: 'G22',
		week: 3,
		client: '運送屋の配車係',
		symptom: '荷の量を予測したい',
		weight: 2,
		doubt: 1,
		causes: ['c-forecast', 'c-weakfit', 'c-corr', 'c-nobaseline', 'c-seq', 'c-smalln']
	},
	{
		id: 'G23',
		week: 3,
		client: '運送屋の配車係',
		symptom: '予測のモデルが当たらない',
		weight: 2,
		doubt: 1,
		causes: ['c-overfit', 'c-lr', 'c-optslow', 'c-grad', 'c-deepunstable', 'c-leak', 'c-nnout']
	},
	{
		id: 'G24',
		week: 3,
		client: '運送屋の配車係',
		symptom: '荷物の写真で仕分けたい',
		weight: 2,
		doubt: 1,
		causes: ['c-imgfeat', 'c-fewimg', 'c-littledata', 'c-visiontask', 'c-toobig', 'c-needtree']
	},
	{
		id: 'G25',
		week: 3,
		client: '運送屋の配車係',
		symptom: '配達の区域と道順を決めたい',
		weight: 1,
		doubt: 0,
		causes: ['c-needcluster', 'c-searchblow', 'c-manyfeat', 'c-needrl', 'c-control']
	},
	{
		id: 'G26',
		week: 3,
		client: '運送屋の配車係',
		symptom: '配車を AI に任せたい',
		weight: 1,
		doubt: 2,
		causes: ['c-hype', 'c-frame', 'c-rulegap', 'c-learntype', 'c-noplan', 'c-blackbox']
	},
	{
		id: 'G27',
		week: 3,
		client: '運送屋の配車係',
		symptom: '問い合わせに AI で答えたい',
		weight: 2,
		doubt: 1,
		causes: ['c-halluc', 'c-longctx', 'c-voice', 'c-genmisuse', 'c-personal']
	},
	{
		id: 'G28',
		week: 4,
		client: '組合の事務長',
		symptom: '共同の予約の仕組みが動かない',
		weight: 2,
		doubt: 0,
		causes: ['c-image', 'c-dead', 'c-portmap', 'c-dockerfile', 'c-compose', 'c-ctrnet', 'c-env']
	},
	{
		id: 'G29',
		week: 4,
		client: '組合の事務長',
		symptom: '作り直したらデータが消えた',
		weight: 2,
		doubt: 1,
		causes: ['c-volume', 'c-halfwrite', 'c-drift', 'c-onezone']
	},
	{
		id: 'G30',
		week: 4,
		client: '組合の事務長',
		symptom: '夜に止まって朝まで気付かない',
		weight: 2,
		doubt: 1,
		causes: ['c-noalert', 'c-onezone', 'c-overload', 'c-svcdown', 'c-dead']
	},
	{
		id: 'G31',
		week: 4,
		client: '組合の事務長',
		symptom: '月の請求が膨らんだ',
		weight: 1,
		doubt: 1,
		causes: ['c-cost', 'c-svcform', 'c-resp', 'c-serial', 'c-overload']
	},
	{
		id: 'G32',
		week: 4,
		client: '組合の事務長',
		symptom: '見えてはいけない物が見える',
		weight: 2,
		doubt: 2,
		causes: ['c-dbpublic', 'c-bucket', 'c-overpriv', 'c-fwopen', 'c-cisecret', 'c-secret']
	},
	{
		id: 'G33',
		week: 4,
		client: '組合の事務長',
		symptom: '壊れた物が配信された',
		weight: 2,
		doubt: 1,
		causes: ['c-noci', 'c-baddeploy', 'c-ciconf', 'c-cilog', 'c-slowfirst', 'c-noreview']
	},
	{
		id: 'G34',
		week: 4,
		client: '組合の事務長',
		symptom: '検査が遅い',
		weight: 1,
		doubt: 0,
		causes: ['c-nocache', 'c-serial', 'c-slowbuild', 'c-slowfirst']
	}
];

export const TITLES: Readonly<Record<string, string>> = {
	'prg-001': '値と変数',
	'prg-002': '条件で道を分ける',
	'prg-003': '繰り返す',
	'prg-004': '関数に分ける',
	'prg-005': '配列を変換する',
	'prg-006': '同じ物を指す変数',
	'prg-007': '例外を受け止める',
	'prg-008': '非同期の順番',
	'prg-009': 'テストを書く',
	'prg-010': '手数を数える',
	'prg-011': '再帰',
	'prg-012': '文字とバイト',
	'lnx-001': 'ディレクトリを移動する',
	'lnx-002': 'ファイルを作り、写し、消す',
	'lnx-003': '中身を読む',
	'lnx-004': '権限を読み、変える',
	'lnx-005': 'パイプとリダイレクト',
	'lnx-006': 'grep で探す',
	'lnx-007': 'プロセスを止める',
	'lnx-008': '環境変数と PATH',
	'lnx-009': 'シェルスクリプト',
	'lnx-010': 'サービスとログ',
	'lnx-011': '利用者と sudo',
	'net-001': 'IP アドレスを読む',
	'net-002': '同じ網の中で届ける',
	'net-003': '経路を選ぶ',
	'net-004': '名前から住所を引く',
	'net-005': 'TCP で接続する',
	'net-006': 'ポートと UDP',
	'net-007': 'HTTP のやり取り',
	'net-008': '状態コードとヘッダ',
	'net-009': 'HTTPS と TLS',
	'net-010': 'NAT とプライベートアドレス',
	'net-011': 'DHCP でアドレスをもらう',
	'net-012': 'サブネットに分ける',
	'net-013': 'HTTP のキャッシュ',
	'sec-001': '認証と認可',
	'sec-002': 'パスワードを守って保存する',
	'sec-003': '共通鍵と公開鍵',
	'sec-004': '署名と証明書',
	'sec-005': 'SQL インジェクション',
	'sec-006': 'XSS',
	'sec-007': 'CSRF と Cookie',
	'sec-008': 'SSH の鍵で入る',
	'sec-009': 'ファイアウォールの規則',
	'sec-010': '最小権限',
	'sec-011': 'だます攻撃を見抜く',
	'sec-012': 'ログから攻撃を見つける',
	'sec-013': '秘密情報を置かない',
	'db-001': '表から取り出す',
	'db-002': '条件で絞る',
	'db-003': '並べて切る',
	'db-004': '集計する',
	'db-005': '表をつなぐ',
	'db-006': '行を変える',
	'db-007': '主キーと制約',
	'db-008': '表を分ける',
	'db-009': '索引で速くする',
	'db-010': 'トランザクション',
	'db-011': 'NULL の扱い',
	'git-001': 'add と commit で記録を積む',
	'git-002': '違いを見る',
	'git-003': '変更を取り消す',
	'git-004': '枝を作る',
	'git-005': '枝を合わせる',
	'git-006': '衝突を解く',
	'git-007': '遠くのリポジトリ',
	'git-008': 'rebase で積み直す',
	'git-009': '記録しない物を決める',
	'git-010': 'レビューを経て合わせる',
	'ctr-001': 'イメージから動かす',
	'ctr-002': '止めて片付ける',
	'ctr-003': 'ポートをつなぐ',
	'ctr-004': 'イメージを作る',
	'ctr-005': 'データを残す',
	'ctr-006': '設定を渡す',
	'ctr-007': 'まとめて動かす',
	'ctr-008': '層とキャッシュ',
	'ctr-009': 'コンテナどうしの網',
	'cld-001': 'クラウドで借りる',
	'cld-002': 'サービスの形',
	'cld-003': '地域と区画',
	'cld-004': '仮想の網を組む',
	'cld-005': '物を置く倉庫',
	'cld-006': '負荷を分けて増やす',
	'cld-007': '費用を見積もる',
	'cld-008': 'クラウドの権限',
	'cld-009': '構成をコードで書く',
	'cld-010': '監視と警報',
	'ci-001': 'push で検査が走る',
	'ci-002': '段と順番',
	'ci-003': '設定を読む',
	'ci-004': '失敗のログを読む',
	'ci-005': 'キャッシュで速くする',
	'ci-006': '秘密の渡し方',
	'ci-007': '自動で配信する',
	'ci-008': '並べて走らせる',
	'ai-001': 'AI とは何か',
	'ai-002': 'AI の難しい問題',
	'ai-003': '探索で解く',
	'ai-004': '知識で推論する',
	'ai-005': '機械学習の 3 つの型',
	'ai-006': '直線で予測する',
	'ai-007': '決定木とアンサンブル',
	'ai-008': '似た物を集める',
	'ai-009': '次元を減らす',
	'ai-010': 'モデルを評価する',
	'ai-011': '過学習を見抜く',
	'ai-012': '報酬から学ぶ',
	'ai-013': 'ニューロンをつなぐ',
	'ai-014': '誤差を下げる',
	'ai-015': '誤差逆伝播',
	'ai-016': '最適化手法',
	'ai-037': '正則化',
	'ai-017': '畳み込みとプーリング',
	'ai-018': '正規化とスキップ結合',
	'ai-019': '系列を覚える層',
	'ai-020': '注意の仕組み',
	'ai-021': '符号化と水増し',
	'ai-022': '画像を認識する',
	'ai-023': '言葉を扱うモデル',
	'ai-024': '音声と複数の入力',
	'ai-025': '深層強化学習',
	'ai-026': 'データを生み出す',
	'ai-027': '学んだ物を使い回す',
	'ai-028': '判断の理由を示す',
	'ai-029': 'モデルを軽くする',
	'ai-030': 'AI の企画を進める',
	'ai-031': 'データを集めて整える',
	'ai-032': '個人情報を守る',
	'ai-033': '作った物の権利',
	'ai-034': '契約と公正な競争',
	'ai-035': '公平で開かれた AI',
	'ai-036': 'AI を治める',
	'sta-001': 'データの種類',
	'sta-002': '度数分布とヒストグラム',
	'sta-003': '代表値',
	'sta-004': '散らばりを測る',
	'sta-005': '四分位と箱ひげ図',
	'sta-006': '値を比べられる形にする',
	'sta-007': '時系列を読む',
	'sta-008': '散布図と相関',
	'sta-009': 'クロス集計表',
	'sta-010': '直線を当てはめる',
	'sta-011': '観察と実験',
	'sta-012': '標本を選ぶ',
	'sta-013': '確率の基礎',
	'sta-014': '条件付き確率とベイズ',
	'sta-015': '確率変数と期待値',
	'sta-016': '二項分布',
	'sta-017': 'ポアソン分布ほか',
	'sta-018': '正規分布',
	'sta-019': '標本平均の分布',
	'sta-020': 't・カイ二乗・F 分布',
	'sta-021': '推定量の性質',
	'sta-022': '母平均の区間推定',
	'sta-023': '母比率・母分散の区間推定',
	'sta-024': '仮説検定の考え方',
	'sta-025': '母平均の検定',
	'sta-026': '母比率・母分散の検定',
	'sta-027': 'カイ二乗検定',
	'sta-028': '回帰分析',
	'sta-029': '実験計画と分散分析'
};
