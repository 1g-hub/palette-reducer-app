'use strict';
/* legacy-restore (http): 旧形式プロジェクト（meta に carry フィールドが無い＝幽霊修正前の保存）を開いたら
   carry が自動OFFになる（保存済みプロジェクトでも幽霊が出ない）。明示的に carry:true を保存した新形式は尊重。 */
module.exports = {
  name: 'legacy-restore',
  serve: true,
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    // 描いて保存（新形式: carry:true が入る）
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 20); await page.mouse.up(); await sleep(150);
    await page.evaluate(async () => { await window.CLStore.flushFrames(); await window.CLStore.flushMeta(); });

    // meta から carry フィールドを削除して「旧形式」を作る
    await page.evaluate(async () => {
      const sig = window.CL.S.sig;
      await new Promise((res, rej) => {
        const rq = indexedDB.open('contour-lab', 1);
        rq.onsuccess = () => { const db = rq.result, tx = db.transaction('meta', 'readwrite'), st = tx.objectStore('meta');
          const g = st.get(sig); g.onsuccess = () => { const m = g.result; delete m.carry; st.put(m); }; tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
        rq.onerror = () => rej(rq.error);
      });
    });

    // リロード→再オープン → 旧形式メタ復元で carry 自動OFF
    await page.reload({ waitUntil: 'domcontentloaded' });
    await (await page.$('#fileInput')).uploadFile(ctx.VIDEO);
    t.ok(await ctx.waitVideoLoaded(), 'video reopened');
    await sleep(600);
    t.ok(await page.evaluate(() => window.CL.S.savedFrames.size >= 1), 'project restored (savedFrames present)');
    t.ok(await page.evaluate(() => window.CL.S.carry === false), 'LEGACY meta (no carry field) -> carry auto-OFF on restore [fix]');
    t.ok(await page.evaluate(() => document.getElementById('carryToggle').checked === false), 'carry checkbox reflects OFF');

    // 明示的に ON にして保存 → 再オープンで尊重される（新形式）
    await page.evaluate(() => { const c = document.getElementById('carryToggle'); c.checked = true; c.dispatchEvent(new Event('change')); });
    await page.evaluate(async () => { await window.CLStore.flushMeta(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await (await page.$('#fileInput')).uploadFile(ctx.VIDEO);
    t.ok(await ctx.waitVideoLoaded(), 'video reopened again');
    await sleep(600);
    t.ok(await page.evaluate(() => window.CL.S.carry === true), 'explicit carry:true in meta is respected on restore');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
