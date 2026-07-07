'use strict';
/* clear-range: 選択色の範囲一括消去（幽霊の実データ化の掃除）。
   f0,f1,f2 に色マスク + f4 は savedFrames のみ（未訪問の保存データ＝実データ化した幽霊を模擬）。
   f1 から「シーン末尾まで消去」→ f1,f2,f4 から消え f0 は残る。savedFrames も即時更新。Undo可。 */
module.exports = {
  name: 'clear-range',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    await page.evaluate(() => { window.confirm = () => true; });
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const rectApply = (f) => page.evaluate((f, lid) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); for (let y = 200; y < 300; y++) for (let x = 200; x < 300; x++) m[y * W + x] = 1; return window.CLIO.applyMaskToLayer(f, lid, m, 'replace'); }, f, lid);
    const has = (f) => page.evaluate((f, lid) => !!(window.CLIO.getLines(f, lid)), f, lid);
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 8000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f, f)) return; await sleep(50); } }

    await rectApply(0); await rectApply(1); await rectApply(2);
    // f4 = savedFrames のみ（未訪問）に直接置く（実データ化した幽霊の模擬）
    await page.evaluate((lid) => { const S = window.CL.S, CLab = window.ContourLab, N = S.W * S.H; const m = new Uint8Array(N); for (let y = 200; y < 300; y++) for (let x = 200; x < 300; x++) m[y * S.W + x] = 1; S.savedFrames.set(4, { [lid]: CLab.rleFromBitmap(m) }); }, lid);
    t.ok((await has(0)) && (await has(1)) && (await has(2)) && (await has(4)), 'setup: mask on f0,f1,f2 (owned) + f4 (savedFrames-only)');

    await goto(1);
    await page.evaluate(() => window.CL.clearColorRange('forward'));
    await sleep(300);
    t.ok(!(await has(1)) && !(await has(2)) && !(await has(4)), 'forward range-clear removed the colour on f1,f2 AND unvisited saved f4');
    t.ok(await has(0), 'f0 (before the range) is untouched');
    t.ok(await page.evaluate((lid) => { const rec = window.CL.S.savedFrames.get(4); return !rec || !rec[lid]; }, lid), 'savedFrames record for f4 updated immediately (no stale RLE resurrection)');

    // Undo は各フレーム: f1 で Undo → f1 だけ復活
    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await has(1), 'Undo on f1 restores f1');
    t.ok(!(await has(2)), 'f2 stays cleared (per-frame undo)');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
