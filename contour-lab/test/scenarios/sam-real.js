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
    const zip = process.env.CL_SAM_ZIP, dir = process.env.CL_SAM_DIR;
    let files, objIds;
    if (zip && fs.existsSync(zip)) {
      // ZIP をそのまま #importMask へ（アプリ側でDEFLATE展開されるか検証）
      files = [zip]; objIds = null; // objIds は取込後にレイヤから判定
      t.ok(true, 'importing SAM ZIP directly: ' + path.basename(zip));
    } else if (dir && fs.existsSync(dir)) {
      const all = fs.readdirSync(dir), byObj = {};
      for (const n of all) { const m = /mask_L(\d+)_f(\d+)\.png$/.exec(n); if (m) (byObj[m[1]] = byObj[m[1]] || []).push(n); }
      objIds = Object.keys(byObj).map(Number).sort((a, b) => a - b);
      files = [];
      for (const o of objIds) files.push(...byObj[o].sort().slice(0, 3).map((n) => path.join(dir, n)));
      const manifest = all.find((n) => /manifest\.json$/.test(n)); if (manifest) files.push(path.join(dir, manifest));
      t.ok(objIds.length >= 1, 'found real SAM objects: ' + JSON.stringify(objIds));
    } else { t.ok(true, 'CL_SAM_ZIP / CL_SAM_DIR not set — skipped'); return; }

    await (await page.$('#importMask')).uploadFile(...files);
    // 取込完了（トースト「取込みました」）まで待つ。多数フレームのZIPは数秒〜かかる。
    { const end = Date.now() + 30000; while (Date.now() < end) { const h = await page.$eval('#hint', (e) => e.textContent).catch(() => ''); if (/取込みました/.test(h)) break; await sleep(300); } }
    await sleep(300);
    if (objIds == null) objIds = await page.evaluate(() => window.CL.S.layers.map((l) => l.id).filter((id) => { for (const d of window.CL.S.frames.values()) if (d.lines.get(id)) return true; return false; }));

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
