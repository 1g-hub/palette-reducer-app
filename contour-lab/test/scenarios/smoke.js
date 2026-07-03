'use strict';
/* smoke: 読込 → api=yes/errs=0 → ペンで1ストローク → Undo → Redo。
   ストローク成立は #undoBtn の enabled/disabled（DOM で観測可能な副作用）で判定する。 */
module.exports = {
  name: 'smoke',
  async fn(ctx) {
    const { page, t, sleep } = ctx;

    const hasAPI = await page.evaluate(() => !!window.ContourLab);
    t.ok(hasAPI, 'window.ContourLab present (api=yes)');

    t.ok(await page.$eval('#undoBtn', (e) => e.disabled) === true, 'undo disabled before any stroke');

    // 実マウス入力で1ストローク（CDP mouse → 本物の pointer イベント → setPointerCapture も成立）
    const box = await ctx.viewBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 12);
    await page.mouse.move(cx + 80, cy - 16);
    await page.mouse.up();
    await sleep(200);

    t.ok(await page.$eval('#undoBtn', (e) => e.disabled) === false, 'undo enabled after stroke (committed)');

    await page.$eval('#undoBtn', (e) => e.click());
    await sleep(120);
    t.ok(await page.$eval('#undoBtn', (e) => e.disabled) === true, 'undo disabled after undoing the only stroke');
    t.ok(await page.$eval('#redoBtn', (e) => e.disabled) === false, 'redo enabled after undo');

    await page.$eval('#redoBtn', (e) => e.click());
    await sleep(120);
    t.ok(await page.$eval('#undoBtn', (e) => e.disabled) === false, 'undo enabled again after redo');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors (errs=0)' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
