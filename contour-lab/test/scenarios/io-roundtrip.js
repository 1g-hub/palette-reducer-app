'use strict';
/* io-roundtrip (P1-3/P1-4): 描画 → buildExportFiles で PNG バイト生成 → 実ブラウザの PNG コーデックで
   デコード → imageToMask → 新レイヤへ applyMaskToLayer → 元マスクと画素一致。
   export のファイル名(mask_L{lid}_f00000.png + manifest.json)も検証。 */
module.exports = {
  name: 'io-roundtrip',
  async fn(ctx) {
    const { page, t, sleep } = ctx;

    // 閉領域になるよう四角形を描く（fill も出る代表ケース）
    const box = await ctx.viewBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const pts = [[cx - 60, cy - 40], [cx + 60, cy - 40], [cx + 60, cy + 40], [cx - 60, cy + 40], [cx - 60, cy - 40]];
    await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
    for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i][0], pts[i][1]);
    await page.mouse.up(); await sleep(150);

    const names = await page.evaluate(async () => (await window.CLIO.buildExportFiles()).map((f) => f.name));
    const lid1 = await page.evaluate(() => window.CL.S.activeLid);
    t.ok(names.includes('mask_L' + lid1 + '_f00000.png'), 'export contains mask_L' + lid1 + '_f00000.png');
    t.ok(names.includes('manifest.json'), 'export contains manifest.json');

    const r = await page.evaluate(async () => {
      const CL = window.CL, CLIO = window.CLIO, CLab = window.ContourLab, S = CL.S;
      const maskOf = (lid) => { const a = CLIO.getLines(0, lid); if (!a) return null; const fl = CLab.computeFill(a, S.W, S.H); const m = new Uint8Array(a.length); let c = 0; for (let i = 0; i < a.length; i++) if (a[i] || fl[i]) { m[i] = 1; c++; } return { m, c }; };
      const orig = maskOf(S.activeLid);
      const bytes = await CLIO.maskPngBytes(0, S.activeLid);
      const bmp = await CLIO.decodeImage(new Blob([bytes], { type: 'image/png' }));
      const mask2 = CLIO.imageToMask(bmp, 127);
      CL.addLayer(); const lid2 = S.activeLid;
      const applied = CLIO.applyMaskToLayer(0, lid2, mask2, 'replace');
      const recon = maskOf(lid2);
      let eq = !!(orig && recon) && orig.m.length === recon.m.length;
      if (eq) for (let i = 0; i < orig.m.length; i++) if (orig.m[i] !== recon.m[i]) { eq = false; break; }
      return { origC: orig && orig.c, reconC: recon && recon.c, applied, eq, bytesLen: bytes && bytes.length };
    });
    t.ok(r.bytesLen > 0, 'maskPngBytes produced a PNG (' + r.bytesLen + ' bytes)');
    t.ok(r.origC > 0, 'drawn mask non-empty (' + r.origC + ' px incl fill)');
    t.ok(r.applied > 0, 'import applied to new layer (' + r.applied + ' px changed)');
    t.ok(r.eq, 'PNG export→decode→maskToLines roundtrip is pixel-exact (' + r.origC + ' vs ' + r.reconC + ')');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors (errs=0)' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
