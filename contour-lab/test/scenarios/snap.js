'use strict';
/* snap (P3-2 確定エッジスナップ): 雑に描いた線をWでエッジへ吸着。
   検証: (1)吸着で線が変化 (2)線上の平均勾配が増加（エッジに寄った） (3)Undo1回でラフ線へ戻る
   (4)エッジから遠すぎる線は半径外で「変化なし/経路なし」でも壊れない。 */
module.exports = {
  name: 'snap',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    // 現在フレームの線画素の平均勾配（線がエッジにどれだけ乗っているか）
    const avgGradOnLine = () => page.evaluate((lid) => {
      const S = window.CL.S, mg = window.CLSnap.getMag(); if (!mg) return -1;
      const d = S.frames.get(S.cur); if (!d) return -1; const a = d.lines.get(lid); if (!a) return -1;
      let sum = 0, n = 0; for (let i = 0; i < a.length; i++) if (a[i]) { sum += mg.mag[i]; n++; }
      return n ? sum / n : 0;
    }, lid);
    const linePop = () => page.evaluate((lid) => { const S = window.CL.S, d = S.frames.get(S.cur); if (!d) return -1; const a = d.lines.get(lid); if (!a) return 0; let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c; }, lid);
    // 線画素の集合（座標）ハッシュ
    const lineHash = () => page.evaluate((lid) => { const S = window.CL.S, d = S.frames.get(S.cur); const a = d && d.lines.get(lid); if (!a) return ''; let h = 0; for (let i = 0; i < a.length; i++) if (a[i]) h = (h * 31 + i) >>> 0; return '' + h; }, lid);

    const box = await ctx.viewBox();
    // ズームして局所を大きく（吸着が観測しやすい）。中央付近に雑な曲線を描く。
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -220 }); await sleep(30); }
    await sleep(200);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    // ギザギザの手描き（数点）
    const pts = [[cx - 120, cy - 40], [cx - 60, cy + 30], [cx + 10, cy - 20], [cx + 80, cy + 25], [cx + 130, cy - 30]];
    await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
    for (let i = 1; i < pts.length; i++) { await page.mouse.move(pts[i][0], pts[i][1]); await sleep(20); }
    await page.mouse.up(); await sleep(200);

    const pop0 = await linePop(); const grad0 = await avgGradOnLine(); const hash0 = await lineHash();
    t.ok(pop0 > 0, 'rough stroke drawn (' + pop0 + 'px)');
    t.ok(await page.evaluate(() => !!(window.CL.S.lastStroke && window.CL.S.lastStroke.pts.length >= 2)), 'lastStroke recorded with points');

    // W で吸着
    await page.evaluate(() => window.CLSnap.snapLastStroke()); await sleep(200);
    const hint = await page.$eval('#hint', (e) => e.textContent);
    const hash1 = await lineHash(); const grad1 = await avgGradOnLine();
    t.ok(hash1 !== hash0, 'snap changed the line pixels (hint="' + hint + '")');
    t.ok(grad1 >= grad0, 'snapped line sits on >= gradient than the rough line (' + grad0.toFixed(1) + ' -> ' + grad1.toFixed(1) + ')');

    // Undo 1回でラフ線へ戻る
    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await lineHash() === hash0, 'one Undo restores the rough stroke exactly');

    // 消費済み: 直後にもう一度Wしても no-op（lastStroke=null）
    await page.evaluate(() => window.CLSnap.snapLastStroke()); await sleep(120);
    // UndoでlastStrokeはnullのまま→「直前に描いた線がありません」
    const hint2 = await page.$eval('#hint', (e) => e.textContent);
    t.ok(/直前に描いた線がありません/.test(hint2), 'W after undo is a safe no-op (lastStroke consumed)');

    // P3レビュー回帰: 描く→この色を全消去→W は幻の線を復活させない（自己検証ガード）
    await page.mouse.move(cx - 100, cy + 60); await page.mouse.down(); await page.mouse.move(cx - 40, cy + 70); await page.mouse.move(cx + 30, cy + 55); await page.mouse.up(); await sleep(150);
    t.ok(await linePop() > 0, 'phantom-guard setup: fresh stroke drawn');
    await page.$eval('#clearColor', (e) => e.click()); await sleep(150);
    t.ok(await linePop() === 0, 'phantom-guard setup: color cleared to 0');
    await page.evaluate(() => window.CLSnap.snapLastStroke()); await sleep(150);
    const hint3 = await page.$eval('#hint', (e) => e.textContent);
    t.ok(await linePop() === 0, 'W after clearColor does NOT resurrect a phantom line [P3 review]');
    t.ok(/見つかりません/.test(hint3), 'W after clear reports the stroke is gone (self-validating guard)');

    // 端点スナップ修正の回帰（ユーザ報告: カーソルと違う場所にスナップ）:
    // 半径=画面約7px相当（scale=1で世界7px・円形）、半径外はスナップしない、真の端点を線上の点より優先。
    const fs = await page.evaluate(() => {
      const CL = window.CL, S = CL.S;
      CL.addLayer(); const l = S.activeLid;
      const arr = CL.writableLines(S.cur, l);
      for (let x = 100; x <= 140; x++) arr[100 * S.W + x] = 1; // 水平線 (100,100)-(140,100)
      const oldScale = S.view.scale; S.view.scale = 1;
      const farNull = CL.findSnap(S.cur, l, 120, 110) === null;      // 10px下 > 半径7 → null
      const nearMid = CL.findSnap(S.cur, l, 120, 103);                // 3px下 → 線上(120,100)
      const endPref = CL.findSnap(S.cur, l, 138, 104);                // 線上(138,100)d=4 < 端点(140,100)d≈4.47 でも端点優先
      const hiZoom = (() => { S.view.scale = 16; return CL.findSnap(S.cur, l, 120, 103); })(); // 16倍: 半径1px → 3px先はスナップしない
      S.view.scale = oldScale;
      return { farNull, nearMid, endPref, hiZoom };
    });
    t.ok(fs.farNull, 'findSnap: no snap beyond the ~7px screen radius (was 16-32px world at low zoom)');
    t.ok(fs.nearMid && Math.abs(fs.nearMid[0] - 120) <= 1 && fs.nearMid[1] === 100, 'findSnap: snaps to nearest on-line pixel within radius');
    t.ok(fs.endPref && fs.endPref[0] === 140 && fs.endPref[1] === 100, 'findSnap: TRUE ENDPOINT preferred over a nearer on-line pixel');
    t.ok(fs.hiZoom === null, 'findSnap: at 16x zoom radius shrinks to 1px world (was fixed 3px = 48 screen px)');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
