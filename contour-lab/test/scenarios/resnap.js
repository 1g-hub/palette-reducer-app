'use strict';
/* resnap (P3-3 全線再吸着 R): 閉じた輪郭を描く→R→全線が近くのエッジへ寄り、封止(fill)を保つ、Undo可。
   検証: (1)線が変化 (2)線上の平均勾配が増加 (3)fillが保たれる（>30%崩壊しない） (4)Undoで元に戻る。 */
module.exports = {
  name: 'resnap',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const stat = () => page.evaluate((lid) => {
      const S = window.CL.S, CLab = window.ContourLab, mg = window.CLSnap.getMag();
      const d = S.frames.get(S.cur); if (!d) return null; const a = d.lines.get(lid); if (!a) return null;
      const fl = CLab.computeFill(a, S.W, S.H);
      let g = 0, n = 0, pop = 0, fillpop = 0, h = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) { g += mg.mag[i]; n++; pop++; h = (h * 31 + i) >>> 0; } if (fl[i]) fillpop++; }
      return { avgGrad: n ? g / n : 0, pop, fillpop, hash: '' + h };
    }, lid);

    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    for (let i = 0; i < 5; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel({ deltaY: -220 }); await sleep(30); }
    await sleep(150);
    // 閉じた多角形（端点スナップで自動閉合）を描く
    const poly = [[cx - 90, cy - 70], [cx + 90, cy - 60], [cx + 100, cy + 70], [cx - 80, cy + 80], [cx - 90, cy - 70]];
    await page.mouse.move(poly[0][0], poly[0][1]); await page.mouse.down();
    for (let i = 1; i < poly.length; i++) { await page.mouse.move(poly[i][0], poly[i][1]); await sleep(20); }
    await page.mouse.up(); await sleep(200);

    const s0 = await stat();
    t.ok(s0 && s0.pop > 0, 'closed contour drawn (' + (s0 && s0.pop) + 'px lines)');
    t.ok(s0.fillpop > 0, 'contour is sealed (fill ' + s0.fillpop + 'px)');

    // R で全線再吸着
    await page.evaluate(() => window.CLSnap.resnapAll()); await sleep(250);
    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    t.ok(s1.hash !== s0.hash, 'resnap changed the lines (hint="' + hint + '")');
    t.ok(s1.avgGrad >= s0.avgGrad, 'resnapped lines sit on >= gradient (' + s0.avgGrad.toFixed(1) + ' -> ' + s1.avgGrad.toFixed(1) + ')');
    t.ok(s1.fillpop >= s0.fillpop * 0.7, 'fill preserved (not collapsed >30%): ' + s0.fillpop + ' -> ' + s1.fillpop);

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    const s2 = await stat();
    t.ok(s2.hash === s0.hash, 'one Undo restores the original contour exactly');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
