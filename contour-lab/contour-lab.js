/* 輪郭ラボ (P1) — 手描き領域マスク・スタンドアロン
   100%ブラウザ内。動画→フレーム送り→1px8近傍フリーハンド→閉領域塗り。
   塗りは even-odd（連結成分＋外部からのBFS距離パリティ）で、入れ子の閉領域が穴（ドーナツ）になる。
   純関数(snapFps/bresenham/computeFill/sobelRGBA)は window.ContourLab で公開しテスト可能。 */
(() => {
  'use strict';

  /* ============ 純アルゴリズム（テスト可能・DOM非依存） ============ */
  const STD_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];
  // 最近傍の標準レートへ（1.2%以内のみ）。先頭一致だと 30↔29.97 / 24↔23.976 を取り違える（フレーム番号ズレの元）。
  function snapFps(raw) { if (!(raw > 0)) return 0; let best = raw, bestD = 0.012; for (const f of STD_FPS) { const d = Math.abs(raw - f) / f; if (d < bestD) { bestD = d; best = f; } } return best; }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // 8近傍(Bresenham)で (x0,y0)->(x1,y1) を val で塗る。changed(Map idx->old) に旧値を記録。
  function bresenham(arr, W, H, x0, y0, x1, y1, val, changed) {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    for (;;) {
      if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < H) { const i = y0 * W + x0; if (arr[i] !== val) { if (changed && !changed.has(i)) changed.set(i, arr[i]); arr[i] = val; } }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // even-odd 塗り。lines(8近傍の線)で区切られた「線でない画素」を4近傍で連結成分に分け、
  // 外周に接する成分=外部(深さ0)からBFS。線をまたぐ隣接で深さ+1。奇数深さ=塗り、偶数=空(穴/外部)。
  // → 単独の閉輪は塗り、その内側にもう一つ閉輪を描くと穴（ドーナツ）。未閉の輪は外部と繋がり塗られない（リーク安全）。
  // comp(Int32 N) / st(Int32 N) は再利用バッファ（省略時は確保）。
  function computeFill(lines, W, H, comp, st) {
    const N = W * H;
    comp = comp || new Int32Array(N); st = st || new Int32Array(N);
    comp.fill(-1);
    const isBorder = []; let nc = 0;
    for (let s = 0; s < N; s++) {
      if (lines[s] || comp[s] >= 0) continue;
      const id = nc++; isBorder.push(false); let sp = 0; st[sp++] = s; comp[s] = id;
      while (sp) {
        const p = st[--sp], x = p % W, y = (p / W) | 0;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) isBorder[id] = true;
        if (x > 0) { const q = p - 1; if (!lines[q] && comp[q] < 0) { comp[q] = id; st[sp++] = q; } }
        if (x < W - 1) { const q = p + 1; if (!lines[q] && comp[q] < 0) { comp[q] = id; st[sp++] = q; } }
        if (y > 0) { const q = p - W; if (!lines[q] && comp[q] < 0) { comp[q] = id; st[sp++] = q; } }
        if (y < H - 1) { const q = p + W; if (!lines[q] && comp[q] < 0) { comp[q] = id; st[sp++] = q; } }
      }
    }
    const fill = new Uint8Array(N);
    if (nc === 0) return fill;
    const adj = new Array(nc); for (let i = 0; i < nc; i++) adj[i] = new Set();
    const nb = [];
    for (let p = 0; p < N; p++) {
      if (!lines[p]) continue; const x = p % W, y = (p / W) | 0; nb.length = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const c = comp[yy * W + xx]; if (c >= 0 && nb.indexOf(c) < 0) nb.push(c); }
      for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) { adj[nb[i]].add(nb[j]); adj[nb[j]].add(nb[i]); }
    }
    const dist = new Int32Array(nc).fill(-1); const q = []; let head = 0;
    for (let id = 0; id < nc; id++) if (isBorder[id]) { dist[id] = 0; q.push(id); }
    if (!q.length) { const cnt = new Int32Array(nc); for (let p = 0; p < N; p++) if (comp[p] >= 0) cnt[comp[p]]++; let best = 0, bn = -1; for (let i = 0; i < nc; i++) if (cnt[i] > bn) { bn = cnt[i]; best = i; } dist[best] = 0; q.push(best); }
    while (head < q.length) { const c = q[head++]; for (const d of adj[c]) if (dist[d] < 0) { dist[d] = dist[c] + 1; q.push(d); } }
    for (let p = 0; p < N; p++) { const c = comp[p]; if (c >= 0) { const dd = dist[c]; if (dd < 0 || (dd & 1)) fill[p] = 1; } }
    return fill;
  }

  // 1pxで滲まないエッジ：Sobel強度 → 勾配方向に沿った非極大抑制(NMS)で1px幅に細線化 → しきい値で二値(alpha 0/255)。
  // 強度比例のalphaだと勾配が2〜3px幅に広がり「太く・ぼやけて」見えるので、極大のみを不透明1pxで出す。
  function sobelRGBA(src, W, H, thresh) {
    thresh = thresh == null ? 30 : thresh;
    const N = W * H, gray = new Float32Array(N), mag = new Float32Array(N), dir = new Uint8Array(N);
    for (let i = 0, p = 0; i < N; i++, p += 4) gray[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
      const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
      mag[i] = Math.sqrt(gx * gx + gy * gy);
      let ang = Math.atan2(gy, gx) * 180 / Math.PI; if (ang < 0) ang += 180;
      dir[i] = (ang < 22.5 || ang >= 157.5) ? 0 : ang < 67.5 ? 1 : ang < 112.5 ? 2 : 3;
    }
    const out = new Uint8ClampedArray(N * 4);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, m = mag[i]; if (m < thresh) continue;
      let a, b;
      switch (dir[i]) {
        case 0: a = mag[i - 1]; b = mag[i + 1]; break;          // 勾配が水平（縦エッジ）→左右で細線化
        case 1: a = mag[i - W + 1]; b = mag[i + W - 1]; break;  // 45°→NE/SW
        case 2: a = mag[i - W]; b = mag[i + W]; break;          // 勾配が垂直（横エッジ）→上下
        default: a = mag[i - W - 1]; b = mag[i + W + 1];        // 135°→NW/SE
      }
      if (m >= a && m > b) { const p4 = i * 4; out[p4] = 10; out[p4 + 1] = 240; out[p4 + 2] = 255; out[p4 + 3] = 255; } // 勾配方向の極大のみ＝1px・不透明
    }
    return out;
  }

  // ビットマップ(0/1) ⇄ RLE。RLE は線形インデックス上の [start,len, start,len, ...]（Int32Array）。
  // スナップ型 Undo と保存でフルバッファの代わりに使い、一括操作のメモリ肥大を防ぐ。
  function rleFromBitmap(u8) {
    const runs = [], n = u8.length; let i = 0;
    while (i < n) { if (u8[i]) { const s = i; i++; while (i < n && u8[i]) i++; runs.push(s, i - s); } else i++; }
    return Int32Array.from(runs);
  }
  function bitmapFromRle(runs, N) {
    const out = new Uint8Array(N); if (!runs) return out;
    for (let k = 0; k < runs.length; k += 2) { const s = runs[k], len = runs[k + 1]; for (let j = 0; j < len; j++) out[s + j] = 1; }
    return out;
  }

  const API = { snapFps, bresenham, computeFill, sobelRGBA, clamp, rleFromBitmap, bitmapFromRle };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;

  /* ============ 状態 ============ */
  const DEFAULT_COLORS = [[255, 64, 64], [64, 160, 255], [80, 220, 120], [255, 200, 50], [200, 100, 255], [255, 130, 200]];
  const S = {
    video: null, url: null, W: 0, H: 0, fps: 30, duration: 0, total: 1, cur: -1, want: 0,
    frameBmp: null, frameImgData: null, bmpCache: new Map(), edgeCache: new Map(),
    frames: new Map(), fillLRU: [], arrRefs: new WeakMap(), layers: [], activeLid: 0, nextLid: 1,
    tool: 'pen', snap: true, eraserSize: 3, objectEraser: false,
    showGrid: true, edgeOn: false, edgeOpacity: 0.7, srcOpacity: 1, maskOpacity: 0.55, maskHidden: false, carry: true,
    view: { scale: 1, tx: 0, ty: 0 }, minScale: 1,
    drawing: false, panning: false, space: false, panSX: 0, panSY: 0,
    lastPX: 0, lastPY: 0, startPX: 0, startPY: 0, strokeOld: null,
    cursorWX: 0, cursorWY: 0, snapPt: null,
    undo: new Map(), redo: new Map(),
    maskCanvas: null, maskCtx: null, maskImg: null, maskDirty: true,
    ctx: null, cw: 0, ch: 0, dpr: 1, comp: null, st: null, scr: null, scrCtx: null,
  };

  const $ = (id) => document.getElementById(id);
  const dom = {};
  ['fileInput', 'videoInfo', 'frameNav', 'firstFrame', 'prevFrame', 'frameLabel', 'nextFrame', 'lastFrame', 'frameSlider',
    'zoomGrp', 'zoomFit', 'zoom100', 'panel', 'fpsInput', 'fpsDetected', 'toolPen', 'toolEraser', 'snapToggle',
    'eraserSize', 'eraserSizeLabel', 'objectEraser', 'layerList', 'addLayer', 'cleanInterior', 'removeStray', 'clearColor',
    'maskHidden', 'maskOpacity', 'edgeToggle', 'edgeOpacity', 'srcOpacity', 'gridToggle', 'carryToggle', 'copyNext', 'copyScene',
    'undoBtn', 'redoBtn', 'clearFrame', 'exportPng', 'view', 'empty', 'hint',
  ].forEach((k) => { dom[k] = $(k); });

  /* ============ 小物 ============ */
  const activeLayer = () => S.layers.find((l) => l.id === S.activeLid) || null;
  function fdata(f) { let d = S.frames.get(f); if (!d) { d = { lines: new Map(), fill: new Map(), sharedLids: new Set(), inherited: false, touched: new Set() }; S.frames.set(f, d); } return d; }
  function layerLines(f, lid, create) { const d = fdata(f); let a = d.lines.get(lid); if (!a && create) { a = new Uint8Array(S.W * S.H); d.lines.set(lid, a); } return a; }
  // COW: 書き込み可能な lines を返す。maybeCarry で共有(借用)された配列は初回書込前にクローンして所有化する。
  // 全ての書込経路（pen/erase/object/shape/clearColor/applyCh/取込）はこれ経由で lines を得ること。
  // 参照カウント(arrRefs)で「2フレーム以上が同じ配列を参照中か」を判定して複製する。sharedLids(借用マーカ)
  // だけでは source 側(所有として貸出中)の編集を捕捉できず、借用フレームを in-place で壊す（レビュー指摘#1）。
  function writableLines(f, lid) {
    const d = fdata(f); let a = d.lines.get(lid);
    if (a) {
      const rc = S.arrRefs.get(a) || 1;
      if (rc > 1) { // 他フレームと共有中 → 複製してから書く（source/borrower どちらの編集でも安全）
        if (rc - 1 <= 1) S.arrRefs.delete(a); else S.arrRefs.set(a, rc - 1);
        a = Uint8Array.from(a); d.lines.set(lid, a); d.fill.delete(lid);
      }
      d.sharedLids.delete(lid); // 書込後は所有（複製 or 単独参照）
    } else { a = new Uint8Array(S.W * S.H); d.lines.set(lid, a); d.sharedLids.delete(lid); }
    return a;
  }
  // 所有フレーム = 借用でない lines を1色でも実体で持つ（タイムライン/保存/書き出しの対象）。
  function owned(f) { const d = S.frames.get(f); if (!d) return false; for (const lid of d.lines.keys()) if (!d.sharedLids.has(lid)) return true; return false; }
  // シーン番号 = f 以下のカット数（P2）。カット未検出なら全体で1シーン(0)。
  function sceneIndexOf(f) { const cuts = S.cuts; if (!cuts || !cuts.length) return 0; let n = 0; for (let i = 0; i < cuts.length; i++) if (cuts[i] <= f) n++; return n; }
  // fill は導出物。現在フレーム＋直近数枚だけ保持し、それ以外は捨てる（再訪時に lines から再計算）。
  function retainFillsFor(f) {
    const lru = S.fillLRU, i = lru.indexOf(f); if (i >= 0) lru.splice(i, 1); lru.push(f);
    while (lru.length > 3) { const g = lru.shift(); const d = S.frames.get(g); if (d) d.fill = new Map(); }
  }
  function newFill(lines) { return lines ? computeFill(lines, S.W, S.H, S.comp, S.st) : new Uint8Array(S.W * S.H); }
  function toWorld(sx, sy) { const v = S.view; return [(sx - v.tx) / v.scale, (sy - v.ty) / v.scale]; }
  function stackOf(map, f) { let a = map.get(f); if (!a) { a = []; map.set(f, a); } return a; }
  let hintTimer = null;
  function toast(msg) { dom.hint.textContent = msg; dom.hint.hidden = false; if (hintTimer) clearTimeout(hintTimer); hintTimer = setTimeout(() => { dom.hint.hidden = true; }, 1600); }
  function lru(map, max) { while (map.size > max) { const k = map.keys().next().value, val = map.get(k); if (val && val.close) { try { val.close(); } catch (e) {} } map.delete(k); } }
  let rafPending = false;
  function scheduleRender() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; render(); }); }

  /* ============ 動画読み込み ============ */
  dom.fileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) loadVideo(f).catch((err) => toast('読み込み失敗: ' + err.message)); });

  async function loadVideo(file) {
    if (S.url) URL.revokeObjectURL(S.url);
    S.url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = S.url;
    await new Promise((res, rej) => { v.addEventListener('loadedmetadata', res, { once: true }); v.addEventListener('error', () => rej(new Error('動画を復号できません')), { once: true }); });
    S.video = v; S.W = v.videoWidth; S.H = v.videoHeight; S.duration = v.duration || 1;
    let fps = 0; try { fps = await measureFps(v); } catch (e) { fps = 0; }
    S.fps = fps > 0 ? fps : (parseFloat(dom.fpsInput.value) || 30);
    dom.fpsInput.value = (+S.fps.toFixed(3)).toString();
    dom.fpsDetected.textContent = fps > 0 ? `自動:${(+fps.toFixed(3))}` : '（自動計測不可・手入力）';
    S.total = Math.max(1, Math.round(S.duration * S.fps));
    S.frames.clear(); S.undo.clear(); S.redo.clear(); S.bmpCache.clear(); S.edgeCache.clear(); S.fillLRU = []; S.arrRefs = new WeakMap();
    S.comp = new Int32Array(S.W * S.H); S.st = new Int32Array(S.W * S.H); S.maskImg = null;
    S.scr = document.createElement('canvas'); S.scr.width = S.W; S.scr.height = S.H; S.scrCtx = S.scr.getContext('2d', { willReadFrequently: true });
    S.maskCanvas = document.createElement('canvas'); S.maskCanvas.width = S.W; S.maskCanvas.height = S.H; S.maskCtx = S.maskCanvas.getContext('2d');
    S.file = file; S.savedFrames = new Map(); S.sig = null;
    if (S.onVideoLoaded) { try { await S.onVideoLoaded(file); } catch (e) { console.warn('project restore failed', e); } } // 保存済みプロジェクトの復元（layers/fps/cuts/savedFrames）
    if (!S.layers.length) addLayer();
    dom.videoInfo.textContent = `${S.W}×${S.H} / ${S.duration.toFixed(2)}s / ${S.total}フレーム`;
    dom.frameNav.hidden = false; dom.zoomGrp.hidden = false; dom.panel.hidden = false; dom.empty.style.display = 'none';
    dom.frameSlider.max = S.total - 1; dom.frameSlider.value = 0;
    S.cur = -1; S.want = 0; resizeCanvas();
    dom.frameLabel.textContent = `0 / ${S.total - 1}`;
    await pumpLoad(); fitView();
  }

  function measureFps(v) {
    return new Promise((resolve) => {
      if (!('requestVideoFrameCallback' in v)) { resolve(0); return; }
      const times = []; let to = null;
      const done = () => { if (to) { clearTimeout(to); to = null; } v.pause(); if (times.length < 4) { resolve(0); return; } const dl = []; for (let i = 1; i < times.length; i++) dl.push(times[i] - times[i - 1]); dl.sort((a, b) => a - b); const med = dl[dl.length >> 1]; resolve(med > 0 ? snapFps(1 / med) : 0); };
      const cb = (now, meta) => { times.push(meta.mediaTime); if (times.length >= 20) { done(); return; } v.requestVideoFrameCallback(cb); };
      to = setTimeout(done, 3000);
      v.currentTime = 0; v.play().then(() => v.requestVideoFrameCallback(cb)).catch(() => done());
    });
  }

  /* ============ フレーム取得（中心シーク=境界回避。番号は intent=S.want を即時反映、読込は latest-wins） ============ */
  // フレーム読込は直列化（同時に複数シークを走らせない＝seekレース/誤キャッシュを防ぐ）。
  // 番号(S.want)は requestFrame が即時反映し、ポンプは常に最新の want を目指す（中間フレームはスキップ）。
  let loading = false;
  function requestFrame(f) {
    if (!S.video) return;
    f = clamp(f | 0, 0, S.total - 1); S.want = f;
    dom.frameSlider.value = f; dom.frameLabel.textContent = `${f} / ${S.total - 1}`;
    pumpLoad();
  }
  async function pumpLoad() {
    if (loading) return; loading = true;
    try {
      while (!S.frameBmp || S.cur !== S.want) {
        const f = S.want, prev = S.cur;
        try { await captureFrame(f); } catch (e) { toast('シーク失敗'); break; }
        S.cur = f;
        if (S.onFrameEnter) S.onFrameEnter(f); // 保存済みフレームを遅延復元（carry より優先）
        if (S.carry && prev >= 0 && prev !== f) maybeCarry(prev, f);
        ensureFills(f); retainFillsFor(f); S.maskDirty = true; updateUndoButtons(); render(); if (S.onTimelineRefresh) S.onTimelineRefresh();
      }
    } finally { loading = false; }
  }
  function seekTo(v, t) {
    return new Promise((res, rej) => {
      if (Math.abs(v.currentTime - t) < 1e-4 && v.readyState >= 2) { res(); return; }
      const to = setTimeout(() => { cleanup(); rej(new Error('timeout')); }, 15000);
      const ok = () => { cleanup(); requestAnimationFrame(() => res()); }; // 'seeked'後はrAFで1フレーム待つだけ。rVFCは一時停止中の動画でseek後に発火せずハングし得る（真っ白の原因）
      const er = () => { cleanup(); rej(new Error('seek')); };
      const cleanup = () => { clearTimeout(to); v.removeEventListener('seeked', ok); v.removeEventListener('error', er); };
      v.addEventListener('seeked', ok, { once: true }); v.addEventListener('error', er, { once: true }); v.currentTime = t;
    });
  }
  async function captureFrame(f) {
    const octx = S.scrCtx; let bmp = S.bmpCache.get(f);
    if (bmp) { octx.drawImage(bmp, 0, 0); }
    else { await seekTo(S.video, (f + 0.5) / S.fps); octx.drawImage(S.video, 0, 0, S.W, S.H); bmp = await createImageBitmap(S.scr); S.bmpCache.set(f, bmp); lru(S.bmpCache, 6); }
    S.frameImgData = octx.getImageData(0, 0, S.W, S.H); S.frameBmp = bmp;
  }
  function getEdge(f) {
    let ec = S.edgeCache.get(f); if (ec) return ec;
    if (f !== S.cur || !S.frameImgData) return null;
    const rgba = sobelRGBA(S.frameImgData.data, S.W, S.H, 30);
    const c = document.createElement('canvas'); c.width = S.W; c.height = S.H; c.getContext('2d').putImageData(new ImageData(rgba, S.W, S.H), 0, 0);
    S.edgeCache.set(f, c); lru(S.edgeCache, 4); return c;
  }
  function maybeCarry(prev, f) {
    const dp = S.frames.get(prev); if (!dp || !dp.lines.size) return;
    if (sceneIndexOf(prev) !== sceneIndexOf(f)) return; // カット跨ぎは引き継がない（P2-3）
    const df = fdata(f);
    // 追加式: 既にある色(所有/復元済み)は保持し、無い色だけ引き継ぐ。all-or-nothing だと復元フレームの
    // 所有レイヤが carry を丸ごと止め、他レイヤが消える（レビュー指摘#2）。
    for (const [lid, arr] of dp.lines) if (!df.lines.has(lid)) { df.lines.set(lid, arr); df.sharedLids.add(lid); S.arrRefs.set(arr, (S.arrRefs.get(arr) || 1) + 1); }
    df.inherited = false;
  }
  function ensureFills(f) { const d = S.frames.get(f); if (!d) return; for (const [lid, arr] of d.lines) if (!d.fill.has(lid)) d.fill.set(lid, newFill(arr)); }
  // 保存フック（storage.js が S.onFrameChanged/onMetaChanged/onFrameEnter/onVideoLoaded を差し込む。未ロード時は no-op）。
  function notifyFrameChanged(f) { if (S.onFrameChanged) S.onFrameChanged(f); if (S.onTimelineRefresh) S.onTimelineRefresh(); }
  function notifyMetaChanged() { if (S.onMetaChanged) S.onMetaChanged(); }
  function anyOwned() { for (const f of S.frames.keys()) if (owned(f)) return true; return !!(S.savedFrames && S.savedFrames.size); }

  /* ============ マスク合成（ネイティブ解像度・バッファ再利用） ============ */
  function rebuildMask() {
    if (!S.maskCtx) return;
    const W = S.W, H = S.H, N = W * H;
    if (!S.maskImg) S.maskImg = S.maskCtx.createImageData(W, H);
    const px = S.maskImg.data; px.fill(0);
    const d = S.frames.get(S.cur);
    if (d) for (const L of S.layers) {
      if (!L.visible) continue;
      const lines = d.lines.get(L.id), fill = d.fill.get(L.id); if (!lines && !fill) continue;
      const fa = Math.round(255 * 0.4 * L.opacity), la = Math.round(255 * L.opacity);
      const r = L.color[0], g = L.color[1], b = L.color[2];
      if (fill) for (let i = 0, p = 0; i < N; i++, p += 4) if (fill[i]) { px[p] = r; px[p + 1] = g; px[p + 2] = b; px[p + 3] = fa; }
      if (lines) for (let i = 0, p = 0; i < N; i++, p += 4) if (lines[i]) { px[p] = r; px[p + 1] = g; px[p + 2] = b; px[p + 3] = la; }
    }
    S.maskCtx.putImageData(S.maskImg, 0, 0); S.maskDirty = false;
  }

  /* ============ 描画（レンダー） ============ */
  function resizeCanvas() { const st = dom.view.parentElement; S.cw = st.clientWidth; S.ch = st.clientHeight; S.dpr = window.devicePixelRatio || 1; dom.view.width = Math.round(S.cw * S.dpr); dom.view.height = Math.round(S.ch * S.dpr); S.ctx = dom.view.getContext('2d'); }
  function fitView() { if (!S.W) return; const m = 24; S.minScale = Math.min((S.cw - m) / S.W, (S.ch - m) / S.H); S.view.scale = S.minScale; S.view.tx = (S.cw - S.W * S.view.scale) / 2; S.view.ty = (S.ch - S.H * S.view.scale) / 2; render(); }
  function zoom100() { zoomAt(S.cw / 2, S.ch / 2, 1 / S.view.scale); }
  function zoomAt(sx, sy, factor) { const v = S.view; const wx = (sx - v.tx) / v.scale, wy = (sy - v.ty) / v.scale; v.scale = clamp(v.scale * factor, S.minScale * 0.5, 64); v.tx = sx - wx * v.scale; v.ty = sy - wy * v.scale; render(); }
  function render() {
    const ctx = S.ctx, dpr = S.dpr, v = S.view; if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, dom.view.width, dom.view.height);
    if (!S.frameBmp) return;
    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.tx, dpr * v.ty); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = S.srcOpacity; ctx.drawImage(S.frameBmp, 0, 0); ctx.globalAlpha = 1;
    if (S.onAfterSource) S.onAfterSource(ctx, v); // 量子化ビュー/スクリブルプレビュー等の描画フック（P4）
    if (S.edgeOn) { const ec = getEdge(S.cur); if (ec) { ctx.globalAlpha = S.edgeOpacity; ctx.drawImage(ec, 0, 0); ctx.globalAlpha = 1; } }
    if (!S.maskHidden) { if (S.maskDirty) rebuildMask(); ctx.globalAlpha = S.maskOpacity; ctx.drawImage(S.maskCanvas, 0, 0); ctx.globalAlpha = 1; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.showGrid && v.scale >= 8) drawGrid(ctx);
    drawCursor(ctx);
  }
  function drawGrid(ctx) {
    const v = S.view, cw = S.cw, ch = S.ch;
    const x0 = Math.max(0, Math.floor(-v.tx / v.scale)), x1 = Math.min(S.W, Math.ceil((cw - v.tx) / v.scale));
    const y0 = Math.max(0, Math.floor(-v.ty / v.scale)), y1 = Math.min(S.H, Math.ceil((ch - v.ty) / v.scale));
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,150,200,.18)'; ctx.beginPath();
    for (let x = x0; x <= x1; x++) { const sx = Math.round(x * v.scale + v.tx) + 0.5; ctx.moveTo(sx, y0 * v.scale + v.ty); ctx.lineTo(sx, y1 * v.scale + v.ty); }
    for (let y = y0; y <= y1; y++) { const sy = Math.round(y * v.scale + v.ty) + 0.5; ctx.moveTo(x0 * v.scale + v.tx, sy); ctx.lineTo(x1 * v.scale + v.tx, sy); }
    ctx.stroke();
  }
  function drawCursor(ctx) {
    if (S.panning || S.space) return;
    const v = S.view, wx = Math.floor(S.cursorWX), wy = Math.floor(S.cursorWY);
    if (wx < 0 || wy < 0 || wx >= S.W || wy >= S.H) return;
    const cx = (wx + 0.5) * v.scale + v.tx, cy = (wy + 0.5) * v.scale + v.ty;
    const L = activeLayer(), col = S.tool === 'eraser' ? '#ffffff' : (L ? `rgb(${L.color[0]},${L.color[1]},${L.color[2]})` : '#fff');
    if (v.scale >= 8) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(Math.round(wx * v.scale + v.tx) + 0.5, Math.round(wy * v.scale + v.ty) + 0.5, v.scale, v.scale); }
    ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = 1; ctx.beginPath(); const s = 9; ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke(); ctx.globalAlpha = 1;
    if (S.tool === 'eraser' && !S.objectEraser) { const r = (S.eraserSize / 2) * v.scale; ctx.strokeStyle = '#ffffff88'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, r), 0, 7); ctx.stroke(); }
    if (S.snapPt && S.tool === 'pen') { const sx = (S.snapPt[0] + 0.5) * v.scale + v.tx, sy = (S.snapPt[1] + 0.5) * v.scale + v.ty; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, Math.max(5, v.scale * 0.7), 0, 7); ctx.stroke(); }
  }

  /* ============ スナップ（端点） ============ */
  function findSnap(f, lid, wx, wy) {
    if (!S.snap) return null;
    const arr = layerLines(f, lid, false); if (!arr) return null;
    const W = S.W, H = S.H, R = Math.max(3, Math.round(9 / S.view.scale));
    const cx = Math.round(wx), cy = Math.round(wy); let best = null, bestD = (R + 1) * (R + 1);
    for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
      const i = y * W + x; if (!arr[i]) continue;
      let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (arr[yy * W + xx]) n++; }
      if (n > 2) continue; const d = (x - wx) * (x - wx) + (y - wy) * (y - wy); if (d < bestD) { bestD = d; best = [x, y]; }
    }
    return best;
  }

  /* ============ 描画・消去（データのみ操作。表示は rebuildMask が担当＝選択色のみ演出） ============ */
  function penInto(x0, y0, x1, y1) { const arr = writableLines(S.cur, S.activeLid); bresenham(arr, S.W, S.H, x0, y0, x1, y1, 1, S.strokeOld); }
  function eraseInto(cx, cy) { const arr = writableLines(S.cur, S.activeLid), rr = S.eraserSize / 2, r = Math.ceil(rr), r2 = rr * rr, W = S.W, H = S.H; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r2) continue; const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (arr[i]) { if (!S.strokeOld.has(i)) S.strokeOld.set(i, arr[i]); arr[i] = 0; } } }
  function eraseSeg(x0, y0, x1, y1) { let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy; for (;;) { eraseInto(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } }

  /* ============ 入力（ポインタ） ============ */
  dom.view.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.view.addEventListener('pointerdown', (e) => {
    if (!S.frameBmp) return; dom.view.setPointerCapture(e.pointerId);
    const rect = dom.view.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (e.button === 1 || e.button === 2 || S.space) { S.panning = true; S.panSX = sx; S.panSY = sy; dom.view.classList.add('panning'); return; }
    if (e.button !== 0) return;
    const [wx, wy] = toWorld(sx, sy); let px = clamp(Math.floor(wx), 0, S.W - 1), py = clamp(Math.floor(wy), 0, S.H - 1);
    const L = activeLayer(); if (!L) return;
    if (S.tool !== 'pen' && S.tool !== 'eraser') { if (S.onToolDown) S.onToolDown(e, px, py, wx, wy); return; } // カスタムツール(ワンド/スクリブル等, P4)は完全委譲
    if (S.tool === 'eraser' && S.objectEraser) { // ドラッグで塊ごと消す：開始点で最初の flood
      S.drawing = true; S.strokeOld = new Map(); S.startPX = px; S.startPY = py; S.lastPX = px; S.lastPY = py;
      objectFloodAt(px, py); S.maskDirty = true; render(); return;
    }
    const snap = findSnap(S.cur, S.activeLid, wx, wy); if (snap && S.tool === 'pen') { px = snap[0]; py = snap[1]; }
    S.drawing = true; S.strokeOld = new Map(); S.startPX = px; S.startPY = py; S.lastPX = px; S.lastPY = py;
    S.strokePts = S.tool === 'pen' ? [[px, py]] : null; // 確定エッジスナップ(W)用の点列（P3-1）
    fdata(S.cur).touched.add(S.activeLid);
    if (S.tool === 'pen') penInto(px, py, px, py); else eraseInto(px, py);
    S.maskDirty = true; render();
  });
  dom.view.addEventListener('pointermove', (e) => {
    if (!S.frameBmp) return;
    const rect = dom.view.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (S.panning) { S.view.tx += sx - S.panSX; S.view.ty += sy - S.panSY; S.panSX = sx; S.panSY = sy; render(); return; }
    const [wx, wy] = toWorld(sx, sy); S.cursorWX = wx; S.cursorWY = wy;
    const px = clamp(Math.floor(wx), 0, S.W - 1), py = clamp(Math.floor(wy), 0, S.H - 1);
    if (S.drawing) {
      if (S.tool === 'pen') { penInto(S.lastPX, S.lastPY, px, py); if (S.strokePts && (px !== S.lastPX || py !== S.lastPY)) S.strokePts.push([px, py]); }
      else if (S.objectEraser) objectEraseSeg(S.lastPX, S.lastPY, px, py);
      else eraseSeg(S.lastPX, S.lastPY, px, py);
      S.lastPX = px; S.lastPY = py; S.snapPt = null; S.maskDirty = true; scheduleRender();
    } else { S.snapPt = S.tool === 'pen' ? findSnap(S.cur, S.activeLid, wx, wy) : null; scheduleRender(); }
  });
  function endStroke() {
    if (!S.drawing) return; S.drawing = false;
    const f = S.cur, lid = S.activeLid, d = fdata(f);
    if (S.snap && S.tool === 'pen') { const snap = findSnap(f, lid, S.cursorWX, S.cursorWY); if (snap && (snap[0] !== S.lastPX || snap[1] !== S.lastPY)) penInto(S.lastPX, S.lastPY, snap[0], snap[1]); }
    if (S.strokeOld && S.strokeOld.size) {
      const arr = writableLines(f, lid), before = pop(d.fill.get(lid)), n = S.strokeOld.size;
      d.fill.set(lid, newFill(arr));
      // ペンで新規に立てた画素(old=0→現在1)を記録＝W(確定スナップ)がこのストロークだけを差し替えるため（P3-1）
      if (S.tool === 'pen') { const added = []; for (const [i, o] of S.strokeOld) if (o === 0 && arr[i]) added.push(i); S.lastStroke = { frame: f, lid, pts: (S.strokePts || []).slice(), added, closed: pop(d.fill.get(lid)) - before > 0 }; }
      commitChanges(f, lid, S.strokeOld);
      if (S.tool === 'pen' && pop(d.fill.get(lid)) - before > 0) toast('閉領域を検出：塗りました');
      else if (S.tool === 'eraser' && S.objectEraser) toast(`オブジェクトを消去（${n}px）`);
    }
    S.strokeOld = null; S.strokePts = null; S.maskDirty = true; render(); updateUndoButtons();
  }
  function pop(u8) { if (!u8) return 0; let c = 0; for (let i = 0; i < u8.length; i++) if (u8[i]) c++; return c; }
  dom.view.addEventListener('pointerup', () => { if (S.panning) { S.panning = false; dom.view.classList.remove('panning'); return; } endStroke(); });
  dom.view.addEventListener('pointerleave', () => { S.snapPt = null; if (!S.drawing) scheduleRender(); });
  dom.view.addEventListener('wheel', (e) => { if (!S.frameBmp) return; e.preventDefault(); const rect = dom.view.getBoundingClientRect(); zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

  /* ============ 領域整形 / オブジェクト消しゴム ============ */
  function commitChanges(f, lid, changed) {
    const arr = layerLines(f, lid, true), n = changed.size, idx = new Int32Array(n), old = new Uint8Array(n), neu = new Uint8Array(n);
    let k = 0; for (const [i, o] of changed) { idx[k] = i; old[k] = o; neu[k] = arr[i]; k++; }
    pushUndo(f, { lid, idx, old, neu });
    notifyFrameChanged(f);
  }
  function shapeEdit(pred, msg) {
    const f = S.cur, lid = S.activeLid, d = fdata(f), lines0 = d.lines.get(lid); if (!lines0) { toast('この色に線がありません'); return; }
    const fill = d.fill.get(lid) || newFill(lines0), W = S.W, H = S.H, N = W * H, rm = [];
    // 判定は「元の」lines/fill だけを参照して消す画素を先に集める。走査中に lines を書き換えると、
    // 消したばかりの画素が「空き」に見え隣の内部線を輪郭と誤判定→1つ飛ばしで点線が残る（連打が要る）。
    for (let p = 0; p < N; p++) { if (lines0[p] && pred(lines0, fill, p, p % W, (p / W) | 0)) rm.push(p); }
    if (!rm.length) { toast('対象なし'); return; }
    const lines = writableLines(f, lid); // COW: 所有化してから一括適用
    const changed = new Map();
    for (let k = 0; k < rm.length; k++) { const p = rm[k]; changed.set(p, lines[p]); lines[p] = 0; }
    d.fill.set(lid, newFill(lines)); d.touched.add(lid); commitChanges(f, lid, changed); S.maskDirty = true; render(); updateUndoButtons(); toast(msg + `（${changed.size}px）`);
  }
  // 要望1: 塗り内部に埋もれた線を消し、輪郭（外側＋穴の縁）だけ残す。＝空き画素(穴/外部)に接しない線を消す。
  // 画面外(OOB)は「外部（空き）」とみなす＝return false（残す）。skip すると画面端に沿う輪郭が
  // 「埋もれている」と誤判定されて消える（キャラが枠に接する動画で頻発）。内部の埋もれ線の掃除は不変。
  function cleanInterior() { const W = S.W, H = S.H; shapeEdit((lines, fill, p, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; const q = yy * W + xx; if (!lines[q] && !fill[q]) return false; } return true; }, '内部の線を掃除'); }
  // 要望3: 領域形成に使われていない線（塗りに一切接しない浮いた線）を削除。
  function removeStray() { const W = S.W, H = S.H; shapeEdit((lines, fill, p, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (fill[yy * W + xx]) return false; } return true; }, '未使用の線を削除'); }
  // 要望: オブジェクト消しゴム＝ドラッグで、触れた同色マスク(塗り∪線)の塊をリアルタイムに一括消去。
  // 1回の flood は commit せず strokeOld に累積し、線・塗りとも即0にして見た目を即反映。
  // 確定 fill と undo(線のみ) は指を離した時=endStroke で処理する。
  function objectFloodAt(px, py) {
    const f = S.cur, lid = S.activeLid, d = fdata(f); if (!d.lines.get(lid) || !S.strokeOld) return;
    const lines = writableLines(f, lid); // COW: 所有化してから塊を消す
    let fill = d.fill.get(lid); if (!fill) { fill = newFill(lines); d.fill.set(lid, fill); }
    const W = S.W, H = S.H;
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    const start = py * W + px, inR = (i) => (lines[i] || fill[i]);
    if (!inR(start)) return; // マスク外に触れても何もしない
    const seen = S.comp; seen.fill(0); const stk = S.st; let sp = 0; stk[sp++] = start; seen[start] = 1;
    while (sp) {
      const p = stk[--sp];
      if (lines[p]) { if (!S.strokeOld.has(p)) S.strokeOld.set(p, lines[p]); lines[p] = 0; }
      if (fill[p]) fill[p] = 0; // 塗りも即0（見た目のため。確定fillはendStrokeで再計算）
      const x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (!seen[q] && inR(q)) { seen[q] = 1; stk[sp++] = q; } }
    }
    d.touched.add(lid);
  }
  function objectEraseSeg(x0, y0, x1, y1) { let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy; for (;;) { objectFloodAt(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } }
  // 要望2追加: 選択色の線だけを全消去。
  function clearColorAction() {
    const f = S.cur, lid = S.activeLid, d = S.frames.get(f); if (!d) return; const arr0 = d.lines.get(lid); if (!arr0) { toast('この色に線がありません'); return; }
    const changed = new Map(); for (let i = 0; i < arr0.length; i++) if (arr0[i]) changed.set(i, arr0[i]);
    if (!changed.size) { toast('対象なし'); return; }
    const arr = writableLines(f, lid); for (const [i] of changed) arr[i] = 0; // COW: 所有化してから消去
    d.fill.set(lid, newFill(arr)); commitChanges(f, lid, changed); S.maskDirty = true; render(); updateUndoButtons(); toast('この色の線を全消去');
  }

  /* ============ Undo / Redo ============ */
  function pushUndo(f, ch) { stackOf(S.undo, f).push(ch); S.redo.set(f, []); }
  function applyCh(f, ch, which) {
    const d = fdata(f);
    if (ch.type === 'snap') { d.lines = new Map(); d.fill = new Map(); d.sharedLids = new Set(); const m = which === 'old' ? ch.before : ch.after; for (const [lid, runs] of m) { if (!S.layers.some((l) => l.id === lid)) continue; d.lines.set(lid, bitmapFromRle(runs, S.W * S.H)); } ensureFills(f); return; }
    if (!S.layers.some((l) => l.id === ch.lid)) return; // 削除/統合済みレイヤの stale diff は無視（幽霊レイヤ・マスク破損を防ぐ）
    const arr = writableLines(f, ch.lid); for (let k = 0; k < ch.idx.length; k++) arr[ch.idx[k]] = which === 'old' ? ch.old[k] : ch.neu[k]; d.fill.set(ch.lid, newFill(arr));
  }
  function doUndo() { const f = S.cur, st = S.undo.get(f); if (!st || !st.length) return; const ch = st.pop(); applyCh(f, ch, 'old'); stackOf(S.redo, f).push(ch); S.lastStroke = null; S.maskDirty = true; render(); updateUndoButtons(); notifyFrameChanged(f); }
  function doRedo() { const f = S.cur, st = S.redo.get(f); if (!st || !st.length) return; const ch = st.pop(); applyCh(f, ch, 'new'); stackOf(S.undo, f).push(ch); S.lastStroke = null; S.maskDirty = true; render(); updateUndoButtons(); notifyFrameChanged(f); }
  function updateUndoButtons() { const u = S.undo.get(S.cur), r = S.redo.get(S.cur); dom.undoBtn.disabled = !(u && u.length); dom.redoBtn.disabled = !(r && r.length); }
  function clearFrameAction() {
    const f = S.cur, d = S.frames.get(f); if (!d || !d.lines.size) return;
    const before = new Map(); for (const [lid, arr] of d.lines) before.set(lid, rleFromBitmap(arr));
    d.lines = new Map(); d.fill = new Map(); d.sharedLids = new Set(); d.touched = new Set(); d.inherited = false;
    pushUndo(f, { type: 'snap', before, after: new Map() }); S.maskDirty = true; render(); updateUndoButtons(); notifyFrameChanged(f); toast('このフレームの全色を消去');
  }

  /* ============ レイヤ（色）UI ============ */
  function addLayer() { const id = S.nextLid++; const color = DEFAULT_COLORS[(id - 1) % DEFAULT_COLORS.length].slice(); S.layers.push({ id, name: '', color, visible: true, opacity: 1 }); S.activeLid = id; renderLayers(); S.maskDirty = true; render(); notifyMetaChanged(); }
  function setActive(id) { S.activeLid = id; renderLayers(); render(); }
  function delLayer(id) {
    if (S.layers.length <= 1) { toast('最低1色は必要です'); return; }
    S.layers = S.layers.filter((l) => l.id !== id);
    for (const d of S.frames.values()) { d.lines.delete(id); d.fill.delete(id); if (d.sharedLids) d.sharedLids.delete(id); }
    if (S.activeLid === id) S.activeLid = S.layers[0].id;
    renderLayers(); S.maskDirty = true; render(); notifyMetaChanged();
  }
  function layerName(id) { const L = S.layers.find((l) => l.id === id); if (!L) return '色'; return L.name || ('色' + (S.layers.indexOf(L) + 1)); }
  // 機能1: 色 src を色 dst に統合（全フレームで線をOR→dstへ、srcを削除）。所有 in-memory とIDB(savedFrames)両方。
  function mergeLayers(srcId, dstId) {
    if (srcId === dstId || !S.layers.some((l) => l.id === srcId) || !S.layers.some((l) => l.id === dstId)) { toast('統合先は別の色を選んでください'); return; }
    if (!confirm('「' + layerName(srcId) + '」を「' + layerName(dstId) + '」に統合します。統合元の色は消えます（Ctrl+Zでは戻せません）。よろしいですか？')) return;
    for (const [f, d] of S.frames) {
      const s = d.lines.get(srcId); if (!s) continue;
      const dst = writableLines(f, dstId); for (let i = 0; i < s.length; i++) if (s[i]) dst[i] = 1;
      d.fill.set(dstId, newFill(dst)); d.lines.delete(srcId); d.fill.delete(srcId); if (d.sharedLids) d.sharedLids.delete(srcId);
      notifyFrameChanged(f);
    }
    if (S.onMergeSaved) S.onMergeSaved(srcId, dstId); // 未訪問の保存フレーム(RLE)＋IDBも統合
    S.layers = S.layers.filter((l) => l.id !== srcId);
    if (S.activeLid === srcId) S.activeLid = dstId;
    // 統合は非可逆。統合前の per-frame Undo/Redo は「統合後の現実」と食い違う（stale diff が統合済み画素を消す/
    // 幽霊レイヤを復活させる）ので、履歴を破棄する（loadVideo と同じ扱い）。
    S.undo.clear(); S.redo.clear(); S.lastStroke = null;
    renderLayers(); notifyMetaChanged(); ensureFills(S.cur); S.maskDirty = true; render(); updateUndoButtons();
    toast('色を統合しました');
  }
  // 機能2: 現在フレームの「選択色」のマスクを次フレーム('next')/このシーンの残り('scene')へ上書きコピー。
  // 選択色のみを差し替える（他の色＝他対象のマスクは温存）。各フレームは per-layer diff で Undo 可。
  function copyFrameForward(mode) {
    const lid = S.activeLid, srcD = S.frames.get(S.cur), srcArr = srcD && srcD.lines.get(lid);
    if (!srcArr) { toast('この色にこのフレームの線がありません'); return; }
    const snap = Uint8Array.from(srcArr);
    let targets = [];
    if (mode === 'next') { if (S.cur + 1 < S.total) targets = [S.cur + 1]; }
    else { const sc = sceneIndexOf(S.cur); let f = S.cur + 1; while (f < S.total && sceneIndexOf(f) === sc) { targets.push(f); f++; } }
    if (!targets.length) { toast('コピー先のフレームがありません'); return; }
    if (targets.length > 60 && !confirm(targets.length + 'フレームに上書きコピーします。よろしいですか？')) return;
    let n = 0;
    for (const f of targets) {
      if (S.onFrameEnter) S.onFrameEnter(f);
      const arr = writableLines(f, lid), changed = new Map();
      for (let i = 0; i < arr.length; i++) { const nv = snap[i] ? 1 : 0; if ((arr[i] ? 1 : 0) !== nv) { changed.set(i, arr[i]); arr[i] = nv; } }
      if (changed.size) { fdata(f).fill.set(lid, newFill(arr)); commitChanges(f, lid, changed); n++; } // commitChanges が notifyFrameChanged
    }
    S.maskDirty = true; updateUndoButtons();
    if (mode === 'next') requestFrame(S.cur + 1); else render();
    toast(n ? (n + 'フレームへコピーしました') : '差分なし（同じでした）');
  }
  function renderLayers() {
    dom.layerList.innerHTML = '';
    S.layers.forEach((L, pos) => {
      const row = document.createElement('div'); row.className = 'layer' + (L.id === S.activeLid ? ' active' : '');
      row.addEventListener('click', (e) => { if (e.target.closest('input,button')) return; setActive(L.id); });
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = `rgb(${L.color[0]},${L.color[1]},${L.color[2]})`; sw.title = '選択'; sw.addEventListener('click', () => setActive(L.id));
      const nm = document.createElement('input'); nm.className = 'nm'; nm.type = 'text'; nm.value = L.name; nm.placeholder = `色${pos + 1}`; nm.title = '名前（クリックで編集）';
      nm.addEventListener('input', () => { L.name = nm.value; notifyMetaChanged(); }); nm.addEventListener('focus', () => setActive(L.id));
      const vis = document.createElement('input'); vis.type = 'checkbox'; vis.className = 'vis'; vis.checked = L.visible; vis.title = '表示'; vis.addEventListener('change', () => { L.visible = vis.checked; S.maskDirty = true; render(); notifyMetaChanged(); });
      const op = document.createElement('input'); op.type = 'range'; op.className = 'op'; op.min = 0; op.max = 100; op.value = Math.round(L.opacity * 100); op.title = '濃さ'; op.addEventListener('input', () => { L.opacity = op.value / 100; S.maskDirty = true; render(); notifyMetaChanged(); });
      const mrg = document.createElement('button'); mrg.className = 'mrg'; mrg.textContent = '⤵'; mrg.title = '選択中の色へ統合'; mrg.addEventListener('click', () => mergeLayers(L.id, S.activeLid));
      const del = document.createElement('button'); del.className = 'del'; del.textContent = '✕'; del.title = '削除'; del.addEventListener('click', () => delLayer(L.id));
      row.append(sw, nm, vis, op, mrg, del); dom.layerList.appendChild(row);
    });
  }

  /* ============ 書き出し（PNG） ============ */
  function exportPng() {
    if (S.cur < 0) return; const c = document.createElement('canvas'); c.width = S.W; c.height = S.H; const ctx = c.getContext('2d');
    const img = ctx.createImageData(S.W, S.H), px = img.data, d = S.frames.get(S.cur), N = S.W * S.H;
    if (d) for (const L of S.layers) { if (!L.visible) continue; const fill = d.fill.get(L.id), lines = d.lines.get(L.id); for (let i = 0, p = 0; i < N; i++, p += 4) if ((fill && fill[i]) || (lines && lines[i])) { px[p] = L.color[0]; px[p + 1] = L.color[1]; px[p + 2] = L.color[2]; px[p + 3] = 255; } }
    ctx.putImageData(img, 0, 0); c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `mask_frame${String(S.cur).padStart(5, '0')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
  }

  /* ============ コントロール配線 ============ */
  function setTool(t) { S.tool = t; dom.toolPen.classList.toggle('active', t === 'pen'); dom.toolEraser.classList.toggle('active', t === 'eraser'); S.snapPt = null; if (S.onToolChange) S.onToolChange(t); render(); }
  function eventToPixel(e) { const rect = dom.view.getBoundingClientRect(); const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top); return [clamp(Math.floor(wx), 0, S.W - 1), clamp(Math.floor(wy), 0, S.H - 1), wx, wy]; }
  dom.toolPen.addEventListener('click', () => setTool('pen'));
  dom.toolEraser.addEventListener('click', () => setTool('eraser'));
  dom.snapToggle.addEventListener('change', () => { S.snap = dom.snapToggle.checked; });
  dom.eraserSize.addEventListener('input', () => { S.eraserSize = +dom.eraserSize.value; dom.eraserSizeLabel.textContent = S.eraserSize; });
  dom.objectEraser.addEventListener('change', () => { S.objectEraser = dom.objectEraser.checked; if (S.objectEraser) setTool('eraser'); render(); });
  dom.addLayer.addEventListener('click', addLayer);
  dom.cleanInterior.addEventListener('click', cleanInterior);
  dom.removeStray.addEventListener('click', removeStray);
  dom.clearColor.addEventListener('click', clearColorAction);
  dom.maskHidden.addEventListener('change', () => { S.maskHidden = dom.maskHidden.checked; render(); });
  dom.maskOpacity.addEventListener('input', () => { S.maskOpacity = dom.maskOpacity.value / 100; render(); });
  dom.edgeToggle.addEventListener('change', () => { S.edgeOn = dom.edgeToggle.checked; render(); });
  dom.edgeOpacity.addEventListener('input', () => { S.edgeOpacity = dom.edgeOpacity.value / 100; render(); });
  dom.srcOpacity.addEventListener('input', () => { S.srcOpacity = dom.srcOpacity.value / 100; render(); });
  dom.gridToggle.addEventListener('change', () => { S.showGrid = dom.gridToggle.checked; render(); });
  dom.carryToggle.addEventListener('change', () => { S.carry = dom.carryToggle.checked; });
  if (dom.copyNext) dom.copyNext.addEventListener('click', () => copyFrameForward('next'));
  if (dom.copyScene) dom.copyScene.addEventListener('click', () => copyFrameForward('scene'));
  dom.fpsInput.addEventListener('change', () => {
    const f = parseFloat(dom.fpsInput.value); if (!(f > 0)) return;
    if (anyOwned() && !confirm('描画済みフレームがあります。fpsを変えるとフレーム番号がズレる可能性があります。続けますか？')) { dom.fpsInput.value = (+S.fps.toFixed(3)).toString(); return; }
    S.fps = f; S.total = Math.max(1, Math.round(S.duration * S.fps)); dom.frameSlider.max = S.total - 1; S.bmpCache.clear(); S.edgeCache.clear(); dom.frameLabel.textContent = `${S.cur} / ${S.total - 1}`; notifyMetaChanged();
  });
  dom.undoBtn.addEventListener('click', doUndo);
  dom.redoBtn.addEventListener('click', doRedo);
  dom.clearFrame.addEventListener('click', clearFrameAction);
  dom.exportPng.addEventListener('click', exportPng);
  dom.firstFrame.addEventListener('click', () => requestFrame(0));
  dom.prevFrame.addEventListener('click', () => requestFrame(S.want - 1));
  dom.nextFrame.addEventListener('click', () => requestFrame(S.want + 1));
  dom.lastFrame.addEventListener('click', () => requestFrame(S.total - 1));
  dom.frameSlider.addEventListener('input', () => requestFrame(+dom.frameSlider.value));
  dom.zoomFit.addEventListener('click', fitView);
  dom.zoom100.addEventListener('click', zoom100);
  window.addEventListener('resize', () => { if (S.W) { resizeCanvas(); render(); } });

  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
    if (e.code === 'Space') { S.space = true; dom.view.classList.add('pan'); e.preventDefault(); return; }
    if (!S.frameBmp) return;
    switch (e.key.toLowerCase()) {
      case 'b': setTool('pen'); break;
      case 'e': setTool('eraser'); break;
      case 's': S.snap = !S.snap; dom.snapToggle.checked = S.snap; toast('スナップ ' + (S.snap ? 'オン' : 'オフ')); break;
      case 'g': S.showGrid = !S.showGrid; dom.gridToggle.checked = S.showGrid; render(); break;
      case 'd': S.edgeOn = !S.edgeOn; dom.edgeToggle.checked = S.edgeOn; render(); break;
      case 'f': fitView(); break;
      case '1': zoom100(); break;
      case 'arrowleft': if (e.shiftKey && S.onSceneJump) S.onSceneJump(-1); else requestFrame(S.want - 1); e.preventDefault(); break;
      case 'arrowright': if (e.shiftKey && S.onSceneJump) S.onSceneJump(1); else requestFrame(S.want + 1); e.preventDefault(); break;
      case 'home': requestFrame(0); break;
      case 'end': requestFrame(S.total - 1); break;
      default: return;
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') { S.space = false; dom.view.classList.remove('pan'); } });

  /* ============ 内部API公開（P1-0）。テスト・後続フェーズ用。挙動は変えない。 ============ */
  // 後続フェーズが必要とする既存の内部関数・状態を window.CL に載せる（P1-1以降が随時追記）。
  window.CL = {
    S, dom,
    requestFrame, scheduleRender, render, toast,
    fdata, layerLines, writableLines, newFill, ensureFills, owned, anyOwned, sceneIndexOf, retainFillsFor,
    activeLayer, setActive, addLayer, setTool, renderLayers, eventToPixel, mergeLayers, copyFrameForward,
    commitChanges, pushUndo, updateUndoButtons,
    rebuildMask, exportPng,
  };
})();
