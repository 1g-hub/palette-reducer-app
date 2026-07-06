'use strict';
/* sam-real: 実SAM出力（thxservで生成→展開したPNG群）を contour-lab へ取込む通し検証。
   CL_SAM_DIR に mask_L1_f#####.png + manifest.json が必要（無ければ skip）。
   実キャラマスク（枠端に接する複雑形状）が maskToLines→even-odd で封止復元されることを確認。 */
const fs = require('fs');
const path = require('path');
module.exports = {
  name: 'sam-real',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const dir = process.env.CL_SAM_DIR;
    if (!dir || !fs.existsSync(dir)) { t.ok(true, 'CL_SAM_DIR not set — skipped (set it to the extracted SAM masks dir)'); return; }
    const all = fs.readdirSync(dir);
    const pngs = all.filter((n) => /mask_L\d+_f\d+\.png$/.test(n)).sort().slice(0, 4); // 先頭4フレーム
    const manifest = all.find((n) => /manifest\.json$/.test(n));
    const files = pngs.map((n) => path.join(dir, n)).concat(manifest ? [path.join(dir, manifest)] : []);
    t.ok(pngs.length >= 1, 'found ' + pngs.length + ' real SAM mask PNGs to import');

    const input = await page.$('#importMask');
    await input.uploadFile(...files); // 実ファイルを実UIへ
    await sleep(600);

    // 対象1レイヤができ、f0 に大きな封止領域（男の子, 元マスク~36%）
    const r = await page.evaluate(() => {
      const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab;
      const L = S.layers.find((l) => l.id === 1);
      const a = CLIO.getLines(0, 1); if (!a) return { layer: !!L, cov: 0 };
      const fl = CLab.computeFill(a, S.W, S.H); let on = 0; for (let i = 0; i < fl.length; i++) if (fl[i] || a[i]) on++;
      return { layer: !!L, cov: 100 * on / (S.W * S.H), lname: L && L.name, lcolor: L && L.color };
    });
    t.ok(r.layer, 'layer for SAM object 1 exists (name=' + r.lname + ', color=' + JSON.stringify(r.lcolor) + ')');
    t.ok(r.cov > 20 && r.cov < 55, 'imported boy mask reconstructs to a sealed region ~ original coverage (' + r.cov.toFixed(1) + '% of frame, expect ~36%)');

    // 別フレームにも入っている
    const f2 = await page.evaluate(() => { const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab; const a = CLIO.getLines(2, 1); if (!a) return 0; const fl = CLab.computeFill(a, S.W, S.H); let on = 0; for (let i = 0; i < fl.length; i++) if (fl[i] || a[i]) on++; return 100 * on / (S.W * S.H); });
    t.ok(f2 > 20, 'frame 2 also imported (' + f2.toFixed(1) + '%)');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
