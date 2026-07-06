'use strict';
/* merge-layers (機能1): 2色を1色に統合。色1・色2に別々の領域→色2を色1へ統合→色1が両方を含み色2は消える。
   confirm を自動承認して検証。 */
module.exports = {
  name: 'merge-layers',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    await page.evaluate(() => { window.confirm = () => true; }); // 統合の確認を自動OK
    const rect = (f, lid, side) => page.evaluate((f, lid, side) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); const x0 = side === 'left' ? (W * 0.15 | 0) : (W * 0.55 | 0), x1 = side === 'left' ? (W * 0.45 | 0) : (W * 0.85 | 0), y0 = H * 0.3 | 0, y1 = H * 0.7 | 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1; return window.CLIO.applyMaskToLayer(f, lid, m, 'replace'); }, f, lid, side);
    const pop = (f, lid) => page.evaluate((f, lid) => { const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let c = 0; for (let i = 0; i < fl.length; i++) if (fl[i] || a[i]) c++; return c; }, f, lid);
    const at = (f, lid, fx, fy) => page.evaluate((f, lid, fx, fy) => { const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); const x = fx * S.W | 0, y = fy * S.H | 0; return (a[y * S.W + x] || fl[y * S.W + x]) ? 1 : 0; }, f, lid, fx, fy);

    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    await page.evaluate(() => window.CL.addLayer()); const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    // 色1=左 / 色2=右（f0）
    await page.evaluate((l) => window.CL.setActive(l), lid1); await rect(0, lid1, 'left');
    await page.evaluate((l) => window.CL.setActive(l), lid2); await rect(0, lid2, 'right');
    await page.evaluate(() => { window.CL.S.cur = -1; window.CL.requestFrame(0); }); await sleep(200);
    const p1 = await pop(0, lid1), p2 = await pop(0, lid2);
    t.ok(p1 > 0 && p2 > 0, 'setup: color1(left)=' + p1 + ', color2(right)=' + p2);
    t.ok(await at(0, lid1, 0.3, 0.5) === 1 && await at(0, lid1, 0.7, 0.5) === 0, 'before: color1 has LEFT only');

    // 色2 を 色1 へ統合（選択中=色1）
    await page.evaluate((l) => window.CL.setActive(l), lid1);
    await page.evaluate((s, d) => window.CL.mergeLayers(s, d), lid2, lid1);
    await sleep(300);

    t.ok(await page.evaluate((l2) => !window.CL.S.layers.some((l) => l.id === l2), lid2), 'color2 layer removed after merge');
    t.ok(await page.evaluate(() => window.CL.S.layers.length === 1), 'only 1 layer remains');
    t.ok(await at(0, lid1, 0.3, 0.5) === 1 && await at(0, lid1, 0.7, 0.5) === 1, 'after: color1 now contains BOTH left AND right regions');
    const merged = await pop(0, lid1);
    t.ok(merged >= p1 + p2 * 0.9, 'merged region ~= color1 + color2 area (' + merged + ' >= ' + p1 + '+' + p2 + ')');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
