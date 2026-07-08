'use strict';
/* frame-snap: 「フレーム全体のエッジへ吸着」ボタン。ギザギザ閉ループ＋離れた小ループの2輪郭を作り、
   ボタン1発で両方が吸着（変化）・閉ループ維持・孤立0・微小成分(ノイズ片)は不変・1 Undo で全復元。
   全体半径スライダーのラベル同期も検証。 */
module.exports = {
  name: 'frame-snap',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    // 輪郭1: ギザギザ台形ループ＋内部に穴（ドーナツ）／輪郭2: 別の小さな四角ループ／ノイズ: 孤立1px
    const lid = await page.evaluate(() => {
      const CL = window.CL, S = CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H);
      CL.addLayer(); const lid = S.activeLid;
      let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let x = 300; x <= 460; x++) { let top = 240 - Math.round((x - 300) * 20 / 160) + Math.round(4 * Math.sin(x / 17)); if (rnd() < 0.35) top += (rnd() < 0.5 ? -1 : 1); for (let y = top; y <= 420; y++) m[y * W + x] = 1; }
      for (let y = 300; y <= 340; y++) for (let x = 360; x <= 400; x++) m[y * W + x] = 0; // 穴（ドーナツ）
      for (let y = 500; y <= 560; y++) for (let x = 700; x <= 800; x++) m[y * W + x] = 1; // 小ループ
      window.CLIO.applyMaskToLayer(S.cur, lid, m, 'replace');
      // ノイズ片（12px未満＝対象外のはず）
      const a = CL.writableLines(S.cur, lid); a[100 * W + 1500] = 1;
      CL.fdata(S.cur).fill.set(lid, CL.newFill(a)); S.maskDirty = true; CL.render();
      return lid;
    });
    const stat = () => page.evaluate((lid) => {
      const S = window.CL.S, W = S.W, H = S.H, CLab = window.ContourLab, a = S.frames.get(S.cur).lines.get(lid);
      const fl = CLab.computeFill(a, W, H); let fill = 0, iso = 0, h = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) h = (h * 31 + i) >>> 0; if (fl[i]) fill++; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!a[i]) continue; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (a[yy * W + xx]) n++; } if (n === 0) iso++; }
      // 小ループ領域の塗り（別成分も処理されたか）・ノイズ片の生存・穴の中心（ドーナツ維持か）
      const at = (x, y) => (fl[y * W + x] || a[y * W + x]) ? 1 : 0;
      return { fill, iso, hash: '' + h, small: at(750, 530), noise: a[100 * W + 1500] ? 1 : 0, holeCenter: at(380, 320) };
    }, lid);
    const s0 = await stat();
    t.ok(s0.fill > 20000 && s0.small === 1 && s0.noise === 1 && s0.iso === 1, 'setup: 2 loops + 1 isolated noise px (fill ' + s0.fill + ')');
    t.ok(s0.holeCenter === 0, 'setup: donut hole is open (center empty)');

    // 全体半径スライダー: ラベル同期
    await page.evaluate(() => { const el = document.getElementById('frameSnapRadius'); el.value = 7; el.dispatchEvent(new Event('input')); });
    t.ok(await page.$eval('#frameSnapRadiusLabel', (e) => e.textContent) === '7', 'frame-snap radius LABEL follows its slider');

    // 実行
    await page.$eval('#snapFrame', (e) => e.click());
    await sleep(600);
    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    t.ok(/吸着しました/.test(hint) && /2本/.test(hint), 'whole-frame snap applied to BOTH contours (hint="' + hint + '")');
    t.ok(s1.hash !== s0.hash, 'contours changed');
    t.ok(s1.fill >= s0.fill * 0.7 && s1.fill > 0, 'loops still closed (fill ' + s0.fill + '->' + s1.fill + ')');
    t.ok(s1.small === 1, 'second (small) loop still present and filled');
    t.ok(s1.holeCenter === 0, 'DONUT HOLE stays OPEN after whole-frame snap [user-reported bug]');
    t.ok(s1.noise === 1, 'tiny (<12px) noise component left untouched');
    t.ok(s1.iso <= s0.iso, 'no NEW isolated pixels (' + s0.iso + '->' + s1.iso + ')');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(200);
    t.ok((await stat()).hash === s0.hash, 'one Undo restores everything exactly');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
