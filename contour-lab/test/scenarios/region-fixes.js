'use strict';
/* region-fixes: P4 敵対的レビューで確定した6件の回帰テスト。
   A(io.js#5): 借用(carry)フレームへの 'replace' が借用線を消す（union にならない）。
   B(slic#1/#5): 別フレームで作った割当を今のフレームへ確定させない（既存マスクを壊さない）。
   C(slic#2): 前景スクリブルは常にアクティブ色へ（色切替後も追従）。
   D(quantize#3 / slic#4): 動画読込でモジュールキャッシュがリセットされる。 */
module.exports = {
  name: 'region-fixes',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 10000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); } return false; }
    const maskAt = (f, lid, x, y) => page.evaluate((f, lid, x, y) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(f, lid); if (!a) { const d = S.frames.get(f); const aa = d && d.lines.get(lid); if (!aa) return 0; const fl = CLab.computeFill(aa, S.W, S.H); return (aa[y * S.W + x] || fl[y * S.W + x]) ? 1 : 0; } const fl = CLab.computeFill(a, S.W, S.H); return (a[y * S.W + x] || fl[y * S.W + x]) ? 1 : 0; }, f, lid, x, y);
    const layerPop = (f, lid) => page.evaluate((f, lid) => { const S = window.CL.S; const d = S.frames.get(f); if (!d) return -1; const a = d.lines.get(lid); if (!a) return 0; let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c; }, f, lid);
    // 半分を塗った矩形マスクを in-page で作って applyMaskToLayer
    const applyRect = (f, lid, side, mode) => page.evaluate((f, lid, side, mode) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); const x0 = side === 'left' ? (W * 0.15 | 0) : (W * 0.55 | 0), x1 = side === 'left' ? (W * 0.45 | 0) : (W * 0.85 | 0), y0 = H * 0.3 | 0, y1 = H * 0.7 | 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1; return window.CLIO.applyMaskToLayer(f, lid, m, mode); }, f, lid, side, mode);
    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    const LX = await page.evaluate(() => (window.CL.S.W * 0.30) | 0), RX = await page.evaluate(() => (window.CL.S.W * 0.70) | 0), MY = await page.evaluate(() => (window.CL.S.H * 0.5) | 0);

    // ===== A: 借用フレームへの 'replace' =====
    await goto(0);
    await applyRect(0, lid1, 'left', 'replace');     // f0 = 左（所有）
    t.ok(await maskAt(0, lid1, LX, MY) === 1, 'A setup: f0 has LEFT region');
    await goto(1);                                    // carry → f1 は左を借用
    t.ok(await page.evaluate(() => { const d = window.CL.S.frames.get(1); return !!(d && d.sharedLids.has(1)); }), 'A: f1 borrows layer1 (carried/shared)');
    t.ok(await maskAt(1, lid1, LX, MY) === 1, 'A: f1 shows carried LEFT region');
    await applyRect(1, lid1, 'right', 'replace');     // f1 を右で 'replace'
    t.ok(await maskAt(1, lid1, RX, MY) === 1, 'A: f1 now has RIGHT region');
    t.ok(await maskAt(1, lid1, LX, MY) === 0, 'A FIX: carried LEFT region CLEARED by replace (not union) [#5]');
    t.ok(await maskAt(0, lid1, LX, MY) === 1, 'A: source f0 LEFT still intact (COW clone)');

    // ===== B: 別フレームの割当を今のフレームへ確定させない =====
    await goto(7); await applyRect(7, lid1, 'left', 'replace'); const f7pop = await layerPop(7, lid1);
    t.ok(f7pop > 0, 'B setup: f7 has a mask (' + f7pop + 'px)');
    await goto(3);                                    // f3 でスクリブル
    await page.evaluate(() => document.getElementById('scribFg').click());
    const box = await ctx.viewBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6); await page.mouse.up(); await sleep(150);
    t.ok(await page.evaluate(() => window.CLSlic._assign() !== null && window.CLSlic._seedFrame() === 3), 'B setup: assignment computed on f3');
    await goto(7);                                    // スクリブルせず f7 へ
    await page.evaluate(() => document.getElementById('slicConfirm').click()); await sleep(200);
    const hint = await page.$eval('#hint', (e) => e.textContent);
    t.ok(/割当がありません/.test(hint), 'B FIX: confirm on a different frame is blocked with a toast [#1] (hint="' + hint + '")');
    t.ok(await layerPop(7, lid1) === f7pop, 'B FIX: f7 mask UNCHANGED (not corrupted by stale assignment) [#1/#5]');

    // ===== C: 前景スクリブルは常にアクティブ色へ =====
    await goto(4);
    await page.evaluate(() => window.CL.addLayer()); const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    await page.evaluate(() => { window.CL.setActive(1); document.getElementById('scribFg').click(); }); // FG=色1 を選択
    await page.evaluate((l2) => window.CL.setActive(l2), lid2);                                          // その後に色2へ切替
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6); await page.mouse.up(); await sleep(150);
    const seedHasL2 = await page.evaluate((l2) => { const s = window.CLSlic._seeds(); if (!s) return false; for (let i = 0; i < s.length; i++) if (s[i] === l2) return true; return false; }, lid2);
    const seedHasL1 = await page.evaluate(() => { const s = window.CLSlic._seeds(); if (!s) return false; for (let i = 0; i < s.length; i++) if (s[i] === 1) return true; return false; });
    t.ok(seedHasL2 && !seedHasL1, 'C FIX: FG scribble seeds go to the LIVE active layer (color2), not the stale one [#2]');

    // ===== D: 動画読込でキャッシュがリセット =====
    await goto(0); await page.evaluate(() => window.CL.setTool('wand'));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(300);
    const ck0 = await page.evaluate(() => window.CLQuant._cacheKey());
    t.ok(ck0 !== null && /1920x1080/.test(ck0), 'D setup: quant cache populated + key includes resolution [#3] (' + ck0 + ')');
    // 実リロードが走らせる onVideoLoaded チェーンを直接呼び、リセットを確認（同一ファイル再選択は change 不発の恐れがあるため）
    await page.evaluate(async () => { try { await window.CL.S.onVideoLoaded(new File([new Uint8Array([1])], 'reset-test.mp4')); } catch (e) {} });
    const dstate = await page.evaluate(() => ({ ck: window.CLQuant._cacheKey(), sf: window.CLSlic._seedFrame() }));
    t.ok(dstate.ck === null, 'D FIX: quant cache reset by onVideoLoaded chain [#3] (cacheKey=' + dstate.ck + ')');
    t.ok(dstate.sf === -1, 'D FIX: slic state reset by onVideoLoaded chain [#4] (seedFrame=' + dstate.sf + ')');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
