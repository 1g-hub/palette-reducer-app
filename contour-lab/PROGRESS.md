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
