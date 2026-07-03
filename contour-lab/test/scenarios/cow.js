'use strict';
/* cow: COW メモリの検証。
   ①carry ON で多数フレームをスクラブしてもヒープが線形増加しない（参照共有）。
   ②fill は現在＋直近のみ保持（≤3フレーム）。
   ③carried フレームを編集しても source/兄弟フレームの line 画素が変わらない（エイリアシング無し）。
   ④編集の Undo で復元。 */
module.exports = {
  name: 'cow',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const lid = await page.evaluate(() => window.CL.S.activeLid);
    const linePop = (f) => page.evaluate((f, lid) => {
      const d = window.CL.S.frames.get(f); if (!d) return -1; const a = d.lines.get(lid); if (!a) return -1;
      let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c;
    }, f, lid);
    const gc = () => page.evaluate(() => { if (window.gc) { window.gc(); window.gc(); } });
    async function goto(f) {
      await page.evaluate((f) => window.CL.requestFrame(f), f);
      const end = Date.now() + 10000;
      while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); }
      return false;
    }

    await page.evaluate(() => { const c = document.getElementById('carryToggle'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } });

    // f0 に描画
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 20); await page.mouse.move(cx + 100, cy - 10); await page.mouse.up();
    await sleep(150);
    const pop0 = await linePop(0);
    t.ok(pop0 > 0, 'f0 has line pixels after drawing (' + pop0 + ')');

    await gc(); const heap0 = (await page.metrics()).JSHeapUsedSize;

    // 1..N を1枚ずつスクラブ（毎回 carry を発火させる）
    const N = 40; let settled = 0;
    for (let i = 1; i <= N; i++) { if (await goto(i)) settled++; }
    t.ok(settled === N, 'scrubbed all ' + N + ' frames one-by-one (settled ' + settled + ')');

    await gc(); const heap1 = (await page.metrics()).JSHeapUsedSize;
    const deltaMB = (heap1 - heap0) / 1048576;
    const WH = await page.evaluate(() => window.CL.S.W * window.CL.S.H);
    const cloneProjMB = N * 2 * WH / 1048576; // COW でなければ lines+fill を毎フレーム複製 → この規模
    t.ok(deltaMB < 60, 'heap growth over ' + N + ' carried frames < 60MB (got ' + deltaMB.toFixed(1) + 'MB; non-COW projection ~' + cloneProjMB.toFixed(0) + 'MB)');

    const fillFrames = await page.evaluate(() => { let c = 0; for (const d of window.CL.S.frames.values()) if (d.fill.size) c++; return c; });
    t.ok(fillFrames <= 3, 'fills retained on ≤3 frames (got ' + fillFrames + ')');

    t.ok(await linePop(20) === pop0, 'carried frame f20 shares f0 line count (' + pop0 + ')');

    // エイリアシング: f20 に加筆 → f0/f19/f21 は不変
    await goto(20);
    await page.evaluate(() => window.CL.setTool('pen'));
    await page.mouse.move(cx, cy + 40); await page.mouse.down(); await page.mouse.move(cx + 80, cy + 50); await page.mouse.up(); await sleep(120);
    const pop20 = await linePop(20);
    t.ok(pop20 > pop0, 'f20 gained pixels by drawing (' + pop0 + '→' + pop20 + ')');
    t.ok(await linePop(0) === pop0, 'f0 UNCHANGED after editing f20 (no aliasing)');
    t.ok(await linePop(19) === pop0, 'f19 UNCHANGED after editing f20');
    t.ok(await linePop(21) === pop0, 'f21 UNCHANGED after editing f20');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(120);
    t.ok(await linePop(20) === pop0, 'Undo restores f20 to f0 line count');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors (errs=0)' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
