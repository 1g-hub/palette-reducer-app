'use strict';
/* io.js (P1-3 / P1-4) — 一括書き出し(ZIP)とマスクPNG取込。
   書き出し: 所有フレーム×レイヤ を白黒PNG(mask_L{lid}_f{00000}.png)＋manifest.json で ZIP。
   取込: PNG → 二値化 → maskToLines → レイヤへ（fill は導出）。取込は全ての外部マスクの共通受け口。 */
(() => {
  if (!window.CL) return;
  const CL = window.CL, S = CL.S, CLab = window.ContourLab, $ = (id) => document.getElementById(id);
  const pad5 = (n) => String(n).padStart(5, '0');

  // ---- フレーム×レイヤの lines（所有 in-memory 優先、無ければ savedFrames の RLE） ----
  function getLines(f, lid) {
    const d = S.frames.get(f);
    if (d) { const a = d.lines.get(lid); if (a && !d.sharedLids.has(lid)) return a; }
    const rec = S.savedFrames && S.savedFrames.get(f);
    if (rec && rec[lid]) return CLab.bitmapFromRle(rec[lid], S.W * S.H);
    return null;
  }
  // 書き出し対象フレーム（所有 in-memory ∪ savedFrames）昇順
  function exportFrameList() {
    const set = new Set();
    for (const f of S.frames.keys()) if (CL.owned(f)) set.add(f);
    if (S.savedFrames) for (const f of S.savedFrames.keys()) set.add(f);
    return [...set].sort((a, b) => a - b);
  }
  const toBytes = (blob) => blob.arrayBuffer().then((b) => new Uint8Array(b));
  function maskPngBytes(f, lid) {
    const W = S.W, H = S.H, N = W * H, lines = getLines(f, lid); if (!lines) return null;
    const fill = CLab.computeFill(lines, W, H);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H), px = img.data;
    for (let i = 0, p = 0; i < N; i++, p += 4) { const on = (lines[i] || fill[i]) ? 255 : 0; px[p] = px[p + 1] = px[p + 2] = on; px[p + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return new Promise((res) => c.toBlob((b) => res(b ? toBytes(b) : null), 'image/png'));
  }
  async function buildExportFiles() {
    const frames = exportFrameList(), files = [], usedFrames = [];
    for (const f of frames) {
      let anyLayer = false;
      for (const L of S.layers) { const bytesP = maskPngBytes(f, L.id); if (!bytesP) continue; const bytes = await bytesP; if (bytes) { files.push({ name: 'mask_L' + L.id + '_f' + pad5(f) + '.png', data: bytes }); anyLayer = true; } }
      if (anyLayer) usedFrames.push(f);
    }
    const manifest = { format: 'contour-lab-masks', version: 1, fps: S.fps, W: S.W, H: S.H, total: S.total,
      layers: S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color })), frames: usedFrames };
    files.push({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 1)) });
    return files;
  }
  async function exportMasksZip() {
    if (!S.W) { CL.toast('動画が読み込まれていません'); return; }
    CL.toast('書き出し中…');
    const files = await buildExportFiles();
    if (files.length <= 1) { CL.toast('書き出す所有フレームがありません'); return; }
    const zip = CLab.zipStore(files);
    const blob = new Blob([zip], { type: 'application/zip' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'masks') + '_masks.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    CL.toast('書き出し完了（' + (files.length - 1) + '枚）');
  }

  // ---- 取込: 画像 → 二値マスク（S.W×S.H に描画） ----
  function imageToMask(bitmap, threshold) {
    const W = S.W, H = S.H, N = W * H, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0, W, H); // 解像度が違えば S.W×S.H に伸縮
    const d = ctx.getImageData(0, 0, W, H).data, mask = new Uint8Array(N);
    for (let i = 0, p = 0; i < N; i++, p += 4) { const lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; if (d[p + 3] > 127 && lum > threshold) mask[i] = 1; }
    return mask;
  }
  // マスクをレイヤに適用（mode: 'replace' | 'or'）。差分 Undo。lines=maskToLines(mask)、fill 再計算。
  function applyMaskToLayer(f, lid, mask, mode) {
    if (S.onFrameEnter) S.onFrameEnter(f); // 未訪問の保存フレームを先に復元（他レイヤの上書き喪失を防ぐ）
    const N = S.W * S.H, d = CL.fdata(f), newLines = CLab.maskToLines(mask, S.W, S.H);
    // 差分の基点は writableLines が複製する配列＝d.lines.get(lid)（借用/所有ともにこれ）と一致させる。
    // getLines は借用(shared)配列を隠す(null)ため、それを基点にすると 'replace' で借用線が消えず union になる（P4レビュー#5）。
    // 未訪問の保存フレームは直前の onFrameEnter で d.lines へ復元済みなので、d.lines.get(lid) で足りる。
    const old = d.lines.get(lid) || new Uint8Array(N), target = new Uint8Array(N);
    for (let i = 0; i < N; i++) target[i] = ((mode === 'or' ? (old[i] || newLines[i]) : newLines[i]) ? 1 : 0);
    const changed = new Map();
    for (let i = 0; i < N; i++) if ((old[i] ? 1 : 0) !== target[i]) changed.set(i, old[i] || 0);
    if (!changed.size) return 0;
    const w = CL.writableLines(f, lid); for (const [i] of changed) w[i] = target[i];
    d.fill.set(lid, CL.newFill(w)); CL.commitChanges(f, lid, changed);
    return changed.size;
  }
  const frameFromName = (name) => { const m = /f(\d{3,6})/.exec(name); return m ? +m[1] : null; };
  // 対象(オブジェクト/レイヤ)ID: `mask_L{N}_f#####.png`(本アプリ書き出し) / `obj{N}` / `L{N}_`（SAM等の複数対象）
  const objFromName = (name) => { const m = /(?:^|[^a-z0-9])L(\d+)[_.]f\d/i.exec(name) || /obj(?:ect)?[_-]?(\d+)/i.exec(name); return m ? +m[1] : null; };
  async function decodeImage(fileOrBlob) { try { return await createImageBitmap(fileOrBlob); } catch (e) { return await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('画像デコード失敗')); img.src = URL.createObjectURL(fileOrBlob); }); } }
  // 指定IDのレイヤを保証（無ければその id で作成）。SAM の obj id をそのまま色レイヤ id にする。
  function ensureLayer(id, color, name) {
    let L = S.layers.find((l) => l.id === id);
    if (!L) { L = { id, name: name || '', color: (color && color.length ? color.slice() : [200, 200, 200]), visible: true, opacity: 1 }; S.layers.push(L); if (id >= S.nextLid) S.nextLid = id + 1; CL.renderLayers(); }
    return L;
  }

  async function importMaskFiles(files) {
    if (!S.W) { CL.toast('先に動画を読み込んでください'); return; }
    const thr = +($('importThresh') ? $('importThresh').value : 127), modeSel = ($('importMode') && $('importMode').value) || 'replace';
    const arr = [...files];
    // manifest.json があればレイヤ(色/名前)を先に用意（本アプリ/SAM 書き出しの往復）
    const manifestFile = arr.find((f) => /\.json$/i.test(f.name));
    if (manifestFile) { try { const mani = JSON.parse(await manifestFile.text()); if (mani && Array.isArray(mani.layers)) for (const l of mani.layers) { const L = ensureLayer(l.id, l.color, l.name); if (l.name) L.name = l.name; if (l.color && l.color.length) L.color = l.color.slice(); } CL.renderLayers(); } catch (e) {} } // manifest は既存レイヤの名前/色も上書き（SAMの色と揃える）
    const imgs = arr.filter((f) => f !== manifestFile && !/\.json$/i.test(f.name));
    const multiObj = imgs.some((f) => objFromName(f.name) != null); // 複数対象＝各対象を別レイヤへ
    const startF = S.cur >= 0 ? S.cur : 0;
    const usedLayers = new Set();
    let applied = 0, idx = 0;
    const sorted = imgs.sort((a, b) => a.name.localeCompare(b.name));
    for (const file of sorted) {
      let bmp; try { bmp = await decodeImage(file); } catch (e) { continue; }
      const mask = imageToMask(bmp, thr);
      let f = frameFromName(file.name); if (f == null) f = startF + idx; // ファイル名に f##### が無ければ現在フレームから連番
      if (f < 0 || f >= S.total) { idx++; continue; }
      let target = S.activeLid;
      if (multiObj) { const o = objFromName(file.name); if (o != null) { ensureLayer(o); target = o; } }
      applyMaskToLayer(f, target, mask, multiObj ? 'replace' : modeSel); // 複数対象は各フレーム置換（追跡結果をそのまま）
      usedLayers.add(target); applied++; idx++;
    }
    if (S.onMetaChanged) S.onMetaChanged();
    CL.S.cur = -1; CL.requestFrame(S.want || 0); // 取込結果を再描画
    CL.toast('マスクを取込みました（' + applied + '枚' + (multiObj ? '・' + usedLayers.size + '色に振り分け' : '') + '）');
  }

  // ---- 本体(palette-reducer)取込用 JSON（P7: 形式凍結） ----
  // フレームキー = 整数フレーム番号（本体規約 floor(at*fps) と一致）。lid ごとに線形RLE [start,len,...]。
  // scenes は S.cuts から [{startF,endF}]。本体は bitmapFromRle で復号→自前の rleEncodeMask 機構で扱える（test で往復検証済み）。
  function buildMainAppExport() {
    const frames = {}, list = exportFrameList();
    for (const f of list) { const rec = {}; let any = false; for (const L of S.layers) { const lines = getLines(f, L.id); if (!lines) continue; const runs = CLab.rleFromBitmap(lines); if (runs.length) { rec[L.id] = Array.from(runs); any = true; } } if (any) frames[f] = rec; }
    const cuts = (S.cuts || []).slice().sort((a, b) => a - b), bounds = [0, ...cuts, S.total], scenes = [];
    for (let i = 0; i < bounds.length - 1; i++) scenes.push({ startF: bounds[i], endF: bounds[i + 1] });
    return { format: 'contour-lab-mainapp', version: 1, fps: S.fps, W: S.W, H: S.H, total: S.total,
      layers: S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color.slice() })), scenes, frames };
  }
  function exportMainAppJSON() {
    if (!S.W) { CL.toast('動画が読み込まれていません'); return; }
    const obj = buildMainAppExport();
    if (!Object.keys(obj.frames).length) { CL.toast('書き出す所有フレームがありません'); return; }
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'masks') + '.mainapp.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    CL.toast('本体用JSONを書き出しました（' + Object.keys(obj.frames).length + 'フレーム）');
  }

  // ---- UI 配線 ----
  if ($('exportMasksZip')) $('exportMasksZip').addEventListener('click', exportMasksZip);
  if ($('exportMainApp')) $('exportMainApp').addEventListener('click', exportMainAppJSON);
  const imp = $('importMask'); if (imp) imp.addEventListener('change', (e) => { const fs = e.target.files; if (fs && fs.length) importMaskFiles([...fs]); imp.value = ''; });

  window.CLIO = { buildExportFiles, exportFrameList, maskPngBytes, imageToMask, applyMaskToLayer, importMaskFiles, decodeImage, getLines, buildMainAppExport, objFromName, ensureLayer };
})();
