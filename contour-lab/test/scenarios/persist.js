'use strict';
/* persist (P1-2): http オリジンで IndexedDB を使い、
   ①描画→自動保存→リロード→同じ動画を開く→f0 マスクが復元される。
   ②プロジェクト JSON の buildProjectObject/applyProjectObject 往復で f0 が一致。 */
module.exports = {
  name: 'persist',
  serve: true, // IndexedDB は file:// では使えない → http 配信
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const framePop = (f) => page.evaluate((f) => {
      const d = window.CL.S.frames.get(f); if (!d) return -1; let c = 0;
      for (const arr of d.lines.values()) for (let i = 0; i < arr.length; i++) if (arr[i]) c++; return c;
    }, f);

    const dbOK = await page.evaluate(() => !!window.CLStore && !window.CLStore.dbBroken);
    t.ok(dbOK, 'IndexedDB usable on http origin');

    // f0 に描画
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 70, cy + 20); await page.mouse.move(cx + 110, cy - 15); await page.mouse.up();
    await sleep(150);
    const pop0 = await framePop(0);
    t.ok(pop0 > 0, 'f0 drawn (' + pop0 + ' px)');

    // 明示フラッシュ（デバウンス待ちを避け決定的に）
    await page.evaluate(async () => { await window.CLStore.flushFrames(); await window.CLStore.flushMeta(); });

    // リロード → 同じ動画を再オープン
    await page.reload({ waitUntil: 'domcontentloaded' });
    const input = await page.$('#fileInput'); await input.uploadFile(ctx.VIDEO);
    t.ok(await ctx.waitVideoLoaded(), 'video reloaded');
    t.ok(await ctx.waitFrameDrawn(), 'frame drawn after reload');
    await sleep(400);
    const popR = await framePop(0);
    t.ok(popR === pop0, 'reload restores f0 mask from IndexedDB (' + pop0 + '→' + popR + ')');

    // JSON 往復
    const obj = await page.evaluate(() => window.CLStore.buildProjectObject());
    t.ok(obj && obj.frames && Object.keys(obj.frames).length >= 1, 'buildProjectObject has frames');
    await page.$eval('#clearFrame', (e) => e.click()); await sleep(120);
    t.ok(await framePop(0) === 0, 'frame cleared before re-import');
    await page.evaluate((o) => window.CLStore.applyProjectObject(o), obj);
    // applyProjectObject が requestFrame(0) → 遅延復元。settle 待ち
    let popJ = -1; for (let i = 0; i < 30; i++) { popJ = await framePop(0); if (popJ === pop0) break; await sleep(80); }
    t.ok(popJ === pop0, 'JSON export/import roundtrip restores f0 (' + pop0 + '→' + popJ + ')');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors (errs=0)' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
