'use strict';
/* move-mask (M): 選択色マスクの平行移動ツール。
   検証: (1) Mでツール化・矢印キーが「フレーム移動」でなく「マスク移動」になる（1px/Shift=10px）
   (2) 移動結果が shiftLines(base,dx,dy) と画素単位で完全一致（基準からの一括シフト＝往復で欠けない）
   (3) Esc取消で完全復元 (4) Enter確定＝1 Undo (5) ドラッグ移動 (6) ツール切替で自動確定
   (7) 他の色は終始不変 (8) ツールを抜けたら矢印キーのフレーム移動が復活。 */
module.exports = {
  name: 'move-mask',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const ids = await page.evaluate(() => {
      const CL = window.CL, S = CL.S, W = S.W, H = S.H;
      CL.addLayer(); const l1 = S.activeLid;
      const m = new Uint8Array(W * H);
      for (let y = 200; y <= 260; y++) for (let x = 300; x <= 360; x++) m[y * W + x] = 1;
      window.CLIO.applyMaskToLayer(S.cur, l1, m, 'replace');
      CL.addLayer(); const l2 = S.activeLid;
      const m2 = new Uint8Array(W * H);
      for (let y = 500; y <= 530; y++) for (let x = 700; x <= 730; x++) m2[y * W + x] = 1;
      window.CLIO.applyMaskToLayer(S.cur, l2, m2, 'replace');
      CL.setActive(l1); S.maskDirty = true; CL.render();
      window.__mvBase = Uint8Array.from(S.frames.get(S.cur).lines.get(l1)); // 期待値計算用の基準
      return { l1, l2 };
    });
    // 期待値: base を (dx,dy) シフトしたものと実データが完全一致するか
    const eqShift = (dx, dy) => page.evaluate((l1, dx2, dy2) => {
      const S = window.CL.S, a = S.frames.get(S.cur).lines.get(l1);
      const exp = window.ContourLab.shiftLines(window.__mvBase, S.W, S.H, dx2, dy2);
      if (a.length !== exp.length) return 'len';
      for (let i = 0; i < a.length; i++) if ((a[i] ? 1 : 0) !== (exp[i] ? 1 : 0)) return 'diff@' + i;
      return 'eq';
    }, ids.l1, dx, dy);
    const l2hash = () => page.evaluate((l2) => { const S = window.CL.S, a = S.frames.get(S.cur).lines.get(l2); let h = 0; for (let i = 0; i < a.length; i++) if (a[i]) h = (h * 31 + i) >>> 0; return '' + h; }, ids.l2);
    const curFrame = () => page.evaluate(() => window.CL.S.cur);
    const h2a = await l2hash();

    // M でツール化、矢印キー＝マスク移動（フレームは動かない）
    await page.keyboard.press('m');
    t.ok(await page.evaluate(() => window.CL.S.tool) === 'movemask', "'m' activates the move-mask tool");
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
    await sleep(150);
    t.ok(await eqShift(3, 2) === 'eq', 'arrows moved the mask by EXACTLY (+3,+2) [pixel-exact vs shiftLines]');
    t.ok(await curFrame() === 0, 'arrow keys did NOT navigate frames while the tool is active');

    // Shift+← = 10px 粗動（基準からの一括シフト＝往復しても欠けない）
    await page.keyboard.down('Shift'); await page.keyboard.press('ArrowLeft'); await page.keyboard.up('Shift');
    await sleep(120);
    t.ok(await eqShift(-7, 2) === 'eq', 'Shift+arrow = 10px coarse step (total -7,+2)');

    // Esc = 取消（完全復元）
    await page.keyboard.press('Escape'); await sleep(120);
    t.ok(await eqShift(0, 0) === 'eq', 'Escape cancels: mask restored EXACTLY');

    // Enter = 確定 → 1 Undo で戻る
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    await sleep(150);
    t.ok(await eqShift(2, 0) === 'eq', 'Enter commits the move (+2,0)');
    await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
    await sleep(150);
    t.ok(await eqShift(0, 0) === 'eq', 'ONE Ctrl+Z after commit restores the original');

    // ドラッグ移動 → Enter 確定
    await page.evaluate(() => { const S = window.CL.S; S.view.scale = 1; S.view.tx = -100; S.view.ty = -100; window.CL.render(); });
    const box = await ctx.viewBox();
    const scr = (wx, wy) => [box.x + wx - 100, box.y + wy - 100];
    let p = scr(330, 230); await page.mouse.move(p[0], p[1]); await page.mouse.down();
    p = scr(345, 238); await page.mouse.move(p[0], p[1]); await sleep(80);
    await page.mouse.up(); await sleep(150);
    t.ok(await eqShift(15, 8) === 'eq', 'drag moves the mask (+15,+8) after release');
    await page.keyboard.press('Enter'); await sleep(120);
    await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
    await sleep(150);
    t.ok(await eqShift(0, 0) === 'eq', 'drag commit is one undo entry');

    // ツール切替＝自動確定
    await page.keyboard.press('ArrowUp'); await sleep(100);
    await page.evaluate(() => window.CL.setTool('pen')); await sleep(150);
    t.ok(await eqShift(0, -1) === 'eq', 'switching tools auto-commits the pending move (0,-1)');
    await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
    await sleep(150);
    t.ok(await eqShift(0, 0) === 'eq', 'auto-commit is undoable in one step');

    // 他の色（別レイヤ）は終始不変・ツールを抜けたら矢印＝フレーム移動が復活
    t.ok(await l2hash() === h2a, 'the OTHER color layer was never touched');
    await page.keyboard.press('ArrowRight');
    { const end = Date.now() + 4000; while (Date.now() < end) { if (await curFrame() === 1) break; await sleep(100); } }
    t.ok(await curFrame() === 1, 'after leaving the tool, arrow keys navigate frames again');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
