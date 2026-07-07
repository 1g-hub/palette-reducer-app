'use strict';
/* carry-ghost (ユーザ報告バグ): SAM取込後、オブジェクトが消えたフレームへ carry が最後のマスクを
   引き継いで「幽霊マスク」が残り続ける問題。
   修正: ①取込で carry 自動OFF ②carry OFF 時に借用(shared)線を全フレームから一掃 ③carry状態を meta 永続。
   検証: 取込(f0,f1のみ)→f2/f3 に幽霊が出ない→carry手動ONで幽霊再現(旧挙動)→OFFで一掃・実データは無傷。 */
module.exports = {
  name: 'carry-ghost',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    async function goto(f) { await page.evaluate((f) => window.CL.requestFrame(f), f); const end = Date.now() + 8000; while (Date.now() < end) { if (await page.evaluate((f) => window.CL.S.cur === f && !!window.CL.S.frameBmp, f)) return true; await sleep(60); } return false; }
    const hasL = (f, lid) => page.evaluate((f, lid) => { const d = window.CL.S.frames.get(f); const a = d && d.lines.get(lid); if (!a) return false; for (let i = 0; i < a.length; i++) if (a[i]) return true; return false; }, f, lid);

    t.ok(await page.evaluate(() => window.CL.S.carry === true), 'precondition: carry ON by default');

    // SAM風取込: 対象5のマスクを f0,f1 だけに（f2以降=オブジェクト消失、SAMはPNGを出さない）
    await page.evaluate(async () => {
      const S = window.CL.S, W = S.W, H = S.H;
      const png = async () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(100, 100, 200, 200); return await new Promise((r) => c.toBlob(r, 'image/png')); };
      const files = [new File([await png()], 'mask_L5_f00000.png', { type: 'image/png' }), new File([await png()], 'mask_L5_f00001.png', { type: 'image/png' })];
      await window.CLIO.importMaskFiles(files);
    });
    await sleep(500);

    t.ok(await page.evaluate(() => window.CL.S.carry === false), 'import auto-disabled carry (fix①)');
    t.ok(await page.evaluate(() => document.getElementById('carryToggle').checked === false), 'carry checkbox unchecked');

    await goto(1); t.ok(await hasL(1, 5), 'f1 has the imported mask');
    await goto(2); t.ok(!(await hasL(2, 5)), 'f2 (object gone) has NO ghost mask [the reported bug]');
    await goto(3); t.ok(!(await hasL(3, 5)), 'f3 also clean');
    await goto(0); t.ok(await hasL(0, 5), 'rewind to f0: imported mask intact, no side effects');

    // 幽霊の旧挙動を carry 手動ONで再現 → OFF で一掃されること（fix②）
    await page.evaluate(() => { const c = document.getElementById('carryToggle'); c.checked = true; c.dispatchEvent(new Event('change')); });
    await goto(1); await goto(2);
    t.ok(await hasL(2, 5), 'with carry manually ON, the ghost appears on f2 (legacy carry behavior)');
    t.ok(await page.evaluate(() => { const d = window.CL.S.frames.get(2); return d.sharedLids.has(5); }), 'ghost is a borrowed (shared) copy, not owned data');
    await page.evaluate(() => { const c = document.getElementById('carryToggle'); c.checked = false; c.dispatchEvent(new Event('change')); });
    await sleep(200);
    t.ok(!(await hasL(2, 5)), 'turning carry OFF purges the ghost from f2 (fix②)');
    t.ok((await hasL(0, 5)) && (await hasL(1, 5)), 'owned imported masks on f0/f1 survive the purge');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
