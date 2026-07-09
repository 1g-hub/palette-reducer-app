'use strict';
/* マスク別パレット（領域マスク）E2E — 実動画＋実マスクJSONで
   STEP2読込→領域別分析→STEP3画素検証（領域ごとに正しいパレットが適用されるか）→
   STEP4ガード→STEP5書き出しまでを通しで検証する。
   前提: リポジトリ直下で `python3 -m http.server 8000` が動いていること。
   実行: node qa/mask-palette-e2e.js
   分析=入力解像度（品質は本番同等）、プレビュー/書き出し=360p（時間短縮）。 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const puppeteer = require(path.join(ROOT, 'contour-lab/test/node_modules/puppeteer-core'));
const OUT = __dirname;
const VIDEO = process.env.QA_VIDEO || path.join(ROOT, 'made/0513_03_moto.mp4');
const MASK = process.env.QA_MASK || path.join(ROOT, 'mask/0513_03_moto.mainapp.json');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    protocolTimeout: 900000,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1500,1000', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let P = 0, F = 0;
  const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); c ? P++ : F++; };

  await page.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
  await (await page.$('#fileInput')).uploadFile(VIDEO);
  await page.waitForFunction(() => state.videos.length === 1, { timeout: 30000 });
  await page.click('#toStep2Btn');
  await (await page.$('#maskJsonInput')).uploadFile(MASK);
  await page.waitForFunction(() => !!state.masksData, { timeout: 30000 });
  // プレビュー/書き出しだけ 360p に（分析は入力解像度のまま）
  await page.evaluate(() => { dom.chkPrevFull.checked = false; dom.chkPrevFull.dispatchEvent(new Event('change')); });

  await page.click('#analyzeBtn');
  await page.waitForFunction(() => state.step === 3, { timeout: 300000, polling: 500 });
  const v0 = await page.evaluate(() => { const v = state.videos[0]; return { status: v.status, masks: !!v.masks, palIds: Object.keys(v.palettes || {}).sort(), fps: v.fps }; });
  ok(v0.status === 'done' && v0.masks && ['only', 'only@L1', 'only@L2'].every((id) => v0.palIds.includes(id)), 'analysis done, region palettes: ' + JSON.stringify(v0.palIds) + ' (fps=' + v0.fps + ')');

  const kInfo = await page.evaluate(() => { const v = state.videos[0]; return { bg: v.palettes.only.activeK, L1: v.palettes['only@L1'].activeK, L2: v.palettes['only@L2'].activeK, thBg: v.palettes.only.confirmThreshold, thL1: v.palettes['only@L1'].confirmThreshold }; });
  console.log('       K: bg=' + kInfo.bg + ' L1=' + kInfo.L1 + ' L2=' + kInfo.L2 + ' / th: bg=' + kInfo.thBg + ' L1=' + kInfo.thL1);

  // フレーム300で領域画素の所属＋マゼンタ率（サンプル改善の効果を前回8.6%と比較）。
  // シークが実際に着地してから明示的に再描画（初回の大シークは2秒でも塗り替わらないことがある）。
  await page.evaluate(() => setPreviewTime(300 / state.videos[0].fps + 0.5 / state.videos[0].fps));
  await page.waitForFunction(() => Math.abs(dom.workVideo.currentTime - (300.5 / state.videos[0].fps)) < 0.02, { timeout: 30000, polling: 200 });
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => drawActiveFrame());
  await new Promise((r) => setTimeout(r, 400));
  const pix = await page.evaluate(() => {
    const v = state.videos[0];
    const w = dom.cvReduced.width, h = dom.cvReduced.height;
    const rmap = regionMapForFrame(v, 300, w, h);
    const img = dom.cvReduced.getContext('2d').getImageData(0, 0, w, h).data;
    const reps = (id) => v.palettes[id].analysis.representatives;
    const inSet = (id, px) => reps(id).some((c) => c[0] === px[0] && c[1] === px[1] && c[2] === px[2]);
    const isMag = (px) => px[0] === 255 && px[1] === 0 && px[2] === 255;
    const stats = (val, id) => {
      let n = 0, inPal = 0, mag = 0;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
        const p = y * w + x; if (rmap[p] !== val) continue;
        const i = p * 4, px = [img[i], img[i + 1], img[i + 2]];
        n++;
        if (isMag(px)) mag++;
        else if (inSet(id, px)) inPal++;
      }
      return { n, inPal, mag, memberFrac: n ? (inPal + mag) / n : 0, magFrac: n ? mag / n : 0 };
    };
    return { boy: stats(2, 'only@L1'), bg: stats(0, 'only'), size: w + 'x' + h };
  });
  ok(pix.boy.n > 500 && pix.boy.memberFrac === 1, 'boy pixels all in 対象1 palette/sentinel (' + pix.size + ', n=' + pix.boy.n + ')');
  ok(pix.bg.n > 500 && pix.bg.memberFrac === 1, 'bg pixels all in 背景 palette/sentinel (n=' + pix.bg.n + ')');
  ok(pix.boy.magFrac < 0.086, 'boy magenta fraction IMPROVED vs first/last sampling: ' + (pix.boy.magFrac * 100).toFixed(1) + '% (was 8.6%)');
  await page.screenshot({ path: OUT + '/qa2_step3_f300.png' });

  // STEP4 ガード（正しいヒント要素で確認）
  await page.click('#toStep4Btn');
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => toggleMergeMode());
  const merged = await page.evaluate(() => ({ on: !!state.videos[0].mergeMode, hint: (dom.mergeModeHint && dom.mergeModeHint.textContent) || '' }));
  ok(!merged.on && /領域マスク/.test(merged.hint), 'STEP4 merge blocked with hint: "' + merged.hint.slice(0, 42) + '…"');

  // STEP5 書き出し（360p・WebCodecs正確）。headlessではフォルダピッカーが出せないためOFFに
  // （既定ONだと showDirectoryPicker が拒否され「書き出しを中止」で早期return＝前回の停滞の正体）。
  await page.click('#toStep5Btn');
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => { state.useFolderPicker = false; });
  await page.click('#exportBtn');
  await page.waitForFunction(() => state.videos[0].exportDone || (!state.exporting && state.exported) || state.videos[0].error, { timeout: 780000, polling: 2000 });
  const ex = await page.evaluate(() => { const v = state.videos[0]; return { done: v.exportDone, size: v.exportBlob ? v.exportBlob.size : 0, name: v.exportName }; });
  ok(ex.done && ex.size > 100000, 'export with region palettes completed (' + ex.name + ', ' + Math.round(ex.size / 1024) + 'KB)');
  await page.screenshot({ path: OUT + '/qa2_step5.png' });

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\n[qa2 mask-palette] ' + P + ' PASS / ' + F + ' FAIL');
  await browser.close();
  process.exit(F ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
