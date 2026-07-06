'use strict';
/* layers-order: レイヤ順序変更（moveLayer）＋重なり解消（resolveOverlaps）。
   色1と色2を一部重ねて配置→前面(色2)優先で解消→重なり画素が色1から消え、色2に残る→Undoで復元。
   順序変更で「前面」がどちらかを入れ替えられることも確認。 */
module.exports = {
  name: 'layers-order',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    await page.evaluate(() => { window.confirm = () => true; });
    // 一部重なる矩形を色lidに置く
    const rect = (f, lid, x0, x1) => page.evaluate((f, lid, x0, x1) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); const a = x0 * W | 0, b = x1 * W | 0, y0 = H * 0.3 | 0, y1 = H * 0.7 | 0; for (let y = y0; y < y1; y++) for (let x = a; x < b; x++) m[y * W + x] = 1; return window.CLIO.applyMaskToLayer(f, lid, m, 'replace'); }, f, lid, x0, x1);
    const covers = (f, lid, fx, fy) => page.evaluate((f, lid, fx, fy) => { const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); const x = fx * S.W | 0, y = fy * S.H | 0; return (a[y * S.W + x] || fl[y * S.W + x]) ? 1 : 0; }, f, lid, fx, fy);
    const order = () => page.evaluate(() => window.CL.S.layers.map((l) => l.id));

    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    await page.evaluate(() => window.CL.addLayer()); const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    // 色1 = x[0.2,0.5], 色2 = x[0.4,0.7] → x[0.4,0.5] が重複領域
    await rect(0, lid1, 0.2, 0.5); await rect(0, lid2, 0.4, 0.7);
    await page.evaluate(() => { window.CL.S.cur = -1; window.CL.requestFrame(0); }); await sleep(200);
    t.ok(await covers(0, lid1, 0.45, 0.5) === 1 && await covers(0, lid2, 0.45, 0.5) === 1, 'setup: overlap region covered by BOTH colors');

    // 順序: 追加順で lid2 が後方(前面)。resolve は前面(色2)優先。
    t.ok(JSON.stringify(await order()) === JSON.stringify([lid1, lid2]), 'layer array order [1,2] (2 is front)');

    // 重なり解消（現フレーム）
    await page.evaluate(() => document.getElementById('resolveFrame').click());
    await sleep(300);
    t.ok(await covers(0, lid2, 0.45, 0.5) === 1, 'after resolve: front color2 KEEPS the overlap');
    t.ok(await covers(0, lid1, 0.45, 0.5) === 0, 'after resolve: back color1 LOSES the overlap (non-overlapping now)');
    t.ok(await covers(0, lid1, 0.25, 0.5) === 1, 'after resolve: color1 keeps its non-overlapping part');

    // Undo で重なりが戻る
    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await covers(0, lid1, 0.45, 0.5) === 1, 'Undo restores the overlap on color1');

    // 順序変更: 色1を前面へ（moveLayer +1）→ [2,1]
    await page.evaluate((l) => window.CL.moveLayer(l, +1), lid1);
    t.ok(JSON.stringify(await order()) === JSON.stringify([lid2, lid1]), 'moveLayer: color1 brought to front -> [2,1]');
    // もう一度 resolve → 今度は色1が重複を保持
    await page.evaluate(() => document.getElementById('resolveFrame').click());
    await sleep(300);
    t.ok(await covers(0, lid1, 0.45, 0.5) === 1 && await covers(0, lid2, 0.45, 0.5) === 0, 'after reorder+resolve: now color1(front) keeps overlap, color2 loses it');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
