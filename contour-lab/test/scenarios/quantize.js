'use strict';
/* quantize (P4-2/3): 量子化ビューでユニーク色数<=K、ワンドで領域が取込まれ封止・Undo可。 */
module.exports = {
  name: 'quantize',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const layerPop = (f, l) => page.evaluate((f, l) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(f, l); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let c = 0; for (let i = 0; i < a.length; i++) if (a[i] || fl[i]) c++; return c; }, f, l);

    // 量子化ビュー: K=8 でユニーク色数 <= 8（canvas 読み戻し）
    await page.evaluate(() => { window.CL.S.quantK = 8; const el = document.getElementById('quantToggle'); el.checked = true; el.dispatchEvent(new Event('change')); });
    await sleep(400);
    const uniq = await page.evaluate(() => {
      const q = window.CLQuant.ensureQuant(); if (!q) return -1;
      const cx = q.canvas.getContext('2d'); const d = cx.getImageData(0, 0, q.canvas.width, q.canvas.height).data;
      const set = new Set(); for (let p = 0; p < d.length; p += 4) set.add((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]);
      return set.size;
    });
    t.ok(uniq > 0 && uniq <= 8, 'quantize view has <= K unique colors (K=8, got ' + uniq + ')');

    // ワンド: 画面中心をクリック→領域が選択色へ追加
    await page.evaluate(() => window.CL.setTool('wand'));
    t.ok(await page.evaluate(() => window.CL.S.tool === 'wand'), 'wand tool active');
    const before = await layerPop(0, lid);
    const box = await ctx.viewBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(400);
    const after = await layerPop(0, lid);
    t.ok(after > before, 'wand added a region to the active layer (' + before + '->' + after + ')');
    // 取込は封止されている（fill が返る＝maskToLines 経由）
    const sealed = await page.evaluate((l) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(0, l); const fl = CLab.computeFill(a, S.W, S.H); let f = 0; for (let i = 0; i < fl.length; i++) if (fl[i]) f++; return f; }, lid);
    t.ok(sealed > 0, 'imported region is sealed (fill computed, ' + sealed + 'px)');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await layerPop(0, lid) === before, 'undo removes the wand region (' + before + ')');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
