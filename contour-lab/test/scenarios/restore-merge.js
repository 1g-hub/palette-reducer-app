'use strict';
/* restore-merge (review fixes #2/#3/#4): http オリジン。
   #2 復元後、所有レイヤと carry レイヤが同一フレームで共存（additive carry）。
   #3 未訪問の復元フレームへ import しても他レイヤが消えない。 */
module.exports = {
  name: 'restore-merge',
  serve: true,
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const popL = (f, lid) => page.evaluate((f, lid) => { const d = window.CL.S.frames.get(f); if (!d) return -1; const a = d.lines.get(lid); if (!a) return -1; let c = 0; for (let i = 0; i < a.length; i++) if (a[i]) c++; return c; }, f, lid);
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 10000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); } return false; }
    const flush = () => page.evaluate(async () => { await window.CLStore.flushFrames(); await window.CLStore.flushMeta(); });
    const reopen = async () => { await page.reload({ waitUntil: 'domcontentloaded' }); const inp = await page.$('#fileInput'); await inp.uploadFile(ctx.VIDEO); await ctx.waitVideoLoaded(); await ctx.waitFrameDrawn(); await sleep(300); };
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const draw = async (dx, dy) => { await page.mouse.move(cx + dx, cy + dy); await page.mouse.down(); await page.mouse.move(cx + dx + 50, cy + dy + 20); await page.mouse.move(cx + dx + 80, cy + dy - 10); await page.mouse.up(); await sleep(120); };

    t.ok(await page.evaluate(() => !window.CLStore.dbBroken), 'IndexedDB usable');
    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    await page.evaluate(() => window.CL.addLayer());
    const lid2 = await page.evaluate(() => window.CL.S.activeLid);
    t.ok(lid2 !== lid1, 'second layer created (' + lid1 + ',' + lid2 + ')');

    // #2: L1 on f4 → carry to f5 → L2 on f5
    await goto(4); await page.evaluate((l) => window.CL.setActive(l), lid1); await draw(-30, -20);
    await goto(5); await page.evaluate((l) => window.CL.setActive(l), lid2); await draw(30, 20);
    const f5L1 = await popL(5, lid1), f5L2 = await popL(5, lid2);
    t.ok(f5L1 > 0 && f5L2 > 0, 'before reload: f5 has both L1(carried) + L2(owned)');
    await flush();
    await reopen();
    await goto(4); await goto(5); await sleep(200);
    t.ok(await popL(5, lid2) === f5L2, 'after reload: f5 L2(owned) restored (' + f5L2 + ')');
    t.ok(await popL(5, lid1) === f5L1, 'after reload: f5 L1(carried) still present — additive carry (bug#2) (' + f5L1 + ')');

    // #3/#4: both layers on f10 → reload → import to L1 WITHOUT visiting f10
    await goto(10); await page.evaluate((l) => window.CL.setActive(l), lid1); await draw(-40, 30);
    await page.evaluate((l) => window.CL.setActive(l), lid2); await draw(40, -30);
    const f10L2 = await popL(10, lid2);
    t.ok(f10L2 > 0, 'f10 L2 drawn before reload (' + f10L2 + ')');
    await flush();
    await reopen();
    await page.evaluate(async (lid1) => {
      const CL = window.CL, S = CL.S, c = document.createElement('canvas'); c.width = S.W; c.height = S.H; const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, S.W, S.H); g.fillStyle = '#fff'; g.fillRect(100, 100, 140, 140);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      CL.setActive(lid1);
      await window.CLIO.importMaskFiles([new File([blob], 'mask_L' + lid1 + '_f00010.png', { type: 'image/png' })]);
    }, lid1);
    await sleep(300); await goto(10); await sleep(150);
    t.ok(await popL(10, lid2) === f10L2, 'after import to L1 on UNVISITED f10: L2 preserved (bug#3) (' + f10L2 + ')');
    t.ok(await popL(10, lid1) > 0, 'after import: L1 present on f10');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
