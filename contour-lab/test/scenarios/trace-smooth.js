'use strict';
/* trace-smooth (Y): なぞった区間を「エッジに寄せず」滑らかな1px線へ置換する新ツール。
   ギザギザ（±1px 凹凸）＋所々2px厚の塊がある閉ループの上辺を実マウスで掃き、
   (1) ギザギザが減る（上辺yの総変動が大幅減） (2) 2px厚が1pxになる (3) 孤立0
   (4) ループは閉じたまま・他辺不変 (5) 1 Undo 完全復元 (6) スライダー/キー/色分けカーソルの配線
   を検証する。エッジ検出を使わないので画面内容に依存しない＝決定的。 */
module.exports = {
  name: 'trace-smooth',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    // ギザギザ閉ループ＋上辺の直下に「2px厚の塊」を10列ごとに埋める（1px化の検証対象）
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
      const a = CL.writableLines(S.cur, lid);
      for (let x = 315; x <= 445; x += 10) { // 上辺の線の直下へ余分な画素＝2px厚
        for (let y = 180; y < 300; y++) { if (a[y * W + x]) { a[y * W + x + W] = 1; break; } }
      }
      CL.fdata(S.cur).fill.set(lid, CL.newFill(a)); S.maskDirty = true; CL.render();
      return lid;
    });
    const stat = () => page.evaluate((lid) => {
      const S = window.CL.S, W = S.W, H = S.H, CLab = window.ContourLab, a = S.frames.get(S.cur).lines.get(lid);
      const fl = CLab.computeFill(a, W, H); let fill = 0, h = 0, isolated = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) h = (h * 31 + i) >>> 0; if (fl[i]) fill++; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!a[i]) continue; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (a[yy * W + xx]) n++; } if (n === 0) isolated++; }
      // 上辺の形状: 列ごとの最上y（x=320..440）→ 総変動（ギザギザ量）と2px厚の列数
      const tops = []; let thick = 0;
      for (let x = 320; x <= 440; x++) { let ty = -1; for (let y = 180; y < 300; y++) { if (a[y * W + x]) { ty = y; break; } } tops.push(ty); if (ty >= 0 && a[(ty + 1) * W + x]) thick++; }
      let tv = 0; for (let i = 1; i < tops.length; i++) if (tops[i] >= 0 && tops[i - 1] >= 0) tv += Math.abs(tops[i] - tops[i - 1]);
      const at = (x, y) => (a[y * W + x] ? 1 : 0);
      return { fill, hash: '' + h, isolated, tv, thick, left: at(300, 330), right: at(460, 330), bottom: at(380, 420) };
    }, lid);
    const s0 = await stat();
    t.ok(s0.fill > 20000 && s0.tv > 25 && s0.thick >= 10, 'setup: bumpy loop with 2px-thick clumps (fill ' + s0.fill + ', topTV ' + s0.tv + ', thickCols ' + s0.thick + ')');

    // 配線: なめらかさスライダーのラベル同期・Yキーでツール切替
    await page.evaluate(() => { const el = document.getElementById('smoothStrength'); el.value = 6; el.dispatchEvent(new Event('input')); });
    t.ok(await page.$eval('#smoothStrengthLabel', (e) => e.textContent) === '6', 'smooth-strength LABEL follows its slider');
    await page.evaluate(() => { const el = document.getElementById('smoothStrength'); el.value = 4; el.dispatchEvent(new Event('input')); });
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' })));
    t.ok(await page.evaluate(() => window.CL.S.tool) === 'tracesmooth', "'y' key switches to the trace-smooth tool");

    // 上辺をほぼ線上でなぞって掃く（sin起伏±4px＋ギザ±1pxでも帯R=10が全区間を覆う）
    await page.evaluate(() => {
      const el = document.getElementById('snapRadius'); el.value = 10; el.dispatchEvent(new Event('input'));
      const S = window.CL.S; S.view.scale = 2; S.view.tx = -520; S.view.ty = -360; window.CL.render();
    });
    const [box, view] = await Promise.all([ctx.viewBox(), page.evaluate(() => ({ s: window.CL.S.view.scale, tx: window.CL.S.view.tx, ty: window.CL.S.view.ty }))]);
    const scr = (wx, wy) => [box.x + wx * view.s + view.tx, box.y + wy * view.s + view.ty];
    const p0 = scr(310, 239), p1 = scr(450, 221);
    await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
    const steps = 10; for (let i = 1; i <= steps; i++) await page.mouse.move(p0[0] + (p1[0] - p0[0]) * i / steps, p0[1] + (p1[1] - p0[1]) * i / steps);
    await page.mouse.up(); await sleep(300);

    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    t.ok(/滑らかな1px線/.test(hint), 'trace-smooth applied (hint="' + hint + '")');
    t.ok(s1.hash !== s0.hash, 'swept section was replaced');
    t.ok(s1.tv <= s0.tv * 0.6, 'top edge SMOOTHED: total-variation ' + s0.tv + ' -> ' + s1.tv + ' (<=60%)');
    t.ok(s1.thick === 0, '2px-thick clumps collapsed to a 1px line (' + s0.thick + ' -> ' + s1.thick + ' cols)');
    t.ok(s1.isolated === 0, 'no isolated 1px remnants (' + s1.isolated + ')');
    t.ok(s1.fill >= s0.fill * 0.7 && s1.fill > 0, 'loop still CLOSED (fill ' + s0.fill + '->' + s1.fill + ')');
    t.ok(s1.left === 1 && s1.right === 1 && s1.bottom === 1, 'untraced sides (left/right/bottom) intact');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok((await stat()).hash === s0.hash, 'one Undo restores the original exactly');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
