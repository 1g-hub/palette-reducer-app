'use strict';
/* cuts (P2): 解析パスが距離配列を作ること、detectCuts が感度に単調反応すること、
   そして carry のカット跨ぎガード（P2-3）を「手動カット」で確実に検証する。
   注: このAIクリップは意味的カット(≈505/600)での HSV 距離が小さく(≈0.03)、シーン内モーション(frame106,0.17)が
   最大になるため、HSV自動カットはこの素材では弱い（感度スライダ＋手動編集が実用路）。詳細は PROGRESS.md。 */
module.exports = {
  name: 'cuts',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const linePop = (f) => page.evaluate((f) => { const S = window.CL.S, d = S.frames.get(f); if (!d) return -1; const a = d.lines.get(S.activeLid); if (!a) return -1; let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c; }, f);
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 12000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); } return false; }

    // 1. 解析メカニズム
    await page.evaluate(() => window.CLTimeline.runAnalyze());
    const di = await page.evaluate(() => { const d = window.CL.S.cutDists || []; let nz = 0, mx = 0; for (const v of d) if (v > 0) { nz++; if (v > mx) mx = v; } return { len: d.length, total: window.CL.S.total, nz, mx }; });
    t.ok(di.len === di.total && di.nz > 50, 'analysis populated per-frame distances (' + di.nz + ' nonzero / ' + di.total + ', max ' + di.mx.toFixed(3) + ')');

    // 2. detectCuts は感度に単調（低感度ほどカット数 >= 高感度）
    const lo = await page.evaluate(() => window.ContourLab.detectCuts(window.CL.S.cutDists, 0.1).length);
    const hi = await page.evaluate(() => window.ContourLab.detectCuts(window.CL.S.cutDists, 0.82).length);
    t.ok(lo >= hi, 'detectCuts monotonic in sensitivity (sens0.1→' + lo + ' cuts >= sens0.82→' + hi + ')');

    // 3. carry カット跨ぎガード（手動カットで確実に）
    const C = 300;
    await page.evaluate((c) => { window.CL.S.cuts = [c]; }, C);
    t.ok(await page.evaluate((c) => window.CL.sceneIndexOf(c - 1) !== window.CL.sceneIndexOf(c), C), 'sceneIndexOf changes across manual cut at ' + C);
    await goto(C - 3);
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 15); await page.mouse.up(); await sleep(120);
    t.ok(await linePop(C - 3) > 0, 'drew on frame cut-3');
    await goto(C - 2); t.ok(await linePop(C - 2) > 0, 'carry within scene: cut-2 inherited');
    await goto(C - 1); t.ok(await linePop(C - 1) > 0, 'carry within scene: cut-1 inherited');
    await goto(C); t.ok(await linePop(C) <= 0, 'carry BLOCKED across the cut: frame ' + C + ' did NOT inherit (P2-3)');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
