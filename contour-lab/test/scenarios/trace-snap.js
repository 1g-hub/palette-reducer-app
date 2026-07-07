'use strict';
/* trace-snap (T): 閉じた輪郭の一部区間をなぞってエッジ吸着。
   凸凹のある閉ループを作り、上辺を実マウスでなぞる→上辺区間だけ置換・ループは閉じたまま
   （fill維持）・他の辺は不変・1 Undo で完全復元。閉ループはW（直前線吸着）では不可能だった対象。 */
module.exports = {
  name: 'trace-snap',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    // 凸凹つき閉ループ（上辺に山: (300,240)-(380,215)-(460,240)、他は矩形）を作る
    const lid = await page.evaluate(() => {
      const CL = window.CL, S = CL.S, B = window.ContourLab.bresenham;
      CL.addLayer(); const lid = S.activeLid;
      const a = CL.writableLines(S.cur, lid);
      B(a, S.W, S.H, 300, 240, 380, 215, 1, null); B(a, S.W, S.H, 380, 215, 460, 240, 1, null); // 凸凹上辺
      B(a, S.W, S.H, 460, 240, 460, 420, 1, null); B(a, S.W, S.H, 460, 420, 300, 420, 1, null); B(a, S.W, S.H, 300, 420, 300, 240, 1, null);
      CL.fdata(S.cur).fill.set(lid, CL.newFill(a)); S.maskDirty = true; CL.render();
      return lid;
    });
    const stat = () => page.evaluate((lid) => {
      const S = window.CL.S, CLab = window.ContourLab, d = S.frames.get(S.cur), a = d.lines.get(lid);
      const fl = CLab.computeFill(a, S.W, S.H); let pop = 0, fill = 0, h = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) { pop++; h = (h * 31 + i) >>> 0; } if (fl[i]) fill++; }
      const at = (x, y) => (a[y * S.W + x] ? 1 : 0);
      return { pop, fill, hash: '' + h, left: at(300, 330), right: at(460, 330), bottom: at(380, 420) };
    }, lid);
    const s0 = await stat();
    t.ok(s0.pop > 0 && s0.fill > 20000, 'closed bumpy loop built (lines ' + s0.pop + ', fill ' + s0.fill + ')');

    // なぞり: 上辺に沿って（y≈228 の直線、山とはズレた位置）実マウスでドラッグ
    await page.evaluate(() => window.CL.setTool('tracesnap'));
    const [box, view] = await Promise.all([ctx.viewBox(), page.evaluate(() => ({ s: window.CL.S.view.scale, tx: window.CL.S.view.tx, ty: window.CL.S.view.ty }))]);
    const scr = (wx, wy) => [box.x + wx * view.s + view.tx, box.y + wy * view.s + view.ty];
    const p0 = scr(305, 235), p1 = scr(455, 235);
    await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
    const steps = 10; for (let i = 1; i <= steps; i++) await page.mouse.move(p0[0] + (p1[0] - p0[0]) * i / steps, p0[1] + (p1[1] - p0[1]) * i / steps);
    await page.mouse.up(); await sleep(300);

    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    t.ok(s1.hash !== s0.hash, 'traced section was replaced (hint="' + hint + '")');
    t.ok(s1.left === 1 && s1.right === 1 && s1.bottom === 1, 'untraced sides (left/right/bottom) are intact');
    t.ok(s1.fill >= s0.fill * 0.7 && s1.fill > 0, 'loop still CLOSED after trace-snap (fill ' + s0.fill + '->' + s1.fill + ')');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    const s2 = await stat();
    t.ok(s2.hash === s0.hash, 'one Undo restores the original loop exactly');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
