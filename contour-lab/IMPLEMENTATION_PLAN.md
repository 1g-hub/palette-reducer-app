# contour-lab 実装計画書（P2〜：全提案の検証実装）

作成: 2026-07-03（Claude Fable 5）／実装担当: 別のAI（この文書だけで着手できるように書いてある）

## 0. この文書の読み方（実装AIへの必須ルール）

1. **着手前に現物を読むこと。** 本文書は 2026-07-03 時点の `contour-lab/contour-lab.js`（504行, `?v=7`）を前提に file:line を引用している。実装時点でズレていたら**現物を正とし**、差異を `contour-lab/PROGRESS.md` に記録する。
2. **フェーズ順に実装する**（P0→P1→…）。各フェーズ内の項目は原則番号順。依存が明記されていない項目同士は入れ替え可。
3. **1項目 = 1コミット**（目安）。コミット前に必ずその項目の「検証」を実行し、**実際の出力**を `PROGRESS.md` に貼る。「やったはず」を書かない。未検証のものは「未検証」と明記する。
4. **既存機能を壊さない。** 各項目の後で必ず回帰（§15 の unit + e2e smoke）を回す。
5. **ルート直下のメインアプリのファイル（app.js / worker.js / icm.js / index.html / styles.css）は一切変更しない。** icm.js は読み込んで使うだけ。
6. ブラウザキャッシュ対策: 変更のたびに `contour-lab/index.html` の **全 `?v=` を同時に +1**（styles.css / contour-lab.js / 追加した全 script）。現在は `?v=7`。
7. UI 文言は日本語。既存 UI・トーストの文体に合わせる。
8. モデルの URL・ファイル名など「**要検証**」マークの情報は実装時に必ず確かめる（私の知識カットオフは 2026-01。HuggingFace 等の実物を確認してから使う）。

**クイックスタート:** §3 で現状コードの地図を頭に入れる → P0 でテスト基盤を確立 → P1 から順に。

---

## 1. 背景・目的

- 素材は拡散モデル製アニメ映像（アンチエイリアスまみれ・フレーム間で色がブレる）。最終目的は palette-reducer 本体（リポジトリルート）で**領域ごとに別パレット**を当てること（背景=滑らか／キャラ=平坦）。
- SAM 3.1 のサーバ検証は「細部精度が微妙」＋「アプリは100%クライアントサイド（GitHub Pages）なのでサーバ必須の SAM は積めない」→ **手動輪郭ツール contour-lab に方針転換**（経緯は `.claude` メモリ `contour-lab-manual-mask-tool` / `sam3-bg-separation-trial`）。
- 本計画 = 前回セッションで合意した**改善案・省力化案の「全部」を contour-lab 上で検証可能な形に実装**する計画。大きく:
  - **安全網**（保存・メモリ・入出力）
  - **カット検出・タイムライン**
  - **手動描画の効率化**（確定エッジスナップ等）
  - **領域選択パラダイム**（量子化・ワンド・スクリブル＋グラフ割当）
  - **AI下描き**（ブラウザ内 ONNX モデル群、実験扱い）
  - **フロー/GrabCut**（オプション）
  - **本体統合準備**（出力形式の凍結のみ）

ユーザ（前田さん）の優先思想: **まず正確な手描き輪郭。自動化は「下描き・確定操作」として後乗せ。ライブマグネットは不要**（雑に描いて→キーで吸着、レビュー可・Undo可、が望み）。

---

## 2. スコープ

**対象:** `contour-lab/` 配下のみ（＋ `contour-lab/test/`、`contour-lab/models/`）。
**非対象（やらない）:**
- palette-reducer 本体への統合実装（P7 は**形式の凍結と書き出しのみ**）
- 本体の「代表色40色上限の引き上げ」（別タスク、未実装のまま宿題）
- 本体 app.js の snapFps 先頭一致バグ疑い（メモリに記載、未確認）の修正
- thxserv 上の SAM バッチ生成スクリプト（§13 付録に出力形式だけ規定）

---

## 3. 現状コードの地図（2026-07-03 実測）

```
contour-lab/
  index.html      127行  ?v=7。パネルは <section class="psec"> の縦積み
  contour-lab.js  504行  1つの IIFE。純関数は window.ContourLab に公開（module.exports ガード有り）
  styles.css       95行
  test/           （本計画 P0 で整備。旧セッション資産の退避済み: test-contour.js / driver.js）
```

### contour-lab.js の構造（行番号は現物基準）

| 区画 | 内容 |
|---|---|
| :11-:89 純関数 | `snapFps`(:11 最近傍標準fps) / `bresenham`(:15 8近傍線) / `computeFill`(:28 **even-odd塗り**: 線で区切った4近傍成分を外周からBFS、奇数深さ=塗り→ドーナツ穴が自動) / `sobelRGBA`(:64 輝度Sobel+NMSの1px二値エッジ, thresh=30固定) |
| :98 `S` | 全状態。`frames: Map<frameIdx, {lines: Map<lid,Uint8Array>, fill: Map<lid,Uint8Array>, inherited, touched}>`、`undo/redo: Map<frameIdx, entry[]>`、`bmpCache`(LRU6) `edgeCache`(LRU4)、`comp/st`(Int32 作業バッファ、computeFill と objectFloodAt が共用) |
| :124-:133 小物 | `fdata`(:124 フレームデータ確保) `layerLines`(:125) `newFill`(:126) `toast`(:130) `lru`(:131) `scheduleRender`(:133) |
| :138-:171 読込 | `loadVideo` / `measureFps`(:162 rVFC 20サンプル→中央値→snapFps。**動画を一時停止して終わる**) |
| :176-:224 フレーム | `pumpLoad`(:183 **直列化ポンプ**: 常に最新 `S.want` を目指す。番号表示は intent 即時反映) / `seekTo`(:195 **'seeked'+rAF。rVFC は一時停止中に発火せずハングするので使用禁止**) / `captureFrame`(:205 中心シーク `(f+0.5)/fps`) / `getEdge`(:211 エッジキャッシュ、**キーはフレーム番号のみ**) / `maybeCarry`(:218 前フレームの線を空フレームへ複製。**カットを知らない**) / `ensureFills`(:224) |
| :227-:242 | `rebuildMask`: 全レイヤを 1 枚の ImageData に合成（塗り=α0.4×濃さ、線=α1.0×濃さ） |
| :245-:280 表示 | `render`(:249 変換行列→フレーム→エッジ→マスク→グリッド→カーソル) |
| :283 | `findSnap`: 端点スナップ。**アクティブ色の線しか見ない** |
| :297-:349 入力 | `penInto`/`eraseInto`/`eraseSeg`、pointerdown(:303)/move(:320)/`endStroke`(:333 端点スナップで自動閉合→fill再計算→`commitChanges`) |
| :352-:398 整形 | `commitChanges`(:352 差分{lid,idx,old,neu}をUndoへ) / `shapeEdit`(:357 **読み取り専用走査→一括適用**。走査中に書き換えると点線が残るバグ既修正) / `cleanInterior`(:369) / `removeStray`(:371) / `objectFloodAt`(:375 ドラッグ式オブジェクト消しゴム) / `clearColorAction`(:393) |
| :401-:415 Undo | `pushUndo`/`applyCh`(:402 差分型 + `type:'snap'` 全置換型)/`doUndo`/`doRedo`/`clearFrameAction`(:410 **snap型はフルバッファを保持**←P1-2でRLE化する) |
| :418-:440 レイヤ | `addLayer`/`delLayer`/`renderLayers`（表示名=位置ベース`色N`+編集可の名前欄） |
| :443 | `exportPng`: **現在フレームのみ**、全可視レイヤ合成 1 枚 |
| :451-:503 配線 | ボタン・キー（B/E/S/G/D/F/**1=等倍**/←→/Home/End/Ctrl+Z/Y/Space=パン） |

### 流用できるリポジトリ内資産（読み込み専用）

| 資産 | 場所 | 用途 |
|---|---|---|
| `ICM.hsvHist` / `ICM.histIntersectionDistance` | `icm.js`（`global.ICM`、IIFE、DOM非依存、module.exportsガード有） | カット検出（P2） |
| `ICM.colorSobelMag` | icm.js（チャンネル別Sobelのmax=等輝度の色境界も拾う） | エッジ参照・スナップコスト場（P3-0） |
| カットしきい値ロジック | `app.js:926-937`（`min(0.82, max(sens, median+3*MAD))`、コメントに根拠） | P2-2 に移植 |
| 低解像度hist取得の作法 | `app.js:1000-1016` `grabCutHistAt`（短辺縮小キャンバスを使い回し） | P2-1 の参考 |
| `buildScenes` | app.js:1020 | シーン区間の組み立ての参考 |
| `weightedKMeans` / `initCenterSequence` / `buildBucketCandidates` | `worker.js:183 / :226 / :97`（純関数） | 量子化ビュー（P4-2）に**コピーして**移植 |
| `rleEncodeMask` / `rleMaskForEach` | `app.js:3423 / :3437`（`{w,h,y0,y1,rows,pop}`形式） | P7 の出力形式整合の参照（コピーしてテストの参照実装に） |
| ffmpeg.wasm / webm-muxer | `vendor/` | （今回は不使用。**vendor同梱の前例**として、ort/opencv.js の同梱は方針上OKの根拠） |

※ icm.js の `dilate4/erode4/morphClose/gaussBlur` は**エクスポートされていない**。必要なら contour-lab 側に小さく再実装する（icm.js は変更しない）。

### 環境事実（2026-07-03 検証済み）

- node v24.15.0（`~/.nvm/.../bin/node`）、`google-chrome` = `/usr/bin/google-chrome`
- 旧セッションの検証資産: `contour-lab/test/test-contour.js`（純関数31テスト）と `contour-lab/test/driver.js`（puppeteer-core製e2e）に**退避済み**。`node_modules`（puppeteer-core ^23.11.1, 46MB）は旧scratchpad `/tmp/claude-1000/-home-maedatakeshi-palette-reducer-app/050e4eca-.../scratchpad/node_modules` に残存（**再起動で消える**。P0 で `npm i` し直すのが確実）
- テスト用実素材: `made/0513_03_moto.mp4`（1920×1080 30fps 610フレーム。**内容: 〜frame504=教室の男子、505〜=カレンダーの女子** の2シーン。カット検出の期待値に使う）
- e2e の既知の罠: **file:// のディスクキャッシュは sticky**（`setCacheEnabled(false)`で消えない）→ driver.js は**毎回アプリを一意な一時ディレクトリへコピーして開く**方式にしてある。`page.on('console')` は measureFps が rVFC ログを〜40行吐くので**出力を切り詰めない**こと
- git: 現ブランチ `fix/step4-merge-panel-modal`。**contour-lab/ は未追跡**。`PROJECT_OVERVIEW.md` と `design/` も未追跡だが**コミットに巻き込まない**（ユーザの領分）

---

## 4. 不変条件（設計上の約束。全フェーズで守る）

1. **線（lines）がラスタの唯一の真実。塗り（fill）は常に導出物**（`computeFill` の even-odd）。ワンド・スクリブル・モデル出力・PNGインポートも全部 **`maskToLines` アダプタ（P1-1で新設）で「線」に変換して**から取り込む。fill を独立に永続化・編集しない。
2. マスクのドメインは**動画ネイティブ解像度**。フレーム番号は**中心シーク `(f+0.5)/fps`**・`floor` 系の既存規約を維持（本体統合時の境界オフバイワン対策。メモリ参照）。
3. フレーム読込は**直列化ポンプ（pumpLoad）経由のみ**。新機能が勝手に `video.currentTime` を触らない（再生プレビュー P3-9 だけは例外で、終了時に必ずポンプで復帰）。
4. 純アルゴリズムは **DOM 非依存の純関数**として書き、`window.ContourLab` に載せ、`module.exports` ガードを付け、**node の unit テストを必ず付ける**（既存 snapFps/bresenham/computeFill/sobelRGBA と同じ作法）。
5. `S.comp` / `S.st` 作業バッファは computeFill / objectFloodAt が共用している。**新コードで再入的に使わない**（使うなら自前確保）。
6. Undo は**フレーム単位**の既存機構（差分 or snap）に載せる。新操作は必ず Undo 可能にする。**複数フレームに及ぶ一括操作は「触れたフレームごとに1エントリ」**。
7. rVFC を「一時停止中の動画のシーク待ち」に使わない（真っ白バグの原因。`seekTo` の 'seeked'+rAF 方式を維持）。
8. 依存追加はベンダリング（`contour-lab/vendor/`）のみ。CDN 参照・ビルドステップ禁止。**コア機能（手描き系）は file:// で動き続けること**。モデル系（P5）だけローカルHTTPサーバ前提でよい。

---

## 5. 作業の進め方

- ブランチ: 現 HEAD から `feature/contour-lab-p2` を切る。**最初のコミット = 現状の contour-lab/ 一式＋本計画書＋test/ 退避物（ベースライン）**。`git add contour-lab` のみ（PROJECT_OVERVIEW.md / design/ を含めない）。
- `contour-lab/PROGRESS.md` を P0 で作成。各項目ごとに「何をした／どう検証した（コマンドと実出力の要点）／未検証・既知の問題」を追記していく。会話の要約で消えても復元できる粒度で。
- 新規ファイル構成（P1-0 で骨組みを作る）:

```
contour-lab/
  index.html          （script を順に追加: ../icm.js → contour-lab.js → 各サブシステム）
  contour-lab.js      コア（状態・描画・入力・Undo・レイヤ）— 既存。window.CL を公開する改修を P1-0 で
  morpho.js           膨張/収縮/closing/細線化(Zhang-Suen)/maskToLines/RLE などの純関数群
  storage.js          IndexedDB 自動保存・プロジェクト入出力・ZIP書き出し・PNGインポート
  timeline.js         カット検出・タイムラインUI・シーン管理
  snapping.js         確定エッジスナップ・チェーン抽出・全線再吸着・折れ線ツール
  quantize.js         k-means量子化ビュー・ワンド（worker.js から移植した純関数を含む）
  slic.js             SLICスーパーピクセル・スクリブル・グラフ割当（＋maxflow）
  models.js           ONNX 下描き基盤＋各プロバイダ
  vendor/             ort など（P5 で追加）
  models/             モデル本体（.gitignore、README.md と download.sh だけコミット）
  test/
    test-contour.js   unit テストの入口（退避済み。P0 でパス修正・以後追記）
    driver.js         e2e 共通ドライバ（退避済み。P0 で複数シナリオ対応に）
    scenarios/        e2e シナリオ（P0〜）
    package.json      puppeteer-core（P0 で作成。node_modules は .gitignore）
```

- **新ファイルは通常の整形で書いてよい**（既存 contour-lab.js の1行圧縮スタイルに無理に合わせない）。既存ファイルへの edit は周辺の流儀に合わせる。
- 各ファイルは IIFE。共有は `window.CL`（内部API、§18 付録A）と `window.ContourLab`（純関数、テスト用）経由のみ。ロード順依存を減らすため、各サブシステムは `if (!window.CL) return;` でガード。

---

## 6. フェーズ一覧（依存と規模）

| フェーズ | 内容 | 依存 | 規模目安 |
|---|---|---|---|
| P0 | テスト基盤・ベースライン | - | S |
| P1 | 内部API・COWメモリ・保存/読込・一括入出力 | P0 | **L（最優先）** |
| P2 | カット検出・タイムライン・carryガード | P1 | M |
| P3 | 描画効率（エッジ強化・確定スナップ・折れ線・再吸着・小物） | P1（P3-3はP2推奨） | L |
| P4 | 領域選択（guided filter・量子化・ワンド・SLIC+スクリブル） | P1, P3-0 | L |
| P5 | AI下描き（ort基盤＋モデル実験群） | P1-4 | L（各実験は独立） |
| P6 | opencv.js（フローcarry・GrabCut精細化） | P2, P3-3 | M（オプション） |
| P7 | 本体統合用の出力形式凍結 | P1 | S |

規模: S=〜150行 / M=〜400行 / L=それ以上。P5・P6 は「実験」であり、**うまくいかなくても PROGRESS.md に結果を記録すれば完了扱い**（削除せず UI 上は β ラベルで残す）。

---

## P0. テスト基盤・ベースライン

### P0-1 unit テストの復旧
- `test/test-contour.js` の require パスを新配置に合わせて修正（`require('../contour-lab.js')`）。`node contour-lab/test/test-contour.js` で **31/31 PASS** を確認（前回セッションの合格実績値）。
- 以後、新純関数のテストはこのファイル（または同ディレクトリの分割ファイルを test-contour.js から require）に追記。

### P0-2 e2e ドライバの復旧・汎用化
- `test/driver.js` を確認し、次を満たすよう整理:
  - アプリ一式を**毎回一意な一時ディレクトリへコピー**してから `file://` で開く（sticky キャッシュ対策）。**コピー対象にリポジトリルートの `icm.js` を含め、`../icm.js` 参照が成立するディレクトリ構造にする**（`tmp/icm.js` + `tmp/contour-lab/…`）。
  - `#fileInput` へ `made/0513_03_moto.mp4` を投入 → `#view` の非透明画素率・スクリーンショット・任意の page 内評価関数、という既存の骨格をシナリオ関数として分離（`test/scenarios/*.js` を `node test/e2e.js <scenario>` で起動、共通部は driver.js）。
  - `test/package.json` を作り `npm i puppeteer-core@^23`（Chrome は `/usr/bin/google-chrome` を executablePath 指定）。`node_modules` は `.gitignore`。
- 最初のシナリオ `smoke`: 読み込み→api=yes/errs=0→描画1本→Undo→Redo。

### P0-3 付帯
- `contour-lab/.gitignore`（`test/node_modules/`, `models/*` except README/download.sh）。
- `test/check-version.js`: index.html 内の全 `?v=` が同一値であることを検査（unit 実行時に一緒に走らせる）。
- `PROGRESS.md` 作成、ベースラインコミット。

**受け入れ基準:** unit 31/31、`smoke` PASS、check-version PASS、ベースラインコミット済み、PROGRESS.md に実出力貼付。

---

## P1. 安全網（内部API・メモリ・保存・入出力）

### P1-0 内部APIの整備（挙動不変のリファクタ）
- contour-lab.js の IIFE 内共有物を `window.CL` に公開する（§18 付録A の一覧が正）。**挙動は一切変えない**。
- index.html に `<script src="../icm.js?v=N">` を contour-lab.js より前に追加（`self.ICM` が生える。名前衝突なし＝icm.js は IIFE）。
- **検証:** unit 全 PASS＋`smoke` PASS＋手で1分触って差異なし（ユーザ確認は不要、e2e でよい）。

### P1-1 COW（Copy-on-Write）メモリ改革 — 最重要バグ予防
**問題:** `fdata()` はフレーム×色ごとに lines+fill のフル Uint8Array（1080pで各2MB）を持つ。carry ON でスクラブすると**訪れた空フレーム全部に実体コピー**され、600フレーム×2色 ≒ **5GB でタブが落ちる**。

**設計:**
- `maybeCarry` は配列を**複製せず同じ Uint8Array への参照**を張り、`d.sharedLids: Set<lid>` に記録する。
- 新関数 `CL.writableLines(f, lid)`: shared なら `Uint8Array.from` でクローンして sharedLids から外し、以後の書込はそれへ。**全ての書込経路**（penInto / eraseInto / eraseSeg / objectFloodAt / shapeEdit / clearColorAction / clearFrameAction / applyCh / 今後の取込系）をこれ経由に改める。読み取り（rebuildMask / exportPng / findSnap 等）は従来どおり `d.lines.get()` でよい。
- fill は**現在フレームのものだけ保持**: `ensureFills` は S.cur 用に計算し、フレーム離脱時に「shared かつ untouched」なフレームの fill を捨てる（LRU 2〜3 フレーム分だけ残す）。lines が shared のフレームの fill は、carry 元の fill と同一なので**参照共有**でよい（クローン時に fill も無効化→再計算）。
- 「描画済み」判定の語彙を定める: `owned(f)` = lines を1色でも実体で持つ（sharedLids に無い）フレーム。タイムライン表示・保存・書き出しの対象は owned。
- **snap型 Undo エントリのRLE化**: `clearFrameAction`（:410）と `applyCh` の `type:'snap'` が持つフルバッファを、P1-2 で作る `rleFromBitmap/bitmapFromRle` に置き換える（一括取込系で 600MB 級に膨れるのを防ぐ）。

**新純関数（morpho.js / unit 必須）:**
- `rleFromBitmap(u8) -> Int32Array [start,len,...]`（線形インデックス上のラン）
- `bitmapFromRle(runs, N) -> Uint8Array`（ラウンドトリップのプロパティテスト: ランダム疎ビットマップ 100 ケース）

**受け入れ基準（e2e シナリオ `cow`）:**
- f0 に描画 → carry ON で f0→f300 まで連続スクラブ → `page.metrics().JSHeapUsedSize` が**300MB 未満**（COW 前は line バッファだけで 1.2GB 相当になるはず）。
- f150 で1画素消す → f0 と f299・f301 のマスク画素数が**変化していない**（エイリアシング事故がない）。Undo で f150 が戻る。
- unit: writableLines のクローン動作（同一参照→書込→別参照・元不変）。

### P1-2 プロジェクト保存（IndexedDB 自動保存＋ファイル入出力）
**目的:** リロード＝全滅の解消。600フレーム作業の前提条件。

**データ設計:**
- 動画署名 `sig = name + '|' + size + '|' + duration.toFixed(3)`（File オブジェクトから）。
- IndexedDB `contour-lab` v1:
  - store `meta`（key: sig）: `{sig, name, W, H, fps, total, layers:[{id,name,color,visible,opacity}], nextLid, cuts:[frameIdx...], savedAt}`
  - store `frames`（key: [sig, frameIdx]）: `{lines: {lid: runs(Int32Array)}, touched:[lid...]}` — **owned フレームのみ**。fill・Undo・shared(carry) は保存しない（carry はリロード後もナビゲーション時に再導出される。挙動が同じことを e2e で確認）。
- 自動保存: `commitChanges`/shape系/一括取込の後に**そのフレームだけ** debounce 800ms で書き込み。レイヤ・カット変更は meta を書き込み。保存中インジケータ（ヘッダに「保存済み HH:MM:SS」）。
- 復元: `loadVideo` 完了時に sig 一致の meta があれば自動復元してトースト（「前回の作業を復元しました（Nフレーム）」）。
- プロジェクト一覧: パネルに小さな「プロジェクト」節（保存済み sig 一覧・サイズ・削除ボタン）。
- ファイル書き出し/読み込み: 上記と同内容の単一 JSON（runs は通常配列化）`*.contourlab.json`。インポートは sig 不一致でも「現在の動画に適用」を選べる（フレーム数が違えば切り詰め警告）。
- **fps 変更ガード:** owned フレームが存在する状態で fpsInput を変更しようとしたら confirm（「フレーム番号がズレます」）。

**受け入れ基準（e2e `persist`）:** 描画→800ms 待ち→ページ再読込→同じ動画を読込→マスク画素が**ピクセル一致**（canvas 読み戻し比較）。エクスポート→IndexedDB 全消し→インポート→一致。unit: JSON⇄内部形式の往復。

### P1-3 一括書き出し（ZIP・レイヤ別PNG連番）
- 新純関数 `zipStore(files:[{name, data:Uint8Array}]) -> Uint8Array`（**無圧縮 ZIP**。PNG は圧縮済みなので store で十分。CRC32 テーブル込みで〜100行。unit: 生成物を `unzip -t` で検査するテストを test に含める＝node の child_process で unzip 実行、無ければ skip 表示）。
- UI「書き出し」節に追加: 「全マスクを書き出し（ZIP）」
  - 範囲: 所有フレームのみ / 全フレーム（carry を実体化） のラジオ。
  - 形式: レイヤ別 8bit グレースケール PNG `mask_L{lid}_f{00000}.png`（線∪塗り=255）＋ `manifest.json`（meta 相当＋ `frames` 一覧）。canvas.toBlob を直列 for ループ＋進捗表示（rebuildMask とは独立の一時 canvas）。
- 既存の単発 PNG 書き出しは温存。

**受け入れ基準:** e2e で 3 フレーム描画→ZIP 生成→（driver 側で）`unzip -l` にエントリが期待どおり、1 枚を page 内で decode して元マスクと一致。

### P1-4 マスクインポート（PNG連番 → 下描きの共通受け口）
**目的:** SAM バッチ（thxserv）・将来のモデル出力・他ツール出力を「下描き」として受け入れる唯一の口。

- **新純関数 `maskToLines(mask, W, H) -> Uint8Array`（morpho.js・本計画の要石）**: mask 画素のうち 4近傍に mask 外（or 画像端）がある画素=内側境界を線とする。
  - **プロパティテスト必須:** ランダムなブロブ（円の和・穴あき・画面端接触・1px細部）に対し `computeFill(maskToLines(R)) ∪ maskToLines(R) == R` が**厳密一致**すること（even-odd と 8近傍線/4近傍成分の組合せで成立する設計。壊れるケースが見つかったらその形状を unit に固定して修正）。
- UI「読み込み」節（新設）: 「マスクPNGを読み込む」（multiple 可）。
  - ダイアログ: 適用先レイヤ（既定=アクティブ）、開始フレーム、ステップ（1枚おき等）、しきい値（輝度>127 既定）、合成（置換/OR）。ファイル名に `f\d{5}` があればフレーム自動対応（P1-3 の命名と往復できる）。
  - 各フレーム: 2値化→`maskToLines`→`writableLines` へ（置換時は snap型 Undo、OR 時は差分 Undo）。→ fill 再計算。
- **受け入れ基準（e2e `io-roundtrip`）:** P1-3 で書き出した ZIP を展開した PNG 群を再インポート→全フレーム画素一致。手動: thxserv 産の任意マスク PNG を 1 枚読ませて表示崩れがない（ユーザ確認項目に回す）。

---

## P2. カット検出・タイムライン

### P2-1 解析パス（HSVヒストグラム全フレーム）
- `timeline.js`。`ICM.hsvHist` / `ICM.histIntersectionDistance` を使用。
- 実装: 解析ボタン（またはプロジェクト未解析時に読込後トースト提案）→ pumpLoad を止めた専用ループで f=0..total-1 を**中心シーク**→短辺 96 の使い回しキャンバスに drawImage→hist→前フレームとの距離を配列に。進捗バー＋キャンセル。610 フレームで 15〜40 秒想定（実測を PROGRESS に記録）。
- 結果（距離配列と cuts）は meta に保存（P1-2）。再解析しない限り再利用。

### P2-2 しきい値と手動修正
- `detectCuts(jumps, sens) -> frameIdx[]`（**純関数**）: `threshold = min(0.82, max(sens, med + 3*MAD))`（app.js:926-937 の式・コメントごと移植。sens 既定 0.5、パネルに数値入力）。連続超過は先頭のみ採用。
- unit: 合成 jumps（ノイズ0.1±、カット0.9）で期待位置、MAD=0 の全平坦、しきい値キャップの各ケース。
- タイムライン上でカットの**手動追加/削除**（境界クリック→トグル。cuts は meta 保存）。

### P2-3 carry のカット境界ガード
- `CL.sceneIndexOf(f)`（cuts から導出）。`maybeCarry`: `sceneIndexOf(prev) !== sceneIndexOf(f)` なら**引き継がない**。シーン内なら従来どおり（COW なので遠距離ジャンプの carry もコスト無し）。
- **受け入れ基準（e2e `cuts`）:** 0513_03_moto.mp4 で検出カットが **frame 505±2 に1個以上**（メモリの実測: シーン 0–504 / 505–609）。f504 に描画→f505 へ→**carry されない**。f503→504 は carry される。

### P2-4 タイムライン UI
- スライダ直下に高さ〜28px の canvas 帯:
  - シーンを交互の淡色で塗る／カット位置に縦線
  - **owned フレーム = 実線ティック、shared(carry) = 淡ティック**
  - 現在位置の針。クリック/ドラッグでシーク（requestFrame 経由）
  - シーン頭/末尾へのジャンプボタン（`Shift+←/→` も割当）
- 描画は frames/cuts 変更時と nav 時に再描画（rAF スロットル）。

**受け入れ基準:** e2e でティック数=所有フレーム数、クリックで frameLabel が変わる。手動チェック項目: 帯の見やすさ。

---

## P3. 描画効率

### P3-0 エッジ参照の強化（コスト場の共通基盤）
- `sobelRGBA`（輝度）→ **`ICM.colorSobelMag`（RGB各chのmax）ベース**に変更した新純関数 `edgeFieldRGBA(imgData, thresh)`（表示用: NMS+二値化は既存ロジックを流用）と `costField(imgData) -> Float32Array`（**NMS前の生の強度**。スナップ用）。
- しきい値スライダ（10〜80、既定30）をパネル「参照・補助」に追加。**edgeCache のキーを `f:thresh` に変更**（現在は f のみ :211。パラメタ変更時に古いのが出るバグを作らないこと）。costField は LRU2（1080p Float32 = 8MB/枚）。
- unit: 等輝度で色相だけ違う縦縞に対し、輝度Sobelでは反応せず colorSobel では反応すること。
- （任意）guided filter（P4-1）ON 時は平滑化後の画像から計算。

### P3-1 ストローク点列の記録
- ペン描画中、`S.strokePts: [[x,y],...]` に始点と各 move の到達点を追記（bresenham の入力点列）。`endStroke` 後 `S.lastStroke = {frame, lid, pts, undoIndex}` として保持（次の操作まで）。折れ線ツール（P3-4）も同形式で残す。

### P3-2 確定エッジスナップ（キー **W** / ボタン「直前の線をエッジへ吸着」）
**ユーザの本命機能。** 雑に描く→W→その線が近くの色エッジに吸着。レビュー可・Undo一発。

- アルゴリズム（snapping.js、コアは純関数）:
  1. 対象 = `S.lastStroke`（無ければトースト）。**閉ループ（端点スナップで自動閉合したストローク）は v1 対象外**→トースト「閉じた線は『全線を再吸着』を使ってください」。
  2. その Undo エントリを巻き戻す（pop→applyCh('old')）。
  3. 回廊 = pts を半径 R（スライダ 2〜16、既定6）で膨張した領域の bbox 内マスク。
  4. コスト格子: `cost(p) = 1 + 8 * (1 - mag(p)/magMax)`（magMax は回廊内最大値、回廊外 = 通行不可）。斜め移動は √2 倍。
  5. 端点: 元の始点/終点それぞれの半径3以内で mag 最大の画素へ**固定**。
  6. Dijkstra（純関数 `dijkstraPath(cost, W, H, bbox, s, t) -> [[x,y],...]`。バイナリヒープ実装）で最小コスト経路 → その点列を bresenham で lines に描画（8連結は経路の性質で保証されるが、保険で bresenham を通す）→ `commitChanges` で**1エントリ**として積む。
  7. トースト「エッジに吸着（移動量 平均N.Npx）」。W をもう一度押しても再適用はしない（lastStroke は消費済み）。Undo で吸着前の線に戻る（=手順2の巻き戻しと合わせ、Undo 2回で完全に元どおり。**Undo 1回=「吸着をやめてラフ線に戻す」になるよう、手順2の pop と手順6の push を1つの複合エントリにまとめるのが正**。実装は「old=ラフ線の diff、new=吸着線の diff」を合成した1差分にする）。
- unit: 合成コスト場（sin カーブ状の谷）で経路が谷を±1px で追うこと／回廊外に出ないこと／始終点固定。
- e2e `snap-stroke`: 実フレームで既知エッジ（ブレザーの輪郭など固定座標）から 3px ずらした直線を programmatic に描く→W→経路上の平均 mag が元ストローク比で**増加**すること。
- **手動チェック（ユーザ）:** 描き味・吸着の「正しさ」の体感。R とエッジしきい値の既定値調整はユーザのフィードバックで。

### P3-3 チェーン抽出と「全線を再吸着」（キー **R**、βラベル）
**carry したフレームの線が数px ズレているのを一括修正 = 疑似トラッキング。**

- 純関数 `traceChains(lines, W, H) -> {open: pts[][], closed: pts[][]}`: 8近傍の次数マップ→次数1=端点から辿って open チェーン（次数3以上=分岐点でチェーンを切る。分岐点は複数チェーンの共有端点）→残った次数2の画素は closed ループ。unit: L字/T字（3本）/ロープ（closed 1本）/ロープ+しっぽ。
- 適用: アクティブ色の全チェーンに対し
  - open: P3-2 と同じ回廊 Dijkstra（**端点が分岐点なら固定**、次数1端点のみ再吸着）
  - closed: アクティブ輪郭ライト＝各点を法線方向±3px でコスト最小へ移動（近傍平滑 λ=0.3、20 反復、1px 等間隔リサンプル）→ bresenham で再ラスタ化
- 全体を 1 フレーム 1 Undo（snap型・RLE）。適用後 fill 再計算し、**塗り画素数が激減（>30%減）したら自動で巻き戻してトースト**（「再吸着で領域が壊れるため中止」＝リークの保険）。
- e2e `resnap`: f100 に手動相当の線→f101 へ carry→フレーム内容は動いている→R→平均 mag 改善 & fill 画素数維持。
- **リスク:** 分岐だらけの線・激しい動きでは壊れる。βとして出し、結果を PROGRESS に記録（うまくいかない場合の発展は P6-2 フロー併用）。

### P3-4 直線・折れ線
- ペン中 **Shift+クリック** = 直前ストローク終点（無ければ何もしない）から直線を1ストロークとして引く。
- 新ツール「折れ線」（キー **P**）: クリックで頂点追加（ラバーバンド表示）、**ダブルクリック or Enter で確定**（全体を1ストロークとして bresenham ラスタ化・端点スナップ適用・strokePts に点列格納→W で吸着可能）、**Esc** キャンセル、**Backspace** で最後の頂点削除。確定前は lines に触れない（プレビューは render のオーバーレイ描画）。
- e2e: プログラム的に 3 頂点→Enter→期待画素数±、Esc で無変化。

### P3-5 他レイヤへの端点スナップ
- `findSnap`(:283) にオプション「他の色にも吸着」（チェックボックス、既定ON）: 全**可視**レイヤの lines を対象に端点探索（描き込み先はアクティブ色のまま）。キャラ同士の共有境界の二度手間対策。
- unit: 2レイヤ間スナップの座標一致。

### P3-6 オニオンスキン（キー **O**）
- トグル: 前フレームの線を橙系・次フレームの線を青系の半透明（α0.35）で現在マスクの下に表示。owned/shared 問わず「そのフレームのデータ」を描く。実装は rebuildMask とは別の小さな合成（線のみなので ImageData 全走査せず runs 走査でもよい）。キャッシュはフレームnav毎に無効化。
- 用途注記（ヘルプ）: carry OFF で参照しながら描き直す用。

### P3-7 ミニマップ
- ステージ右下 180×?px の canvas: frameBmp の縮小＋現在ビューポート矩形。ドラッグでパン。倍率 8×以上のときだけ表示（それ未満では邪魔）。render 時に rAF スロットルで更新。

### P3-8 小物（まとめて1コミットで可）
- キー割当の再編（**既存の「1=等倍」を「0=等倍」へ移動**）: `1〜9` = 色レイヤ選択、`0` = 等倍、`[` `]` = 消しゴム幅、`T` = **端点ハイライト**（次数1の線画素に黄色マーカー。線の「切れ目探し」用。P5-2 の線画取込でも活躍）、Alt+クリック（レイヤの表示チェック）= ソロ表示トグル。
- index.html のヘルプ節と title 属性を全部更新。§18 付録C のキー表を正とする。

### P3-9 再生プレビュー（キー **,** / ▶ボタン）
- 目的: 通しで見てマスクのチラつき・ズレを QA。
- 実装: `S.video.play()`＋rVFC ループ（**再生中は発火する**ので使ってよい）。各コールバックで `f = round(mediaTime*fps - 0.5)` → 元フレーム描画＋そのフレームの**線のみ**を軽量合成（レイヤ別オフスクリーン線キャッシュ LRU60。fill 合成は重いので再生中は線だけ、と明記）。速度 1x/0.5x/0.25x セレクト。シーン末尾で自動停止オプション。
- **終了時（停止ボタン/Esc/シーン末）に必ず `S.cur=-1; requestFrame(f)` でポンプ復帰**（不変条件3）。
- e2e: 2秒再生→エラー0→停止後に frameLabel と表示が一致。

---

## P4. 領域選択パラダイム（「描く」から「選ぶ」へ）

### P4-1 guided filter（前処理・純関数）
- `guidedFilterRGB(src, W, H, r=6, eps=1e-3(0..1スケール)) -> Uint8ClampedArray`。ボックスフィルタは積分画像で O(N)。ガイド=入力自身（エッジ保存平滑化）。1080p で重ければ内部半解像度→バイリニア戻しのオプション。
- パネル「参照・補助」に「平滑化（AAつぶし）」トグル: ON のとき **エッジ参照（P3-0）・量子化（P4-2）・SLIC（P4-4）への入力**を平滑化画像にする（表示の元画像は変えない）。
- unit: ステップエッジ保存（遷移幅が広がらない）／ガウスぼかしランプの最大勾配が**上がる**／平坦+ノイズの分散低下。

### P4-2 量子化ビュー（キー **Q**）
- worker.js から `weightedKMeans`(:183) `initCenterSequence`(:226) と、`buildBucketCandidates`(:97) の**簡略版**（5bit バケツ集計で色候補+重みを作る）を quantize.js へ**コピー移植**（出典コメント付き。worker.js は変更しない）。
- 手順: 現在フレーム（平滑化 ON ならその画像）を短辺 270 に縮小→バケツ集計→ K-means（K スライダ 4〜24、既定12、iters 10）→**ネイティブ解像度の各画素を最近傍センターに割当**→ `labelMap: Int16Array(N)` とポスタライズ表示 canvas。キャッシュ: `f:K:平滑化` で LRU3。計算は同期で 100〜300ms 想定（超えるなら縮小率を下げる。実測を PROGRESS へ）。
- UI: 「量子化表示」トグル＋K スライダ（表示は srcOpacity と同じ層で元画像を置換）。
- e2e: ON でユニーク色数 ≤ K（canvas 読み戻し）。

### P4-3 ワンドツール（キー **A**）
- クリック → `labelMap` 上で同ラベル 4近傍 flood → 領域マスク → **`maskToLines` → アクティブ色へ OR 合成**（1 Undo 差分、トースト「領域を追加（Npx）」）。
- 量子化がまだ無ければその場で計算。tolerance は「ラベル一致」のみ（v1）。**追加専用**（除去はオブジェクト消しゴムで賄う旨をヘルプに明記）。
- e2e `wand`: 女子シーンの髪をクリック→非空・封止（fill が返ること＝maskToLines の性質）→Undo で消える。
- **手動チェック:** クリック数回でどこまで拾えるか（AA 残渣がヒゲ状に残るなら K や平滑化を調整）。

### P4-4 SLIC スーパーピクセル＋スクリブル割当（本命・キー **X**）
- `slicSuperpixels(rgb, W, H, cellSize=12, m=10, iters=5) -> {labels: Int32Array, count}`（純関数、slic.js）。入力は短辺 360 へ縮小した（平滑化済み）画像。ネイティブへは最近傍アップサンプル。〜150ms 目標。
- unit: セル数が (W/cell)*(H/cell) ±30%、ラベル連結性（各ラベルが1成分）、単色画像で格子状。
- スクリブルツール: 太ブラシ（幅 20px、円スタンプ）で**レイヤ別の落書き**を描く（背景用に擬似レイヤ `bg` を固定で用意。lines とは別バッファ `d.scribbles: Map<lid|'bg', 疎点列>`、プロジェクト保存対象 v2 スキーマ）。
- 割当 v1（既定・高速）: スーパーピクセル隣接グラフ（平均 Lab 色）上で、スクリブルが触れた sp を種に**多始点 Dijkstra**（辺重み = ΔLab²+ε）→各 sp は最も近い種のラベル。スクリブル 1 ストロークごとに再解 <30ms →**ライブに淡色プレビュー**。
- 割当 v2（トグル「精密（グラフカット）」）: レイヤごとに 2値 maxflow（BK法の JS 移植 `maxflow.js`、純関数。unit: 手計算できる 4〜6 ノードのグラフでミンカット一致）。unary = v1 の距離から、pairwise = λ/(1+ΔLab)。v1 と結果比較のスクショを PROGRESS へ。
- 「確定」ボタン: 各レイヤの sp 集合→ネイティブマスク→ `maskToLines` →レイヤ lines を**置換**（snap型 Undo・RLE）。スクリブルは残す（後で直せる）。
- **P4-4b（実験）スクリブル carry:** 次フレームが空ならスクリブルを引き継ぎ自動再解→「線」ではなく**種を運ぶ**伝播。カットガードは P2-3 と同じ。ボタン「スクリブルで次フレームを自動生成」。
- e2e `scribble`: キャラ1本+背景1本の合成スクリブル→確定→キャラマスク非空・封止・Undo可。
- **手動チェック（重要）:** 男子/女子シーン各1フレームで、スクリブル何本で実用マスクになるか。輪郭線（黒線）の所有がどちらに落ちるか（ヘルプに「境界の線は線上にスクリブルすると制御できる」と記載）。

---

## P5. AI下描き（すべて実験・独立・オプショナル）

### 共通設計 P5-0（models.js＋配布）
- **onnxruntime-web をベンダリング**: `contour-lab/vendor/ort/` に `ort.min.js`＋wasm 一式（webgpu/jsep 含む。npm の `onnxruntime-web` パッケージ dist からコピー。**バージョンと必要ファイル名は実装時に要検証**）。`ort.env.wasm.wasmPaths='./vendor/ort/'`、EP は `['webgpu','wasm']` フォールバック。
- **モデル置き場**: `contour-lab/models/`（**gitignore**）。`models/README.md`（各モデルの入手元・ライセンス・変換手順・sha256）と `models/download.sh`（curl のひな型）だけコミット。**URL はすべて要検証**。
- **file:// では動かない**（fetch/wasm 制約）→ モデル系 UI は起動時に `fetch('./models/manifest.json', HEAD)` 相当で存在確認し、無ければ節ごとグレーアウトして「ローカルサーバで開いてモデルを配置してください（`python3 -m http.server` をリポジトリルートで）」と表示。**コア機能は file:// で従来どおり動くこと（回帰確認）**。
- 共通IF: `CL.registerDraft({id, label, kind:'edge'|'lines'|'mask'|'depth', load()->session, run(imgData)->Promise<Float32Array|Uint8Array>})`。パネル「AI下描き（β）」: プロバイダ選択／対象（現在フレーム・シーン内 N フレームおき）／適用先レイヤ／実行・進捗・キャンセル。
- 前処理ヘルパ（純関数）: レターボックス resize、正規化（mean/std 可変）、出力の bilinear 戻し。
- 結果の取り込みは kind 別アダプタ:
  - `edge` → P3-0 のコスト場・エッジ表示を**差し替え**るトグル（「AIエッジを使う」）
  - `lines` → 2値化スライダ→ **Zhang–Suen 細線化**（morpho.js、純関数、unit: 十字/太線→1px・連結保存）→（任意 morphClose）→レイヤへ取込（snap型 Undo）→ **T キーの端点ハイライトで切れ目を手で閉じる**
  - `mask` → しきい値→最大成分のみ（任意）→ `maskToLines` →レイヤへ
  - `depth` → しきい値スライダ＋プレビュー→ mask 扱い
- 各モデルの受け入れ基準は共通: 男子/女子シーン各1フレームで (a) クラッシュせず (b) 出力が視覚的に妥当 (c) 取込アダプタが機能、を PROGRESS.md にスクショ＋所要時間つきで記録。**品質が実用未満でも「記録して完了」**。
- **ライセンス注意（商用前提）**: 各モデルの重みライセンス・学習データ由来を README に記録。SAM 系は Meta SAM License（商用条件**未確認**のまま。マスク出力を内製ツールの下描きに使う分にはリスク低だが、判断はユーザに委ねる注記を README に）。

### P5-1 学習済みエッジ（TEED / PiDiNet）→ エッジ参照・スナップ強化
- 候補: **TEED**（〜58Kパラメータ、超軽量）または PiDiNet tiny。**ONNX 既製が無ければ thxserv（`~/miniforge3/envs/sam3/bin/python`, torch 2.10 環境あり）で export**（手順を README に残す）。
- 期待: AA・テクスチャに強い知覚エッジ → W スナップ（P3-2）の当たりが良くなる。Sobel との比較スクショ必須。

### P5-2 アニメ線画抽出 → 「線」下描き
- 候補: **Anime2Sketch**（要 ONNX 変換・要検証）／informative-drawings（anime style）／MangaLineExtraction 系。
- 取込は `lines` アダプタ一式（2値化→細線化→端点ハイライトで手閉じ→領域クリック割当は既存ワンド A で「fill されていない閉領域をクリック→その色に」）。**even-odd 塗り機構がそのまま使える相性最良の実験**。閉じない場合の補助として morphClose(1) トグル。

### P5-3 アニメ特化キャラ切り抜き（anime-segmentation / ISNet系）
- 候補: **SkyTNT/anime-segmentation の isnet ONNX**（要検証。fp16 で〜40-90MB 想定）。入力 1024 レターボックス。
- kind=mask。**背景/キャラ分離という目的に最も直球**。シーン内 N=10 フレームおきに下描き→間は carry+R（P3-3）で埋める運用を試す。

### P5-4 クリック指示セグメント（SlimSAM / MobileSAM）
- 候補: **Xenova/slimsam-77-uniform の ONNX ペア（encoder/decoder 分離）**を onnxruntime-web で（transformers.js を使うなら `env.localModelPath` でローカル配置。**ネット依存禁止**。要検証）。
- UX: 「SAMモード」中はクリック=+点、Alt+クリック=−点→デコーダは点変更ごとに即時（エンコーダ埋め込みはフレームごとに1回、LRU2）→プレビュー→確定で mask アダプタへ。
- 注意: アニメのドメインギャップは既知（サーバ検証で確認済み）。**「下描きとして使えるか」だけを判定**。

### P5-5 単眼深度（Depth Anything V2 small）
- 候補: **onnx-community / depth-anything-v2-small 系 ONNX**（要検証、fp16〜25MB級）。
- kind=depth: 深度ヒストグラム表示＋しきい値スライダ→「手前=キャラ」仮説の下描き。色ベース（P4-4）と直交する prior なので、ダメでも比較記録に価値。

---

## P6. opencv.js（オプション・ゲート付き）

**ゲート:** P3-3（再吸着）と P4-4（スクリブル）で「carry 伝播の実用性」が不足と判断された場合のみ着手（判断根拠を PROGRESS に）。

### P6-1 ベンダリング
- `vendor/opencv/opencv.js`（〜9-11MB、公式ビルド。**要検証**: 必要モジュール calcOpticalFlowFarneback / grabCut が含まれる配布物か確認）。遅延ロード（モデル系と同じくローカルサーバ前提・グレーアウト方式）。

### P6-2 フロー carry（実験）
- prev/next を短辺 360 グレー化→ Farneback → **traceChains（P3-3）で得たチェーン点列をフローで移流**→ bresenham 再ラスタ化 →（任意）続けて R 相当の再吸着。ボタン「前フレームから追従コピー（β）」＝ carry の上位互換。
- 受け入れ: パン系の区間で線が 2px 以内に追従（目視+マスク差分数）。

### P6-3 GrabCut ぱっきり精細化（実験）
- サーバ検証で有効だった「GrabCut: 色GMMグラフカット、640px 縮小で実行」の移植: 現レイヤ mask を PR_FGD/PR_BGD 初期化に落とし→ grabCut 数反復→ 出た mask を `maskToLines` で戻す（snap型 Undo）。ボタン「境界をぱっきり（β）」。
- 受け入れ: 境界が色エッジに沿う（スクショ比較）、fill 破壊時の自動巻き戻し保険（P3-3 と同じ >30% ルール）。

---

## P7. 本体統合準備（形式凍結のみ・実装しない）

- P1-3 の `manifest.json` を拡張し、**本体取込用 JSON** を「書き出し」に追加: `{version, fps, W, H, scenes:[{startF,endF}], layers:[...], frames:{f:{lid:runs}}}`。フレームキーは本体規約（`floor(at*fps)`、シーン `[round(start*fps), round(end*fps))`）で解釈できることをコメントで明記。
- 変換の正しさは unit で担保: `bitmapFromRle(runs)` → **app.js:3423 `rleEncodeMask` をテストファイルへコピーした参照実装**に通し、`{rows,pop}` が一致（=本体の RLE 機構で読める形になっている）。
- 本体側の取込 UI は**別計画**（やらない）。

---

## 15. テスト戦略まとめ

```
node contour-lab/test/test-contour.js        # unit（純関数）＋ check-version。全項目で常時グリーン維持
node contour-lab/test/e2e.js <scenario>      # e2e（puppeteer-core + /usr/bin/google-chrome）
```

| シナリオ | フェーズ | 内容 | 備考 |
|---|---|---|---|
| smoke | P0 | 読込→描く→Undo/Redo→エラー0 | 毎項目後に回す最小回帰 |
| cow | P1-1 | 300F スクラブのヒープ上限・エイリアシング無し | metrics は V8 ヒープのみの近似と明記 |
| persist | P1-2 | リロード復元・エクスポート/インポート一致 | |
| io-roundtrip | P1-3/4 | ZIP→PNG→再インポート一致 | unzip が無ければ skip 表示 |
| cuts | P2 | カット位置 505±2・carry ガード | 遅い（〜1分）: slow マーク |
| snap-stroke | P3-2 | 吸着で平均勾配が増える | |
| resnap | P3-3 | carry→R で改善・fill 維持 | β品質でよい |
| wand / scribble | P4 | 領域追加・封止・Undo | |
| models-* | P5 | モデル配置時のみ実行（無ければ skip） | ローカルサーバ起動を内包 |

- e2e 共通: アプリ＋`icm.js` を一時ディレクトリへコピー（../ 参照維持）、コンソール全量記録、スクショを `test/out/`（gitignore）へ。
- **手動受け入れ（ユーザ＝前田さん向けチェックリスト）**: 各フェーズ完了時に PROGRESS.md に「ユーザ確認待ち」節を作り、次を列挙する。P1: 復元の安心感・保存表示／P2: タイムラインの見やすさ・カット精度／P3: **W スナップの気持ちよさ（本命）**・折れ線・再吸着β／P4: スクリブル何本で1フレーム作れるか／P5: 各モデル下描きの使用感。**現状「対話的な実操作は一度もユーザ検証されていない」**（メモリより）ので、P1 完了時点で一度触ってもらうこと。

---

## 16. リスクと対策（横断）

| リスク | 対策 |
|---|---|
| fps 自動計測ミス・VFR 動画でフレーム番号がズレる | 既存の手動 fps 上書きを維持＋P1-2 の fps 変更ガード＋PNG連番インポート（P1-4）が最終逃げ道 |
| IndexedDB 容量 | RLE 線データは 1F/1色 ≒ 8-16KB → 600F×2色 ≒ 10-20MB で余裕。quota エラーは捕捉してトースト |
| 一括操作の Undo メモリ | snap型を RLE 化（P1-1）。フレームあたり undo スタック上限 50（超過で古いのを捨てる、トースト無しで可） |
| モデルURL・形式の陳腐化 | すべて「要検証」。ダメなら thxserv で変換（環境はメモリ `sam3-bg-separation-trial` に詳細） |
| WebGPU 不在環境 | wasm フォールバック（遅いだけ）。実測を PROGRESS に |
| キー割当の衝突 | §18 付録C を唯一の正とし、追加時はそこを更新してからコード |
| getEdge 等キャッシュのパラメタ取り違え | キャッシュキーに必ず全パラメタを含める（P3-0 の教訓を横展開） |

---

## 17. 完了の定義

- P0〜P4 が受け入れ基準を満たし、unit / e2e が全グリーン、ユーザの手動チェックで P3-2（Wスナップ）と P4-4（スクリブル）の**どちらかが「これで作業できる」評価**を得ること。
- P5 は各プロバイダの実験記録（動く/動かない・品質・速度・ライセンスメモ）が PROGRESS.md に揃っていること。
- P6 はゲート判断の記録があること（着手しない判断も可）。
- P7 の JSON が unit（本体 RLE 参照実装との一致）を通ること。

---

## 18. 付録

### 付録A: `window.CL` 内部API（P1-0 で公開。これが正）

```js
window.CL = {
  S, dom,                         // 状態・DOM辞書（読み取り自由。書込は下記の関数経由）
  requestFrame(f), scheduleRender(), render(), toast(msg),
  fdata(f), layerLines(f, lid, create),
  writableLines(f, lid),          // P1-1: COW解決。全ての書込はこれを通す
  newFill(lines), ensureFills(f),
  commitChanges(f, lid, changedMap), pushUndo(f, entry), updateUndoButtons(),
  activeLayer(), setActive(lid), addLayer(),
  setTool(name),                  // ツール追加は pointerdown/move/up の分岐追加＋setTool の許容値追加で行う
  owned(f), sceneIndexOf(f),      // P1-1 / P2-3
  getCostField(f), getEdgeCanvas(f), // P3-0
  maskToLines(mask), rleFromBitmap(u8), bitmapFromRle(runs, N), // morpho.js（純関数の再エクスポート）
  registerDraft(provider),        // P5-0
};
```

### 付録B: プロジェクトJSONスキーマ（P1-2。v1）

```json
{
  "format": "contour-lab-project", "version": 1,
  "video": {"sig": "0513_03_moto.mp4|33305794|20.330", "name": "0513_03_moto.mp4",
             "W": 1920, "H": 1080, "fps": 30, "total": 610},
  "layers": [{"id": 1, "name": "キャラA", "color": [255,64,64], "visible": true, "opacity": 1}],
  "nextLid": 2,
  "cuts": [505],
  "frames": {"0": {"1": [12345, 8, 14400, 3]}}
}
```
（`frames[f][lid]` = 線形インデックスの `[start,len,...]`。v2 で `scribbles` を追加予定。version 不一致は前方拒否・後方移行。）

### 付録C: キー割当表（これが唯一の正。ヘルプ節と同期させる）

| キー | 機能 | 既存/新規 |
|---|---|---|
| B / E | ペン / 消しゴム | 既存 |
| P | 折れ線ツール（Enter確定・Esc取消・BS頂点削除） | P3-4 |
| A | ワンド | P4-3 |
| X | スクリブル | P4-4 |
| S | 端点スナップON/OFF | 既存 |
| W | 直前の線をエッジへ吸着 | P3-2 |
| R | 全線を再吸着（β） | P3-3 |
| Q | 量子化表示 | P4-2 |
| O | オニオンスキン | P3-6 |
| T | 端点ハイライト | P3-8 |
| D / G | エッジ参照 / グリッド | 既存 |
| F | 全体表示 | 既存 |
| **0** | **等倍（旧: 1。移動に注意）** | P3-8 |
| 1〜9 | 色レイヤ選択 | P3-8 |
| [ / ] | 消しゴム幅 −/＋ | P3-8 |
| , | 再生プレビュー | P3-9 |
| ← / → | フレーム送り | 既存 |
| Shift+← / → | シーン頭 / 次シーン | P2-4 |
| Home / End / Ctrl+Z / Ctrl+Y / Space | 既存どおり | 既存 |
| Shift+クリック（ペン） | 直前終点から直線 | P3-4 |
| Alt+クリック（レイヤ表示） | ソロ表示 | P3-8 |

### 付録D: thxserv 側（本計画の外・参考）
- SAM 3.1 の一括マスク出力を P1-4 で読むときの規約: `mask_L{lid}_f{00000}.png`（8bit グレー、255=対象）。既存 Gradio ツール／環境の詳細・再起動手順はメモリ `sam3-bg-separation-trial` に全部ある（`ssh maeda@thxserv.sspnet`、`~/sam3-bg/`、env `~/miniforge3/envs/sam3`）。ONNX 変換作業もこの環境で可能。
