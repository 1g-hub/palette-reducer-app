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
