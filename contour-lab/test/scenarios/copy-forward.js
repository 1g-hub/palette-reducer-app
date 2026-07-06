'use strict';
/* copy-forward (機能2): SAM等で全フレームにマスクがある状況を模し、f0を修正した内容をf1へ上書きコピー。
   f0=左, f1=右（別内容）→ f0を次へコピー → f1が左（f0と一致）になる → Undoでf1が右に戻る。 */
module.exports = {
  name: 'copy-forward',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const rect = (f, side) => page.evaluate((f, lid, side) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); const x0 = side === 'left' ? (W * 0.15 | 0) : (W * 0.55 | 0), x1 = side === 'left' ? (W * 0.45 | 0) : (W * 0.85 | 0), y0 = H * 0.3 | 0, y1 = H * 0.7 | 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1; return window.CLIO.applyMaskToLayer(f, lid, m, 'replace'); }, f, lid, side);
    const hash = (f) => page.evaluate((f, lid) => { const S = window.CL.S; const d = S.frames.get(f); const a = d && d.lines.get(lid); if (!a) return 'none'; let h = 0; for (let i = 0; i < a.length; i++) if (a[i]) h = (h * 31 + i) >>> 0; return '' + h; }, f, lid);
    const at = (f, fx, fy) => page.evaluate((f, lid, fx, fy) => { const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); const x = fx * S.W | 0, y = fy * S.H | 0; return (a[y * S.W + x] || fl[y * S.W + x]) ? 1 : 0; }, f, lid, fx, fy);
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 8000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f, f)) return; await sleep(50); } }

    // 別対象（色2）を f1 に置く：copy-forward が色2を消さないこと（他対象温存）を確認するため
    await page.evaluate(() => window.CL.addLayer()); const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    await page.evaluate((f, l2) => { const S = window.CL.S, W = S.W, H = S.H, m = new Uint8Array(W * H); for (let y = H * 0.75 | 0; y < H * 0.9; y++) for (let x = W * 0.4 | 0; x < W * 0.6; x++) m[y * W + x] = 1; window.CLIO.applyMaskToLayer(f, l2, m, 'replace'); }, 1, lid2);
    const l2pop = () => page.evaluate((l2) => { const S = window.CL.S, d = S.frames.get(1), a = d && d.lines.get(l2); if (!a) return 0; let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c; }, lid2);
    const l2before = await l2pop();
    await page.evaluate((l) => window.CL.setActive(l), lid); // 色1を選択（コピー対象）

    // f0=左, f1=右（SAM が両方に別マスクを付けた状況、色1）
    await rect(0, 'left'); await rect(1, 'right');
    await goto(0);
    const h0 = await hash(0), h1before = await hash(1);
    t.ok(h0 !== 'none' && h1before !== 'none' && h0 !== h1before, 'setup: f0(left) and f1(right) differ');
    t.ok(await at(1, 0.7, 0.5) === 1 && await at(1, 0.3, 0.5) === 0, 'before: f1 has RIGHT (SAM mask)');

    // f0 の内容を次フレームへ上書きコピー
    await page.evaluate(() => window.CL.copyFrameForward('next'));
    await sleep(300);
    t.ok(await page.evaluate(() => window.CL.S.cur === 1), 'advanced to f1 after copy');
    t.ok(await hash(1) === h0, 'f1 now equals f0 (corrected mask copied over the SAM mask)');
    t.ok(await at(1, 0.3, 0.5) === 1 && await at(1, 0.7, 0.5) === 0, 'after: f1 has LEFT (f0 copy), RIGHT gone');
    t.ok(await l2pop() === l2before && l2before > 0, 'other colour (object 2) on f1 is PRESERVED (' + l2before + 'px) — active-layer-only copy');

    // Undo で f1 が元の右へ戻る
    await page.$eval('#undoBtn', (e) => e.click()); await sleep(150);
    t.ok(await hash(1) === h1before, 'Undo restores f1 to its original SAM mask');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
