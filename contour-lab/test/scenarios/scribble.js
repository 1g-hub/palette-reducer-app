'use strict';
/* scribble (P4-4): 前景(色1)と背景を雑に塗る→自動割当→確定でレイヤ化・封止・Undo可。
   前景スクリブルを画面左、背景を画面右に塗り、確定で色1の領域ができることを確認。 */
module.exports = {
  name: 'scribble',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const layerPop = (f, l) => page.evaluate((f, l) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(f, l); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let c = 0; for (let i = 0; i < a.length; i++) if (a[i] || fl[i]) c++; return c; }, f, l);
    const box = await ctx.viewBox();
    const dragLine = async (x0, y0, x1, y1) => { await page.mouse.move(x0, y0); await page.mouse.down(); const steps = 8; for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await sleep(120); };

    // 前景スクリブル（画面左寄りに縦ストローク）
    await page.evaluate(() => document.getElementById('scribFg').click());
    t.ok(await page.evaluate(() => window.CL.S.tool === 'scribble' && window.CL.S.scribbleClass === window.CL.S.activeLid), 'foreground scribble tool active');
    await dragLine(box.x + box.width * 0.30, box.y + box.height * 0.30, box.x + box.width * 0.30, box.y + box.height * 0.70);

    // 背景スクリブル（画面右寄りに縦ストローク）
    await page.evaluate(() => document.getElementById('scribBg').click());
    await dragLine(box.x + box.width * 0.80, box.y + box.height * 0.30, box.x + box.width * 0.80, box.y + box.height * 0.70);
    await sleep(200);

    // 割当が計算されている
    const assigned = await page.evaluate(() => { const a = window.CLSlic._assign(); if (!a) return -1; let fg = 0; for (let i = 0; i < a.length; i++) if (a[i] > 0) fg++; return fg; });
    t.ok(assigned > 0, 'Dijkstra assignment produced foreground superpixels (' + assigned + ')');

    // 確定→色1に領域ができる
    const before = await layerPop(0, lid);
    await page.evaluate(() => document.getElementById('slicConfirm').click());
    await sleep(400);
    const after = await layerPop(0, lid);
    t.ok(after > before, 'confirm created a region on layer1 (' + before + '->' + after + ')');
    // 封止されている（maskToLines 経由）
    const sealed = await page.evaluate((l) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(0, l); const fl = CLab.computeFill(a, S.W, S.H); let f = 0; for (let i = 0; i < fl.length; i++) if (fl[i]) f++; return f; }, lid);
    t.ok(sealed > 0, 'region is sealed (fill computed, ' + sealed + 'px)');
    // 前景側(左)が塗られ、背景側(右)は塗られていない
    const sides = await page.evaluate((l) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(0, l); const fl = CLab.computeFill(a, S.W, S.H); const W = S.W, H = S.H; let left = 0, right = 0; for (let y = H * 0.3 | 0; y < H * 0.7; y++) { if (fl[y * W + (W * 0.3 | 0)] || a[y * W + (W * 0.3 | 0)]) left++; if (fl[y * W + (W * 0.8 | 0)] || a[y * W + (W * 0.8 | 0)]) right++; } return { left, right }; }, lid);
    t.ok(sides.left > sides.right, 'foreground side (left) more filled than background side (right) (' + sides.left + ' vs ' + sides.right + ')');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await layerPop(0, lid) === before, 'undo removes the scribble region');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
