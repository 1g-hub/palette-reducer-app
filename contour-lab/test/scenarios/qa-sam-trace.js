'use strict';
/* qa-sam-trace: 実SAMマスク（男の子）で T（なぞり吸着）を実行するQA。CL_SAM_DIR 必須（無ければskip）。
   頭頂部の輪郭を円ブラシで掃き、before/after のズームスクショを保存（人手の目視確認用）。
   自動判定: 置換発生・孤立画素0・塗り面積が±30%以内・Undo復元。 */
const fs = require('fs');
const path = require('path');
module.exports = {
  name: 'qa-sam-trace',
  async fn(ctx) {
    const { page, t, sleep } = ctx;
    const dir = process.env.CL_SAM_DIR;
    if (!dir || !fs.existsSync(path.join(dir, 'mask_L1_f00000.png'))) { t.ok(true, 'CL_SAM_DIR not set — skipped'); return; }
    await (await page.$('#importMask')).uploadFile(path.join(dir, 'mask_L1_f00000.png'), path.join(dir, 'manifest.json'));
    { const end = Date.now() + 20000; while (Date.now() < end) { const h = await page.$eval('#hint', (e) => e.textContent).catch(() => ''); if (/取込みました/.test(h)) break; await sleep(200); } }
    await page.evaluate(() => window.CL.setActive(1));

    // 頭頂部の輪郭点列を実データからサンプル（x=760..1150 の各列の最上線画素）
    const pts = await page.evaluate(() => {
      const S = window.CL.S, a = S.frames.get(S.cur).lines.get(1), W = S.W, out = [];
      for (let x = 760; x <= 1150; x += 30) { for (let y = 120; y < 500; y++) { if (a[y * W + x]) { out.push([x, y]); break; } } }
      return out;
    });
    t.ok(pts.length >= 8, 'sampled head-top contour points (' + pts.length + ')');

    // 頭頂部へズームして before スクショ
    await page.evaluate((pts) => { const S = window.CL.S; const cx = pts[Math.floor(pts.length / 2)][0], cy = pts[Math.floor(pts.length / 2)][1]; S.view.scale = 2; S.view.tx = -(cx * 2) + 560; S.view.ty = -(cy * 2) + 300; window.CL.render(); }, pts);
    await sleep(200); await ctx.shot('before');

    const stat = () => page.evaluate(() => {
      const S = window.CL.S, W = S.W, H = S.H, CLab = window.ContourLab, a = S.frames.get(S.cur).lines.get(1);
      const fl = CLab.computeFill(a, W, H); let fill = 0, iso = 0, h = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) h = (h * 31 + i) >>> 0; if (fl[i]) fill++; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!a[i]) continue; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (a[yy * W + xx]) n++; } if (n === 0) iso++; }
      return { fill, iso, hash: '' + h };
    });
    const s0 = await stat();
    t.ok(s0.fill > 100000, 'boy mask imported (fill ' + s0.fill + 'px, pre-existing isolated=' + s0.iso + ')');

    // T で頭頂部を掃く（半径10、輪郭点列に沿って実マウスドラッグ）
    await page.evaluate(() => { const el = document.getElementById('snapRadius'); el.value = 10; el.dispatchEvent(new Event('input')); window.CL.setTool('tracesnap'); });
    const [box, view] = await Promise.all([ctx.viewBox(), page.evaluate(() => ({ s: window.CL.S.view.scale, tx: window.CL.S.view.tx, ty: window.CL.S.view.ty }))]);
    const scr = (p) => [box.x + p[0] * view.s + view.tx, box.y + p[1] * view.s + view.ty];
    const sp = pts.map(scr);
    await page.mouse.move(sp[0][0], sp[0][1]); await page.mouse.down();
    for (let i = 1; i < sp.length; i++) await page.mouse.move(sp[i][0], sp[i][1]);
    await page.mouse.up(); await sleep(400);

    const hint = await page.$eval('#hint', (e) => e.textContent);
    const s1 = await stat();
    await ctx.shot('after');
    t.ok(/吸着しました/.test(hint), 'trace-snap applied on the REAL SAM contour (hint="' + hint + '")');
    t.ok(s1.hash !== s0.hash, 'contour changed');
    t.ok(s1.iso <= s0.iso, 'trace-snap created NO NEW isolated pixels (before=' + s0.iso + ' after=' + s1.iso + '; pre-existing SAM noise specks are not the tool\'s doing)');
    t.ok(s1.fill >= s0.fill * 0.7 && s1.fill <= s0.fill * 1.3, 'mask area sane (' + s0.fill + '->' + s1.fill + ')');

    await page.$eval('#undoBtn', (e) => e.click()); await sleep(200);
    t.ok((await stat()).hash === s0.hash, 'Undo restores the original SAM contour');

    // ===== フェーズ2: フレーム全体のエッジ吸着（実SAM輪郭の全周） =====
    await page.evaluate(() => { const el = document.getElementById('frameSnapRadius'); el.value = 5; el.dispatchEvent(new Event('input')); const h = document.getElementById('hint'); h.textContent = ''; });
    await page.$eval('#snapFrame', (e) => e.click());
    let hint2 = ''; { const end = Date.now() + 90000; while (Date.now() < end) { hint2 = await page.$eval('#hint', (e) => e.textContent).catch(() => ''); if (/吸着|中止|ありません|変化なし/.test(hint2)) break; await sleep(300); } }
    const s2 = await stat();
    await ctx.shot('frame_after');
    t.ok(/吸着しました/.test(hint2), 'FRAME-WIDE snap applied on the real SAM mask (hint="' + hint2 + '")');
    t.ok(s2.hash !== s0.hash, 'whole contour changed');
    t.ok(s2.iso <= s0.iso, 'frame-wide snap: no NEW isolated pixels (' + s0.iso + '->' + s2.iso + ')');
    t.ok(s2.fill >= s0.fill * 0.7 && s2.fill <= s0.fill * 1.3, 'frame-wide snap: mask area sane (' + s0.fill + '->' + s2.fill + ')');
    await page.$eval('#undoBtn', (e) => e.click()); await sleep(300);
    t.ok((await stat()).hash === s0.hash, 'one Undo restores everything after frame-wide snap');

    t.ok(ctx.errors.length === 0, 'no page errors' + (ctx.errors.length ? ': ' + ctx.errors.join(' | ') : ''));
  },
};
