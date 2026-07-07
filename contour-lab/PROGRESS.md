# contour-lab 実装ログ（PROGRESS）

`IMPLEMENTATION_PLAN.md` の実装進捗を、検証の実出力とともに残す作業ログ。
会話が要約されても状態を復元できる粒度で記録する（ユーザ global 規約 #2）。

- 実装担当: Claude（Opus 4.8, ultracode）／開始 2026-07-03
- 原則: 1項目=1コミット目安、副作用の直後に独立検証、未検証は「未検証」と明記。

## 計画からの意図的な逸脱（記録）
- PROGRESS.md を P0-3 ではなく **P0 の最初に作成**し、各ステップ後に追記する運用にした（「作業しながら記録を残す」方が信頼性が高いため）。

---

## P0. テスト基盤・ベースライン

### 状態: 完了（2026-07-03）

**P0-1 unit 復旧**
- `test/test-contour.js` の require を絶対パス→ `require('../contour-lab.js')` に変更。
- 実行 `node test/test-contour.js` → **33 PASS / 0 FAIL**（純関数のみ）。
- 注記: 計画/メモリは「31」としていたが、退避物の実カウントは **33**（snapFps 8 / bresenham 2 / diamond 5 / open 1 / lone 1 / donut 3 / chord 3 / triple-nest 3 / sobel 4 / clean-interior 3）。以後は実数で管理。

**P0-2 e2e 足場**
- `test/driver.js` を共有ランナーに再実装（旧 driver.js の1発版を置換）。毎回 `mkdtemp` の一時dirへ `contour-lab/*`（ファイルのみ）+ リポジトリ直下 `icm.js` を複製し `file://<tmp>/contour-lab/index.html` を開く（`../icm.js` 参照が成立する構造。P1-0 以降で必要）。console/pageerror/requestfailed 捕捉、`t.ok/t.eq` アサート、ヘルパ（uploadVideo/waitVideoLoaded/waitFrameDrawn/canvasPct/viewBox/shot/eval/$eval）。
- `test/e2e.js` = CLI（`node test/e2e.js <scenario>` → `test/scenarios/<name>.js`）。
- `test/scenarios/smoke.js` = 読込→api=yes→#undoBtn の enabled/disabled でストローク/Undo/Redo を観測→errs=0。
- `test/package.json` + `npm install` → **puppeteer-core 23.11.1**（system Chrome `/usr/bin/google-chrome`、追加ダウンロード無し）。85 packages。
- 実行 `node test/e2e.js smoke` → **9 PASS / 0 FAIL**（実 Chrome で描画・Undo・Redo が動作）。
- 修正1件: `errs=0` ゲートが `blob:file:///… net::ERR_ABORTED` を誤検出。これは `<video>` シーク時の進行中バイト範囲フェッチ破棄で無害（「first frame drawn」が通過＝デコード成功が根拠）。driver の requestfailed フィルタで `blob:`+`ERR_ABORTED`（と favicon）を errs から除外（logs には残す）。再実行で 9/0。

**P0-3 付帯**
- `test/check-version.js`（index.html の全 `?v=` 一致検査）。standalone → `version-check ok: 2 refs all ?v=7`。`test-contour.js` 末尾に組込み → unit は **34 PASS / 0 FAIL**。
- `contour-lab/.gitignore`（test/node_modules・test/out・test/package-lock.json・models/*〈README/download.sh 除外〉）。
- ベースラインコミット: 下記「コミット」参照。

**この時点の実行コマンド（回帰の基準）**
```
node contour-lab/test/test-contour.js      # → 34 PASS / 0 FAIL
node contour-lab/test/check-version.js      # → version-check ok
cd contour-lab/test && node e2e.js smoke    # → 9 PASS / 0 FAIL（要 npm install 済み）
```

**未検証・既知**
- e2e は headless（`--use-gl=swiftshader`）。実ブラウザの対話操作は依然ユーザ未検証（メモリの但し書きは有効）。
- `canvasPct` の getImageData は file:// + `--allow-file-access-from-files` 前提。

---

## P1. 安全網

### P1-0 内部API（完了 2026-07-03）
- index.html に `<script src="../icm.js?v=8">` を contour-lab.js の前に追加。全 `?v=` を 8 に統一。
- IIFE 末尾で `window.CL`（S/dom + 既存内部関数群）を公開。挙動不変。
- `window.ContourLab` のエクスポートを `Object.assign` に変更（後続モジュールが同名前空間に co-attach できるように）。
- 検証: unit 34/0、smoke に CL/ICM 存在アサート追加 → **smoke 11/0**（icm.js が `../icm.js` から読める、window.CL/ICM 有り、描画/Undo/Redo 不変）。

### P1-1 COW メモリ（完了 2026-07-03）
- 純関数 `rleFromBitmap`/`bitmapFromRle`（線形index の [start,len,...]）を追加。unit に往復テスト（乱数疎ビットマップ100件＋端点）→ **unit 39/0**。
- `maybeCarry` を**参照共有**化（複製せず sharedLids に記録）。`writableLines(f,lid)` を新設し、借用配列は初回書込前にクローン→所有化＋派生 fill 破棄。**全書込経路**（penInto/eraseInto/objectFloodAt/shapeEdit/clearColorAction/endStroke/applyCh-diff）を writableLines 経由に統一。
- `fill` は導出物として現在＋直近3枚のみ保持（`retainFillsFor`、pumpLoad に組込）。`owned(f)` 追加。
- スナップ型 Undo（clearFrameAction / applyCh type:'snap'）のフルバッファを **RLE 化**。delLayer は sharedLids も掃除。
- 版を 9 に更新。`node --check` clean。
- **e2e `cow` → 13/0**（実測値）:
  - 40 フレーム carry スクラブでヒープ増加 **0.0MB**（非COW射影 ~158MB）。
  - fill 保持フレーム = 3（≤3）。
  - **エイリアシング無し**: f20 加筆後 f0/f19/f21 の line 画素数不変（174 のまま）。f20 は 174→314。Undo で 174 復帰。
  - page errors 0。

**設計判断（計画からの逸脱・記録）**
- `rleFromBitmap`/`bitmapFromRle` は計画では morpho.js だが、contour-lab.js の Undo 機構と密結合＆ロード順依存を避けるため **contour-lab.js の純関数セクションに配置**（ContourLab 経由でテスト可能）。morpho.js は P1-4 の maskToLines/形態素用に新設予定。
- carry は **lines のみ参照共有**（fill は共有しない）。ensureFills が現在フレームの fill を都度計算し retainFillsFor で 3 枚に制限 → fill エイリアシングの可能性自体を排除。
- `cow` の規模は計画の 300 フレームではなく **40 フレーム1枚ずつ**（実 seek コストとのトレードオフ）。ヒープ判定は絶対値<60MB＋非COW射影のログで弁別。エイリアシングは少数フレームで厳密検証。

### P1-2 保存/復元（完了 2026-07-03）
- `storage.js`（新規）: IndexedDB(`contour-lab` v1, stores `meta`[keyPath sig] / `frames`[keyPath [sig,f]]) 自動保存＋復元。所有フレームのみ RLE 保存（fill/Undo/carry は非保存）。
- contour-lab.js に保存フック（全て `if(S.onX)` ガードで未ロード時 no-op）: `notifyFrameChanged`（commitChanges/undo/redo/clearFrame）、`notifyMetaChanged`（addLayer/delLayer/レイヤ名・表示・濃さ/fps変更）、`onFrameEnter`（pumpLoad で carry より先に遅延復元）、`onVideoLoaded`（loadVideo で await 復元）。fps 変更ガード（所有フレーム有りで confirm）。
- デバウンス 800ms 自動保存。プロジェクト JSON 書き出し/読み込み（`*.contourlab.json`）＋保存済み一覧UI＋保存ステータス表示。index.html に「プロジェクト」節、styles.css に対応CSS。
- **e2e 基盤拡張**: driver に **http 静的配信**（`serve:true`）を追加。IndexedDB は **file:// 不透明オリジンでは使用不可**なので persist は http で実行。storage は file:// では `dbBroken` にフォールバック（描画機能自体は動く）。
- 版 10。`window.CLStore`（buildProjectObject/applyProjectObject 等）をテスト用に公開。
- **e2e `persist` → 11/0**: IndexedDB usable(http)、f0描画(192px)→flush→**リロード→再オープンで 192→192 復元**、**JSON 往復 192→192**、errs 0。smoke も storage.js 込みで 11/0（回帰なし）。

**設計判断（P1-2）**
- 復元はメタ即時＋フレーム RLE を `savedFrames` に読み込み、**デコードは初訪時に遅延**（大量所有フレームでも復元が軽い）。削除レイヤの残骸は onFrameEnter で現行 layer id にフィルタして無視。
- 保存ステータスは計画のヘッダではなく**パネル内**に配置。
- IndexedDB 不可オリジン（file://直開き）では自動保存を無効化しトースト表示のみ。JSON 入出力は file:// でも動作。

### P1-3 一括書き出し / P1-4 マスク取込（完了 2026-07-03）
- 純関数（`morpho.js` 新規）: **`maskToLines`**（内側境界。取込の唯一の受け口。fill は導出）＋`crc32`＋`zipStore`（無圧縮ZIP）。ContourLab に co-attach。
- **maskToLines の要石プロパティを厳密テスト**: `maskToLines∘computeFill == mask` を単一凸形状300件＋donut/L字/2ブロブ/端接触/1px で検証（unit 52/0）。**既知の限界を明示テスト化**: 壁1pxの穴(3x3リング)は even-odd で塗られる＝復元不可（ユーザ手描きと同じモデル限界。実マスクでは実害無視可）。zipStore は system `unzip -t` でも検証。
- `io.js`（新規）: P1-3 = 所有フレーム×色 → 白黒PNG(`mask_L{lid}_f{00000}.png`)＋`manifest.json` を ZIP 出力。P1-4 = PNG 取込（二値化→maskToLines→レイヤ、replace/OR、しきい値、ファイル名 f##### でフレーム対応）。index.html に「読み込み」節＋ZIP ボタン。
- 版 11。`window.CLIO` をテスト公開。
- **e2e `io-roundtrip` → 9/0**: 四角描画(29400px)→maskPngBytes(44155B)→実ブラウザで decode→imageToMask→新レイヤへ applyMaskToLayer→**元マスクと画素完全一致(29400 vs 29400)**。export ファイル名・manifest 検証。errs 0。

**P1 完了時点の回帰基準**
```
node contour-lab/test/test-contour.js        # 52 PASS / 0 FAIL
node contour-lab/test/check-version.js        # 6 refs all ?v=11
cd contour-lab/test && node e2e.js <smoke|cow|persist|io-roundtrip>  # 11/13/11/9 PASS, 0 FAIL
```

**設計判断（P1-3/P1-4）**
- `maskToLines`/`zipStore` は計画どおり `morpho.js`（RLE は P1-1 で contour-lab.js に置いた）。
- ZIP 書き出しは v1 では**所有フレームのみ**（carry 実体化した「全フレーム」出力は後回し）。PNG は白黒 RGBA（厳密な8bitグレースケールではないが機能的に等価、取込は輝度しきい値）。
- ダウンロード捕捉に依存しないよう `buildExportFiles()`/`maskPngBytes()` を公開し、PNG往復を実ブラウザのコーデックで検証。

### P1 レビュー（多エージェント敵対的レビュー）と修正（完了 2026-07-03）
Workflow（5次元レビュー→各所見を独立エージェントが反証試行）で **6件中4件が確定**（2件反証）。全て**データ損失系**。修正＋各バグの回帰テストを追加し、**旧コードで FAIL・新コードで PASS を git stash で実証**。
- **#1 [high] COW source側エイリアシング**（contour-lab.js）: carry 元フレームを編集/Undoすると共有配列を in-place 破壊し借用フレームが壊れる。sharedLids は borrower しか印を付けないため。→ **参照カウント `S.arrRefs`(WeakMap)** を導入。writableLines は「2フレーム以上が参照中(rc>1)」なら複製。maybeCarry で bump。回帰: cow に「source f0 編集後 f30 不変」を追加（旧コードで FAIL 確認）。
- **#2 [high] 復元時に carry レイヤ消失**（maybeCarry の all-or-nothing）: 所有レイヤ1つ持つ復元フレームが carry を丸ごと止め他レイヤ喪失。→ **maybeCarry を追加式**（無い lid だけ引き継ぐ）。回帰: restore-merge の「f5 L1(carried)+L2(owned) 共存」。
- **#3 [critical] 未訪問フレームへの import が他レイヤ破壊**（io.js）: fdata が空フレーム生成→自動保存が行を上書き。→ applyMaskToLayer 冒頭で `S.onFrameEnter(f)` を呼び保存レイヤを先に復元。回帰: restore-merge の「未訪問 f10 へ import→L2 保持」。
- **#4 [medium] OR取込が未訪問復元フレームでゼロと合成**（io.js）: → OR基点を `getLines(f,lid)`（savedFrames も見る）に変更（#3の復元と二重の保険）。
- 反証された2件（記録）: applyProjectObject 前の debounce flush 競合（到達不能）／fps ガードが savedFrames を無視（軽微、ただし `anyOwned()` に `savedFrames.size` を追加して塞いだ）。
- 版 12。**全回帰**: unit 52/0、e2e smoke11/cow15/persist11/io-roundtrip9/restore-merge11、すべて 0 FAIL。

---

## P2. カット検出・タイムライン（完了 2026-07-03）
- `timeline.js`（新規）: 純関数 `detectCuts(dists, sens)`（`min(0.82, max(sens, median+3MAD))`、連続超過は先頭のみ。ContourLab に co-attach、unit 5件追加 → **unit 57/0**）。解析は**再生パス(rVFC)**で各フレームの HSV ヒスト距離（`ICM.hsvHist`/`histIntersectionDistance`、短辺96）。タイムライン canvas（シーン交互塗り/カット線/所有=実ティック・借用=淡ティック/再生ヘッド、クリック/ドラッグでシーク、右クリックでカット手動追加/削除）。
- contour-lab.js: `sceneIndexOf(f)`、**maybeCarry にカット跨ぎガード**（P2-3）、`onTimelineRefresh`/`onSceneJump` フック、Shift+←→でシーン移動。storage は `cuts`＋`cutDists` を永続。
- index.html: タイムライン帯＋「シーン/カット」節（カット検出ボタン・感度スライダ）。版 13。
- **e2e `cuts` → 10/0**: 解析が距離配列生成、detectCuts の感度単調性、**手動カットで carry 跨ぎガード**（cut-3〜cut-1 は引き継ぎ、cut で遮断）。

**重要な実測所見（正直な記録）**: テストクリップ `0513_03_moto.mp4` では**意味的シーン境界(≈505/600)での HSV 距離が小さく(≈0.03)**、**シーン内モーション(男子が頭を上げる frame106 で 0.17)が最大**になる。さらに再生サンプリングは run 毎にばらつく（343〜601 nonzero, max 0.17〜0.63）。→ **この AI 素材では HSV 自動カットは弱い**。detectCuts ロジック自体は正しい（合成データで検証済み）。実用は**感度スライダ＋タイムライン右クリックの手動カット編集**が本線。将来 P3 のエッジ場や色ベースの併用で改善余地。
- 版 13。**全回帰**: unit 57/0、e2e smoke11/cow15/persist11/io-roundtrip9/restore-merge11/cuts10、すべて 0 FAIL。

**P2 追修正（ユーザ報告、2026-07-04）**: Shift+→ が「次シーンが無いとき動画末尾(last frame)へ飛ぶ」→「次シーンの最初のフレームへ、無ければ何もしない(トースト)」に変更。純関数 `sceneTarget(cuts,cur,dir)` を新設（timeline.js、unit 10件追加 → unit 67/0）、sceneJump がそれを使用。help に Shift+←→ を追記。版14。e2e cuts に統合検証追加（12/0）: Shift+→ が 300 へ、最終シーンでは据え置き。

---

## SAM 3.1 → contour-lab パイプライン（2026-07-05, ユーザ要望）
要望: SAM3.1でシーン分割→点選択→自動追跡→マスク→**出力**→**contour-labで修正**。3ピースのうち2つは既存だった。
- **①SAM追跡（既存）**: thxserv `~/sam3-bg/gradio_sam3_scene.py`（シーン検出/分割/結合・点±クリック・SAM2トラッカ・refine）。
- **②マスク出力（新規・SAM側）**: 追跡結果を**contour-lab形式のZIP**（`mask_L{obj}_f{00000}.png` 0/255 + `manifest.json`）で書き出す `on_export_masks`＋`_scene_binary_masks`＋「💾 マスクを書き出し」ボタンを gradio_sam3_scene.py に追加（冪等パッチ、`.bak_export_*` バックアップ、py_compile 済み）。**GPU実行での end-to-end はユーザ検証待ち**（点クリック＋追跡が要るため私はヘッドレスで実行不可）。obj id = contour-lab のレイヤ id、色は OBJ_COLORS。
- **③contour-labで修正（強化）**: `importMaskFiles` を**複数対象対応**に。`objFromName`（`mask_L{n}_f#####` / `obj{n}`）で対象IDを抽出→`ensureLayer` で対象ごとに別の色レイヤへ自動振り分け（複数対象は各フレーム 'replace'）。manifest.json があればレイヤの色/名前を適用（既存レイヤも上書き＝SAMの色と一致）。版23。
- **e2e `sam-import` → 11/0**: mask_L1/L2＋manifest を実UIで取込→対象1/2が別レイヤ（manifest名『男の子』『女の子』・色適用）・フレーム対応（f0=両対象/f3=対象1のみ）・**両対象の非重複**。io-roundtrip/restore-merge/region-fixes 回帰なし。
- パイプライン運用: SAMで追跡→「💾書き出し」でZIP DL→展開→contour-labの「マスクPNGを読み込む」でPNG群＋manifest.jsonをまとめて選択→対象別レイヤに入る→ペン/W/R/消しゴム等で修正→本体用JSON等で書き出し。

### 通し検証（2026-07-06, GPU実機）
- SAM書き出しパッチに **`io` 未 import のバグがあり、ヘッドレステストで発見→修正**（`.bak_iofix_*`）。**対話前にバグを捕捉**。
- ヘッドレス駆動（`~/sam3-bg/headless_export.py`: Gradio非起動でモジュール関数を直接呼ぶ）で、フレーム0の男の子に点2つ(960,430)(760,820)を種として**91フレーム追跡(res672,35秒)→`masks_contourlab.zip`(91PNG+manifest,対象1/色[255,60,60])**。frame0被覆**35.9%**（過去の`person`検出35.5%と一致＝男の子）。オーバレイ目視でも頭+ブレザー+腕を正確被覆。
- そのZIPをDL・展開し **contour-lab へ実取込（e2e `sam-real` 7/0）→対象1レイヤ・封止復元 被覆35.9%（元と一致）・frame2も取込・UIスクショで男の子にマスク**。**実キャラマスク（枠端接触・複雑形状）が maskToLines→even-odd で完全復元されることを実証**。
- **結論: SAM3.1 シーン→点→追跡→書き出し→contour-lab取込→修正 の一気通貫が実機で成立**。唯一私がGPU未検証だった SAM書き出しを検証・バグ修正済み。残るユーザ確認は対話UIでの点クリック体感のみ。

## 保存済みプロジェクトの幽霊対策 & なぞり吸着（2026-07-07, ユーザ要望）
- **旧プロジェクトでも幽霊を出さない**: 復元時、meta に carry フィールドが無い（＝carry修正前に保存された旧形式）場合は carry を自動OFF（トーストに付記）。明示的に保存された boolean は尊重。e2e `legacy-restore`（http, IDBのmetaからcarryを削除して旧形式を再現）→ **9/0**。
- **データに残った幽霊の削除ツール**: `clearColorRange('forward'|'backward')` ＝選択色を現在フレームからシーン末尾/先頭まで一括消去（「領域整形」に赤ボタン2つ）。未訪問の savedFrames-only フレームも対象（recの全色を実体化してから消す＝他色の保存を巻き込まない）。**savedFrames をその場で更新**（IDB不可オリジンで古いRLEが復活しない）。各フレーム snap undo。e2e `clear-range` → **9/0**（f1〜のみ消去・f0残存・未訪問f4も消去・savedFrames即時更新・per-frame Undo）。
  - 事実関係: **表示だけの幽霊（借用線）は保存されない**（frameRLE が sharedLids をスキップ）。幽霊フレームで編集/統合/重なり解消/上書きコピーをした場合のみ実データ化しており、その掃除にこのツール。
- **なぞり吸着 (T, 新ツール)**: W の延長。既存の線（**閉ループ対応**＝SAM輪郭の主用途）の直したい区間を線に沿ってドラッグ→離すと、なぞり両端に最も近い線上2点をアンカーに、**その間の「なぞった側の区間」だけ**を回廊Dijkstra の色エッジ経路で置換。1 Undo で復元。実装: 純関数 `nearestLinePixel`/`linePathWithin`（線上BFS・near制限で閉ループの弧選択、unit +6 → **100/0**）。弧選択の回廊は 1×→2×→4×(上限48px)と拡大（既存線が間違っている所ほどなぞりとズレるため）。塗り3割崩壊で中止のリーク保険。黄色のなぞりプレビュー。e2e `trace-snap` → **8/0**（凸凹閉ループの上辺をなぞり→区間置換・ループ閉維持(fill 30461→30762)・他辺無傷・Undo完全復元）。
- 版32。**全回帰**: unit 100/0、e2e 15シナリオ（既存12 + trace-snap8/clear-range9/legacy-restore9）すべて 0 FAIL。

## ユーザ報告バグ2件の修正（2026-07-07）
**①端点スナップが「カーソルと違う場所」に吸着**。根因＝探索半径 `max(3, round(9/scale))`：(a) 世界座標で最低3px固定→高ズーム(8〜16倍=SAM修正作業)で**画面24〜48px先**に吸着 (b) 低ズーム側は無制限で世界16〜32px (c) 候補が端点だけでなく**線の途中(近傍2)も対象**→SAM取込後は輪郭だらけで頻繁に乗っ取り。→ 修正: 半径＝**画面約7px相当**（`clamp(round(7/scale),1,12)`・円形判定）＋**真の端点(近傍≤1)を線上点より優先**。`CL.findSnap` をテスト公開。snap e2e に回帰4件（半径外null／線上最近傍／端点優先／16倍で半径1px）→ **snap 17/0**。
**②SAMマスクの幽霊（オブジェクト消失後もマスクが残る・巻き戻しでも出る）**。根因＝**フレーム引き継ぎ(carry, 既定ON)**：`maybeCarry` は移動方向を問わず「前に見ていたフレームにあって今に無い色」を借用複製する。SAM書き出しは対象不在フレームにPNGを出さない（`mm.sum()>0`のみ、正しい）ので、不在フレームへ最後のマスクが連鎖的に引き継がれた（巻き戻しは同機構の逆向き）。additive carry が他色持ちフレームにも追加するため悪化。借用線は保存されないが表示され、resolve/merge で所有化し得た。→ 修正3点: **(a)** マスク取込成功時に carry 自動OFF（トースト表示・UI注記）**(b)** carry OFF 時に `purgeCarried()` で全フレームの借用線を一掃（arrRefs も減算、所有データは無傷）**(c)** carry 状態を meta に永続（リロード後もOFF維持）。`CL.setCarry/purgeCarried` 公開。
- **e2e `carry-ghost`（新規）→ 14/0**: 取込(f0,f1のみ)→carry自動OFF→**f2/f3に幽霊なし**→巻き戻しf0無傷→carry手動ONで幽霊再現(借用)→OFFで一掃・所有データ無傷。**旧コードで 5 FAIL（報告バグそのまま再現）を git stash で実証**。
- 版31。**全回帰**: unit 94/0、e2e 12シナリオ（smoke11/cow15/persist11/restore-merge11/sam-import11/copy-forward12/cuts12/file-io17/merge-layers13/layers-order11/snap17/carry-ghost14）すべて 0 FAIL。

## レイヤ順序変更 & 重なり解消（2026-07-06, ユーザ要望）
要望「色ごとにレイヤ順序を変えたい／というかマスクがかぶらないようにしたい」。
- **順序変更**: `moveLayer(id,dir)` ＋各レイヤ行に ▲(前面へ)/▼(背面へ)。renderLayers を**前面(配列後方)が上**に表示するよう反転（リスト上＝前面＝重なりで上）。合成順(rebuildMask)は不変（配列後方＝前面）。順序は meta 保存で永続。
- **重なり解消**: `resolveOverlaps('frame'|'scene')` ＋ボタン2つ。各画素を**前面(配列後方)優先**で1色だけに割当て→負けた色は won領域を `maskToLines` で再構成して非重複化。各フレーム snap undo。順序変更で優先色を制御できる。
- e2e `layers-order` 11/0（重なり→前面が保持/背面が失う・Undo復元・moveLayerで前面入替→resolveで優先色が変わる）。版29、unit 94/0、回帰なし（smoke/restore-merge/sam-import/merge-layers/copy-forward）。

## レイヤ統合 & フレーム前方コピー（2026-07-06, ユーザ要望2件）
- **機能1 レイヤ統合**（2色→1色）: `mergeLayers(src,dst)`（contour-lab.js）— 全 in-memory フレームで src線を dst へ OR＋fill再計算＋src削除、`S.onMergeSaved`（storage.js）で未訪問の savedFrames(RLE)＋IDBも統合。各レイヤ行に「⤵（選択中の色へ統合）」ボタン。confirm ガード（Ctrl+Z不可を明記）。e2e `merge-layers` 9/0（色2→色1、色1が左右両方を含む・色2消滅・面積和）。
- **機能2 現フレームを前方へ上書きコピー**（carryは空フレームのみ複製＝ZIP取込後は効かない、への対応）: `copyFrameForward('next'|'scene')`（contour-lab.js）— **選択色のみ**を次フレーム/同シーン残りへ上書き（他色=他対象は温存、per-layer diff undo）。「フレーム引き継ぎ」節にボタン2つ。e2e `copy-forward` 10/0（f0→f1上書き・f1がf0一致・**他対象保持**・Undoで復元）。版27。

### merge/copy 敵対的レビューと修正（完了 2026-07-06）
Workflow（4次元）で **4件確定・1反証**。
- **#1/#3/#4 [medium] 統合後の stale Undo でデータ破損**: mergeLayers が per-frame Undo/Redo を消さず、統合後 Ctrl+Z が統合済み画素を消す/幽霊レイヤ（削除済みsrc）を復活させ IDB へ保存。→ mergeLayers で `S.undo.clear();S.redo.clear()`（統合は非可逆＝loadVideo と同じ扱い）＋ applyCh を「S.layers に無い lid の diff/snap成分は無視」に硬化。
- **#2 [high] dbBroken時に savedFrames の統合が漏れてデータ損失**: onMergeSaved が `dbBroken` で早期returnし、file://やJSON取込後（savedFrames主体）に未訪問フレームの src が dst へ統合されず、訪問時に onFrameEnter が無効lidとして捨てて消失。→ in-memory の savedFrames 統合は**常に実行**、IDB書込のみ dbBroken でスキップ。
- 版28。**回帰**: unit 94/0、e2e merge-layers 13/0（Undo破棄・Ctrl+Z無害・**dbBroken強制で savedFrames統合**を検証、旧コードで FAIL を git stash実証）、copy-forward10/smoke11/cow15/persist11/restore-merge11、0 FAIL。テスト用 `CLStore._setDbBroken` 追加。

## ZIP直接取込（2026-07-06, ユーザ「ZIPをどこに置く？」）
- 回答＝どこにも置かなくてよい（ブラウザのファイル選択）。さらに **SAM書き出しZIPをそのまま `#importMask` で選べる**ように実装。io.js に `unzip`（EOCD→中央ディレクトリ解析、method0=store/method8=DEFLATEを `DecompressionStream('deflate-raw')` で展開）＋`expandZips`。`importMaskFiles` 冒頭で .zip を中身の File 群へ展開してから既存ロジック。accept に `.zip` 追加、note更新、大量取込に進捗トースト（>30枚で 25毎）。版25。
- **e2e `sam-real` を ZIP直接取込に拡張** → 実SAM 2対象ZIP(DEFLATE, 63entries)をそのまま取込→ブラウザ内展開→対象1赤/対象2緑の別レイヤ・封止復元（9/0）。非zip取込(io-roundtrip/sam-import/restore-merge)は回帰なし。unit 94/0。

## ユーザ検証フィードバック反映（2026-07-06）
- **R（全線再吸着）を削除**（ユーザ判断: 大きな動きで精度低・SAM追跡が上位互換）。resnapAll/Rキー/ボタン/help/未使用純関数 traceChains・snapClosed とそのテスト・resnap e2e を撤去。W（単ストローク吸着）は維持（snap 13/0）。版24、unit 94/0。
- **複数種類のSAMマスク→色分け を実SAM 2対象で通し検証**: ヘッドレスで 男の子=対象1(シーン0)＋女の子=対象2(シーン540〜) を追跡→書き出し（`mask_L1_*`＋`mask_L2_*`＋manifest 2レイヤ 色[255,60,60]/[60,200,60]）→ contour-lab 取込（e2e `sam-real` を対象別対応に拡張, 9/0）→ **対象1→レイヤ1(赤,35.9%@f0)、対象2→レイヤ2(緑,35.0%@f540)＝別の色レイヤへ分離**。ユーザ要望「複数種類を色として分ける」を実SAM出力で実証。

## cleanInterior 修正（2026-07-05, ユーザ検証依頼）
- **検証結果**: 「内部の線を掃除」は画面**内部**の輪郭は安全（外周保持・埋もれ線のみ除去）だが、**画面端(枠)に沿う輪郭は消える**ことを実測確認（左辺x=0の四角で 5画素中3画素が消失）。原因＝OOB近傍を skip → 端の外部（空き）が見えず「埋もれ」と誤判定。キャラが枠に接する動画で頻発。
- **修正**: cleanInterior 判定で OOB を `return false`（外部＝空き扱い→残す）に変更。内部埋もれ線の掃除は不変。unit +2（端の輪郭保持／内部掃除維持）→ **unit 94→（P3-3後）99**。

## P3. 確定エッジスナップ（2026-07-05）— ユーザの元々の最優先機能

P4 の後に着手（ユーザ「全部あなたのおすすめで」）。**P3-0/1/2 のコア（確定スナップ）を実装**。P3-3(全線再吸着)/P3-4(折れ線)/P3-5(他レイヤスナップ)/P3-6(オニオン)/P3-7(ミニマップ)/P3-9(再生プレビュー)は**未実装（磨き込み・後日）**。
- `snap.js`（新規）: 純関数 `costFromMag`（勾配→コスト、高勾配=低コスト）/`dijkstraPath`（回廊内8近傍最小コスト経路、二分ヒープ）/`buildCorridor`（点列を半径Rで膨張）/`snapEndpoint`（半径内の勾配最大へ端点固定）。ContourLab に co-attach。
- コスト場＝`ICM.colorSobelMag`（色勾配、回廊内最大で正規化、フレーム毎キャッシュ）。
- contour-lab.js: ペン描画中に `S.strokePts` 記録（P3-1）、endStroke で `S.lastStroke={frame,lid,pts,added,closed}` を捕捉（added=このストロークが 0→1 にした画素）。
- W キー/ボタン: 直前ストロークの回廊で Dijkstra→新経路をラスタ化→**差分適用（ラフ線 added を消し経路を立てる）＝1 Undo でラフ線に戻る**。吸着半径スライダ。閉ループ/別フレームは対象外（トースト）。
- unit +9（costFromMag 単調、dijkstra が谷を辿る・回廊外 null、corridor 被覆・bbox、snapEndpoint）→ **unit 92/0**。版19。
- **e2e `snap` → 9/0**: 雑な折れ線→W→線が変化＆**線上の平均勾配 23.1→39.8 に上昇（エッジに寄った）**→Undo1回でラフ線復元→消費後のWは安全な no-op。

### P3 レビュー（多エージェント敵対的レビュー）と修正（完了 2026-07-05）
Workflow（4次元）で **4件確定・1反証。全て low（データ損失なし・全て Undo 可・クラッシュ無し）**。共通根因＝ `S.lastStroke`/`magCache` が「スナップ以外の経路」でフレーム内容/レイヤが変わると陳腐化。各操作に `lastStroke=null` を撒くのは脆いので、**snapLastStroke に自己検証ガード**＋**magCache をオブジェクト同一性キー**に（レビュー推奨の堅牢版）。
- **[low] 幻の線復活**（消しゴム/全消去/領域整形/レイヤ削除の後 W でラフ線が復活）: → snapLastStroke 冒頭で「ls.lid が生存レイヤか」「ls.added の画素が今も残るか」を検証し、無ければトースト＋消費。1箇所で全経路をカバー。
- **[low] 削除レイヤへ孤児line復活**（同上ガードでカバー: 生存レイヤチェック）。
- **[low] magCache 陳腐化**（fps変更で同フレーム番号が別画像に）: → `magCache.src === S.frameImgData`（captureFrame は訪問毎に新規生成）で判定＝fps変更/別動画/同番号別画像を自動で作り直す。先の frame+wh キーより厳密。
- 先回り修正（`8fcf1a0`）の doUndo/doRedo・onVideoLoaded リセットは高速パス/保険として残置。版21。
- **e2e `snap` に回帰追加 → 13/0**: 描く→この色を全消去→W が**幻の線を復活させない**（旧コードで FAIL を git stash 実証）。**全回帰**: unit 92/0、e2e smoke11/cow15/region-fixes17/scribble9/snap13、0 FAIL。

### P3-3 全線再吸着（R, β）（完了 2026-07-05, ユーザ要望）
- `snap.js` 純関数追加: `traceChains`（8連結成分ごとに1本＝角で分断しない component-walk。端点あり=open/無し=closed。直交近傍優先で対角ショートカット回避）/`snapClosed`（閉ループの各点を法線±rで勾配最大へ→ラプラシアン平滑2反復）。
- `resnapAll`（R キー/ボタン）: 選択色の全チェーンを、open=回廊Dijkstra（P3-2再利用）/ closed=snapClosed で再吸着→**塗り面積が>30%崩壊したら中止（リーク保険）**→1 Undo エントリ。carry後のズレ一括修正＝疑似トラッキング。
- 既知の限界（β）: traceChains は T字分岐の component で一部画素を辿り残す（キャラ輪郭=単純ループ/開弧では問題なし）。
- unit +5（traceChains L/closed/tail/2成分、snapClosed がループを高勾配リングへ）→ **unit 99/0**。版22。
- **e2e `resnap` → 9/0**: 閉輪郭(215px, fill2737)→R→線変化＆**平均勾配 20.0→28.2 上昇**＆**fill 保持(2737→2692)**→Undoで完全復元。**全回帰**: unit99/e2e snap13/cow15/region-fixes17/scribble9/resnap9、0 FAIL。

---

## P4. 領域選択パラダイム（「描く」→「選ぶ」）（2026-07-04）

**注: P4 は P3 より先に実装（ユーザ指示）。P3 は後から追加。**

### P4-1/2/3 ガイデッドフィルタ・量子化ビュー・ワンド（完了、コミット d3745d2）
- `quantize.js`（新規）: 純関数 `guidedFilterRGB`（積分画像ボックス平均でエッジ保存平滑化）/ `quantizeLabels`（worker.js の k-means を移植: バケツ候補＋k-means++シード＋重み付きLloyd）/ `boxMean`。ContourLab に co-attach。
- ビュー: 現在フレームを縮小(短辺270)でパレット導出→ネイティブ最近傍ラベル＋ポスタライズ canvas を `onAfterSource` フックで重畳。Qトグル。
- ワンド(A): クリック→同ラベル4連結 flood→`CLIO.applyMaskToLayer('or')`（maskToLines 経由で封止・Undo可）。
- contour-lab.js に無害フック追加（未登録時 no-op）: `onAfterSource`（描画重畳）/`onToolDown`・`onToolChange`（カスタムツール）/`eventToPixel`。
- unit +6（guided filter エッジ保存・分散低下、quantize ラベル数≤K・中心が実色）。**e2e `quantize` 8/0**（ビュー≤K色、ワンドで封止領域追加、Undo）。

### P4-4 SLIC＋スクリブル＋グラフ割当 v1（完了、本コミット）
- `slic.js`（新規）: 純関数 `rgbToLab`/`slicSuperpixels`（Lab空間SLIC、labMeans返す）/`buildAdjacency`（SP隣接）/`assignByDijkstra`（多始点Dijkstra、辺重み=ΔLab²、二分ヒープ）。
- スクリブルツール(X): 前景(選択色)・背景を太ブラシで塗る→縮小(短辺360)でSLIC→種SPから Dijkstra 割当→プレビュー重畳→「確定」で各色マスク→ネイティブ upsample→maskToLines→レイヤ置換（Undo可）。粒度スライダ、スクリブル消去。
- unit +8（SLIC: 全画素ラベル・数≈grid・単色純度、Dijkstra: 左右分離・全SP到達・直線グラフ）。**e2e `scribble` 9/0**: 前景左/背景右に塗る→割当736SP→確定で封止領域→**左(前景)充填432 vs 右(背景)0＝fg/bg正しく分離**→Undo。
- **DEFERRED（記録）**: グラフカット(maxflow)v2、スクリブルの次フレーム伝播(P4-4b)、SLIC連結性強制（v1は非連結片を許容、実害小）。ラベルマップは元画像から算出（平滑化はパレット/SLIC入力のみに適用）。

**P4 全回帰**: unit 81/0、e2e smoke11/cow15/persist11/io-roundtrip9/restore-merge11/cuts12/file-io17/quantize8/scribble9、すべて 0 FAIL。版16。

### P4 レビュー（多エージェント敵対的レビュー）と修正（完了 2026-07-04）
Workflow（4次元）で **6件確定・0反証**（全データ破損系）。修正＋回帰テスト `region-fixes`（旧コードで FAIL・新コードで PASS を git stash で実証）。
- **#5 [high] io.js applyMaskToLayer('replace') が借用フレームで union になる**: `getLines` は借用(shared)配列を隠す(null)ため差分基点がゼロ→writableLines のクローン(借用線を保持)に新線を OR するだけで借用線が消えない。→ 基点を `d.lines.get(lid)`（writableLines が複製する配列と一致、onFrameEnter 後なので savedFrames も反映済み）に変更。
- **#1 [high] slic 別フレームの割当を今のフレームへ確定→既存マスク破壊**: assignCls/preview/seeds が paintAt 内でしかリセットされずフレーム移動で残る。→ commit 冒頭に `seedFrame !== S.cur` ガード（トースト）、onAfterSource のプレビュー描画も同ガード。
- **#2 [medium] 前景スクリブルが色切替後も旧色へ**: `S.scribbleClass` が setClass 時のスナップショット。→ paintAt を `cls = S.scribbleClass === BG ? BG : S.activeLid`（前景は常にアクティブ色追従、BGのみ固定）。
- **#3 [medium] quantize キャッシュが動画リロードで無効化されない**（キーに解像度なし）: → キーに `S.W×S.H` 追加＋`onVideoLoaded` チェーンで cache=null。
- **#4 [low] slic 種/SPキャッシュが動画リロードで残る**（同フレーム番号で衝突）: → `onVideoLoaded` チェーンで sc/seeds/seedFrame/assignCls/preview を全リセット。
- `onVideoLoaded` は storage→quantize→slic と**チェーン**（各 module が prev を await）。版18。
- **e2e `region-fixes` → 17/0**（A借用replace #5 / B別フレーム確定ブロック #1 / C前景追従 #2 / D リロードリセット #3#4）。**全回帰**: unit 83/0、e2e 9シナリオ計103アサート 0 FAIL。

---

**ユーザ未検証項目の代行検証（2026-07-04）— 実ファイルの流れ**: ユーザ手動検証で「マスクPNG取込／ZIP書き出し／プロジェクトJSON」が未確認だったため、**実ブラウザのダウンロード＋実ファイル入力**で e2e 化。
- driver に CDP ダウンロード捕捉（`enableDownloads`/`waitDownload`）を追加。
- `test/scenarios/file-io.js`（新規, serve:true）→ **17/0**:
  - ① `#exportMasksZip` を実クリック→ `0513_03_moto_masks.zip` が実ダウンロード→ system `unzip -l/-o` で `mask_L1_f00000.png`/`mask_L2_f00000.png`/`mask_L1_f00005.png`/`manifest.json` を検証。`file` で **1920×1080 8-bit RGBA PNG** と確認。manifest の frames=[0,5]・layers・W/H 一致。
  - ② 展開した PNG を **実UI `#importMask`** で読み戻し→ f0 をクリア済みの色1へ取込→ **元マスクと画素完全一致（19154→19154）**＝マスクPNG取込の実証。
  - ③ `#exportProject` 実ダウンロード→JSON 解析（frames に "5" 有り）→ f0/f5 全消し→ **実UI `#importProject`** で読込→ f5 色1 復元（24754）。
- 成果物は `contour-lab/samples/`（gitignore）に保存：ユーザが中身を確認可能。ZIP 133KB・JSON 7KB・PNG各44KB。
- **結論: 3流れとも実ファイルで正常動作を確認**（ユーザの手動確認を代行）。全回帰 unit 67/0＋e2e 7シナリオ 0 FAIL。
