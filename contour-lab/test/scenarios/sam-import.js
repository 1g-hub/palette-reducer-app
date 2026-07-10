'use strict';
/* sam-import: SAM等の複数対象マスク列を contour-lab へ取り込む（対象→別レイヤ自動振り分け）。
   mask_L1_f00000 / mask_L2_f00000 / mask_L1_f00003 + manifest.json を実UI(#importMask)で読み、
   対象ごとに別の色レイヤへ入ること・フレーム対応・封止を検証（SAM→修正 パイプラインの受け口）。 */
module.exports = {
  name: 'sam-import',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const layerCount = () => page.evaluate(() => window.CL.S.layers.length);
    const layerPop = (f, lid) => page.evaluate((f, lid) => { const CLIO = window.CLIO, CLab = window.ContourLab, S = window.CL.S; const a = CLIO.getLines(f, lid); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let c = 0; for (let i = 0; i < a.length; i++) if (a[i] || fl[i]) c++; return c; }, f, lid);

    // objFromName の単体確認
    const parsed = await page.evaluate(() => [window.CLIO.objFromName('mask_L1_f00000.png'), window.CLIO.objFromName('mask_L2_f00003.png'), window.CLIO.objFromName('shot_f00000.png')]);
    t.ok(parsed[0] === 1 && parsed[1] === 2 && parsed[2] === null, 'objFromName parses L{n} object ids, null when absent');

    // SAM風マスクPNG群＋manifest を in-page で生成して #importMask へ流す
    await page.evaluate(async () => {
      const S = window.CL.S, W = S.W, H = S.H;
      const rectPng = async (x0, y0, x1, y1) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(x0, y0, x1 - x0, y1 - y0); return await new Promise((r) => c.toBlob(r, 'image/png')); };
      const files = [];
      files.push(new File([await rectPng(W * 0.1 | 0, H * 0.2 | 0, W * 0.4 | 0, H * 0.7 | 0)], 'mask_L1_f00000.png', { type: 'image/png' }));
      files.push(new File([await rectPng(W * 0.6 | 0, H * 0.3 | 0, W * 0.85 | 0, H * 0.75 | 0)], 'mask_L2_f00000.png', { type: 'image/png' }));
      files.push(new File([await rectPng(W * 0.12 | 0, H * 0.25 | 0, W * 0.42 | 0, H * 0.72 | 0)], 'mask_L1_f00003.png', { type: 'image/png' }));
      const manifest = { format: 'contour-lab-masks', version: 1, fps: S.fps, W, H, total: S.total, layers: [{ id: 1, name: '男の子', color: [255, 80, 80] }, { id: 2, name: '女の子', color: [80, 160, 255] }], frames: [0, 3] };
      files.push(new File([JSON.stringify(manifest)], 'manifest.json', { type: 'application/json' }));
      window.__samFiles = files;
    });
    const before = await layerCount();
    await page.evaluate(async () => { await window.CLIO.importMaskFiles(window.__samFiles); });
    await sleep(400);

    // レイヤ id 1,2 が存在（manifest の色/名前）
    const layers = await page.evaluate(() => window.CL.S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color })));
    const l1 = layers.find((l) => l.id === 1), l2 = layers.find((l) => l.id === 2);
    t.ok(l1 && l2, 'layers for object 1 and 2 exist after import');
    t.ok(l1 && l1.name === '男の子' && l2 && l2.name === '女の子', 'manifest layer names applied');
    t.ok(l2 && l2.color[0] === 80 && l2.color[2] === 255, 'manifest layer colors applied');

    // f0: 両対象、f3: 対象1のみ
    t.ok(await layerPop(0, 1) > 0 && await layerPop(0, 2) > 0, 'frame 0 has both objects on their own layers');
    t.ok(await layerPop(3, 1) > 0, 'frame 3 has object 1');
    t.ok(await layerPop(3, 2) === 0, 'frame 3 has NO object 2 (correct per-object routing)');
    // 対象が別レイヤ＝混ざっていない（f0 の L1 と L2 は別領域）
    const sep = await page.evaluate(() => { const CLIO = window.CLIO, S = window.CL.S; const a1 = CLIO.getLines(0, 1), a2 = CLIO.getLines(0, 2); let overlap = 0; for (let i = 0; i < a1.length; i++) if (a1[i] && a2[i]) overlap++; return overlap; });
    t.ok(sep === 0, 'object 1 and 2 masks do not overlap (routed to separate layers)');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
