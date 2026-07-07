'use strict';
/* trace-snap (T): 閉じた輪郭の一部区間をなぞってエッジ吸着。
   凸凹のある閉ループを作り、上辺を実マウスでなぞる→上辺区間だけ置換・ループは閉じたまま
   （fill維持）・他の辺は不変・1 Undo で完全復元。閉ループはW（直前線吸着）では不可能だった対象。 */
module.exports = {
  name: 'trace-snap',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    // 実SAMマスク風の「ギザギザ境界」の閉ループを作る（1px凹凸あり＝1px取り残しの実発生源。
    // node実験で旧実装だと孤立画素が8〜12個残ることを確認済み）。決定的PRNGで再現性を確保。
    const lid = await page.evaluate(() => {
      const CL = window.CL, S = CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H);
      CL.addLayer(); const lid = S.activeLid;
      let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let x = 300; x <= 460; x++) {
        let top = 240 - Math.round((x - 300) * 20 / 160) + Math.round(4 * Math.sin(x / 17));
        if (rnd() < 0.35) top += (rnd() < 0.5 ? -1 : 1); // 1px のギザギザ
        for (let y = top; y <= 420; y++) m[y * W + x] = 1;
      }
      window.CLIO.applyMaskToLayer(S.cur, lid, m, 'replace');
      S.maskDirty = true; CL.render();
      return lid;
    });
    const stat = () => page.evaluate((lid) => {
      const S = window.CL.S, W = S.W, H = S.H, CLab = window.ContourLab, d = S.frames.get(S.cur), a = d.lines.get(lid);
      const fl = CLab.computeFill(a, W, H); let pop = 0, fill = 0, h = 0, isolated = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) { pop++; h = (h * 31 + i) >>> 0; } if (fl[i]) fill++; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!a[i]) continue; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (a[yy * W + xx]) n++; } if (n === 0) isolated++; }
      const at = (x, y) => (a[y * S.W + x] ? 1 : 0);
      return { pop, fill, hash: '' + h, isolated, left: at(300, 330), right: at(460, 330), bottom: at(380, 420) };
    }, lid);
    const s0 = await stat();
    t.ok(s0.pop > 0 && s0.fill > 20000, 'closed bumpy loop built (lines ' + s0.pop + ', fill ' + s0.fill + ')');

    // なぞり: 階段状の斜め上辺に沿って（少し下をなぞる）実マウスでドラッグ
    await page.evaluate(() => window.CL.setTool('tracesnap'));
    const [box, view] = await Promise.all([ctx.viewBox(), page.evaluate(() => ({ s: window.CL.S.view.scale, tx: window.CL.S.view.tx, ty: window.CL.S.view.ty }))]);
    const scr = (wx, wy) => [box.x + wx * view.s + view.tx, box.y + wy * view.s + view.ty];
    const p0 = scr(305, 243), p1 = scr(455, 224);
    await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
    const steps = 10; for (let i = 1; i <= steps; i++) await page.mouse.move(p0[0] + (p1[0] - p0[0]) * i / steps, p0[1] + (p1[1] - p0[1]) * i / steps);
    await page.mouse.up(); await sleep(300);

    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    t.ok(s1.hash !== s0.hash, 'traced section was replaced (hint="' + hint + '")');
    t.ok(s1.left === 1 && s1.right === 1 && s1.bottom === 1, 'untraced sides (left/right/bottom) are intact');
    t.ok(s1.fill >= s0.fill * 0.7 && s1.fill > 0, 'loop still CLOSED after trace-snap (fill ' + s0.fill + '->' + s1.fill + ')');
    t.ok(s1.isolated === 0, 'NO isolated 1px remnants after trace-snap [user-reported fix] (' + s1.isolated + ')');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    const s2 = await stat();
    t.ok(s2.hash === s0.hash, 'one Undo restores the original loop exactly');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
