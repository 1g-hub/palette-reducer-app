'use strict';
/* sam-real: 実SAM出力（thxservで生成→展開したPNG群）を contour-lab へ取込む通し検証。
   CL_SAM_DIR に mask_L{obj}_f#####.png + manifest.json が必要（無ければ skip）。
   複数対象がある場合は各対象が別の色レイヤへ分かれること、実キャラマスク（枠端接触・複雑形状）が
   maskToLines→even-odd で封止復元されることを確認。 */
const fs = require('fs');
const path = require('path');
module.exports = {
  name: 'sam-real',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const dir = process.env.CL_SAM_DIR;
    if (!dir || !fs.existsSync(dir)) { t.ok(true, 'CL_SAM_DIR not set — skipped'); return; }
    const all = fs.readdirSync(dir);
    // 対象ごとに先頭3フレームずつ + manifest を取り込む
    const byObj = {};
    for (const n of all) { const m = /mask_L(\d+)_f(\d+)\.png$/.exec(n); if (m) (byObj[m[1]] = byObj[m[1]] || []).push(n); }
    const objIds = Object.keys(byObj).map(Number).sort((a, b) => a - b);
    const files = [];
    for (const o of objIds) files.push(...byObj[o].sort().slice(0, 3).map((n) => path.join(dir, n)));
    const manifest = all.find((n) => /manifest\.json$/.test(n)); if (manifest) files.push(path.join(dir, manifest));
    t.ok(objIds.length >= 1, 'found real SAM objects: ' + JSON.stringify(objIds));

    await (await page.$('#importMask')).uploadFile(...files);
    await sleep(700);

    const info = await page.evaluate((objIds) => {
      const S = window.CL.S, CLIO = window.CLIO, CLab = window.ContourLab;
      const cov = (f, lid) => { const a = CLIO.getLines(f, lid); if (!a) return null; const fl = CLab.computeFill(a, S.W, S.H); let on = 0; for (let i = 0; i < fl.length; i++) if (fl[i] || a[i]) on++; return 100 * on / (S.W * S.H); };
      const firstFrameOf = (lid) => { for (const f of [...S.frames.keys()].sort((a, b) => a - b)) { const a = S.frames.get(f).lines.get(lid); if (a) { let any = false; for (let i = 0; i < a.length; i++) if (a[i]) { any = true; break; } if (any) return f; } } return -1; };
      const res = { layers: S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color })), objs: {} };
      for (const o of objIds) { const ff = firstFrameOf(o); res.objs[o] = { firstFrame: ff, cov: ff >= 0 ? cov(ff, o) : null }; }
      // 対象1と2が別領域か（もし両方あれば、共通フレームは無いはず＝別シーンなので単に別レイヤ確認）
      return res;
    }, objIds);

    // 各対象に対応する色レイヤが存在し、封止復元されている
    for (const o of objIds) {
      const L = info.layers.find((l) => l.id === o);
      t.ok(!!L, 'layer for SAM object ' + o + ' exists (name=' + (L && L.name) + ' color=' + JSON.stringify(L && L.color) + ')');
      const od = info.objs[o];
      t.ok(od.cov > 15 && od.cov < 60, 'object ' + o + ' mask reconstructs to a sealed region (' + (od.cov == null ? 'null' : od.cov.toFixed(1) + '%') + ' at frame ' + od.firstFrame + ')');
    }
    if (objIds.length >= 2) t.ok(objIds.every((o) => info.layers.some((l) => l.id === o)) && new Set(info.layers.map((l) => l.id)).size >= objIds.length, 'multiple SAM objects routed to SEPARATE colour layers');

    await ctx.shot('final');
    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
