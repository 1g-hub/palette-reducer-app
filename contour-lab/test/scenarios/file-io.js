'use strict';
/* file-io (ユーザ未検証の実ファイル流れ): 実ブラウザのダウンロード＆実ファイル入力で
   ①ZIP書き出し → unzip → PNG/manifest 検証
   ②その PNG を実UI(#importMask)で読み戻し → 元マスクと画素一致（マスクPNG取込の実証）
   ③プロジェクトJSON 書き出し → 解析 → クリア → 実UI(#importProject)で読込 → 復元
   成果物は test/out/file-io/ に残す（ユーザが中身を確認できるように）。 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

module.exports = {
  name: 'file-io',
  serve: true,
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const OUTDIR = path.join(__dirname, '..', 'out', 'file-io');
    fs.rmSync(OUTDIR, { recursive: true, force: true }); fs.mkdirSync(OUTDIR, { recursive: true });
    await ctx.enableDownloads();
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const rect = async (ox, oy, w, h) => { const p = [[cx + ox, cy + oy], [cx + ox + w, cy + oy], [cx + ox + w, cy + oy + h], [cx + ox, cy + oy + h], [cx + ox, cy + oy]]; await page.mouse.move(p[0][0], p[0][1]); await page.mouse.down(); for (let i = 1; i < p.length; i++) await page.mouse.move(p[i][0], p[i][1]); await page.mouse.up(); await sleep(120); };
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 10000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); } return false; }
    // (f,lid) の最終マスク(線∪塗り)の画素数
    const maskCount = (f, lid) => page.evaluate((f, lid) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let c = 0; for (let i = 0; i < a.length; i++) if (a[i] || fl[i]) c++; return c; }, f, lid);

    // --- 準備: f0 に色1,色2、f5 に色1 ---
    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    await goto(0); await page.evaluate((l) => window.CL.setActive(l), lid1); await rect(-70, -50, 90, 70);
    await page.evaluate(() => window.CL.addLayer()); const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    await rect(30, 20, 60, 50);
    await goto(5); await page.evaluate((l) => window.CL.setActive(l), lid1); await rect(-40, -30, 80, 60);
    const origF0L1 = await maskCount(0, lid1), origF0L2 = await maskCount(0, lid2), origF5L1 = await maskCount(5, lid1);
    t.ok(origF0L1 > 0 && origF0L2 > 0 && origF5L1 > 0, `prepared masks f0L1=${origF0L1} f0L2=${origF0L2} f5L1=${origF5L1}`);
    await page.evaluate(async () => { await window.CLStore.flushFrames(); await window.CLStore.flushMeta(); });

    // ============ ① ZIP 書き出し（実ダウンロード） ============
    await page.$eval('#exportMasksZip', (e) => e.click());
    const zipPath = await ctx.waitDownload(/_masks\.zip$/);
    t.ok(!!zipPath, 'ZIP downloaded via real button (' + (zipPath ? path.basename(zipPath) : 'TIMEOUT') + ')');
    if (!zipPath) { await ctx.shot('fail'); return; }
    const savedZip = path.join(OUTDIR, path.basename(zipPath)); fs.copyFileSync(zipPath, savedZip);

    // unzip -l で内容確認
    const listing = cp.execSync('unzip -l ' + JSON.stringify(zipPath), { encoding: 'utf8' });
    const has = (n) => listing.indexOf(n) >= 0;
    t.ok(has('mask_L' + lid1 + '_f00000.png'), 'ZIP contains mask_L' + lid1 + '_f00000.png');
    t.ok(has('mask_L' + lid2 + '_f00000.png'), 'ZIP contains mask_L' + lid2 + '_f00000.png');
    t.ok(has('mask_L' + lid1 + '_f00005.png'), 'ZIP contains mask_L' + lid1 + '_f00005.png');
    t.ok(has('manifest.json'), 'ZIP contains manifest.json');
    // 実際に展開
    const exdir = path.join(OUTDIR, 'unzipped'); fs.mkdirSync(exdir, { recursive: true });
    cp.execSync('unzip -o ' + JSON.stringify(zipPath) + ' -d ' + JSON.stringify(exdir), { stdio: 'pipe' });
    const manifest = JSON.parse(fs.readFileSync(path.join(exdir, 'manifest.json'), 'utf8'));
    t.ok(manifest.format === 'contour-lab-masks' && manifest.frames.includes(0) && manifest.frames.includes(5), 'manifest frames include [0,5] (' + JSON.stringify(manifest.frames) + ')');
    t.ok(manifest.layers.length >= 2 && manifest.W === await page.evaluate(() => window.CL.S.W), 'manifest has layers + native W/H');
    const png = path.join(exdir, 'mask_L' + lid1 + '_f00000.png');
    t.ok(fs.existsSync(png) && fs.statSync(png).size > 0, 'extracted PNG exists on disk (' + (fs.existsSync(png) ? fs.statSync(png).size : 0) + ' bytes)');

    // ============ ② その PNG を実UI(#importMask)で読み戻す ============
    // f0 をクリアして色1へ取込 → 元の f0L1 と一致するか（マスクPNG取込の実証）
    await goto(0); await page.$eval('#clearFrame', (e) => e.click()); await sleep(150);
    t.ok(await maskCount(0, lid1) === 0, 'frame0 cleared before import');
    await page.evaluate((l) => window.CL.setActive(l), lid1);
    const impInput = await page.$('#importMask'); await impInput.uploadFile(png); // 実ファイル入力→change→importMaskFiles
    await sleep(500); await goto(0); await sleep(150);
    const reF0L1 = await maskCount(0, lid1);
    t.ok(reF0L1 === origF0L1, 'mask PNG re-import via real file input reconstructs f0 layer1 pixel-exact (' + origF0L1 + '→' + reF0L1 + ')');

    // ============ ③ プロジェクトJSON 書き出し→解析→クリア→実UI読込 ============
    const jsonPath0 = await (async () => { await page.$eval('#exportProject', (e) => e.click()); return ctx.waitDownload(/\.contourlab\.json$/); })();
    t.ok(!!jsonPath0, 'project JSON downloaded (' + (jsonPath0 ? path.basename(jsonPath0) : 'TIMEOUT') + ')');
    if (jsonPath0) {
      const savedJson = path.join(OUTDIR, path.basename(jsonPath0)); fs.copyFileSync(jsonPath0, savedJson);
      const proj = JSON.parse(fs.readFileSync(jsonPath0, 'utf8'));
      t.ok(proj.format === 'contour-lab-project' && proj.frames && ('5' in proj.frames), 'project JSON has frames incl "5"');
      // 全消し（f0,f5）→ JSON を実UIで読込 → f5L1 復元
      await goto(5); await page.$eval('#clearFrame', (e) => e.click()); await sleep(120);
      await goto(0); await page.$eval('#clearFrame', (e) => e.click()); await sleep(120);
      const impProj = await page.$('#importProject'); await impProj.uploadFile(jsonPath0);
      let ok5 = false; for (let i = 0; i < 40; i++) { await goto(5); if (await maskCount(5, lid1) === origF5L1) { ok5 = true; break; } await sleep(100); }
      t.ok(ok5, 'project JSON re-import via real file input restores f5 layer1 (' + origF5L1 + ')');
    }

    // 成果物一覧をログ＆スクショ
    console.log('  artifacts saved under: ' + OUTDIR);
    for (const f of fs.readdirSync(OUTDIR)) console.log('    - ' + f);
    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
