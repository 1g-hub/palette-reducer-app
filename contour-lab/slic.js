'use strict';
/* slic.js (P4-4) — SLICスーパーピクセル＋スクリブル＋グラフ割当（v1: 多始点Dijkstra）。
   純関数（rgbToLab / slicSuperpixels / buildAdjacency / assignByDijkstra）は ContourLab に co-attach。
   前景（選択色）と背景を太ブラシで雑に塗る→スーパーピクセル隣接グラフ上で色距離最小の種へ割当→確定でレイヤ化。
   DEFERRED: グラフカット(maxflow)v2、スクリブルの次フレーム伝播(P4-4b)。 */
(function (global) {
  function rgbToLab(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  function rgbaToLab(rgba, W, H) { const N = W * H, lab = new Float32Array(N * 3); for (let i = 0, p = 0; i < N; i++, p += 4) { const c = rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2]); lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2]; } return lab; }

  // SLIC。cell=グリッド間隔、m=空間項の重み。返り値 labMeans は各SPの平均Lab（隣接グラフの色）。
  function slicSuperpixels(rgba, W, H, cell, m, iters) {
    cell = cell || 12; m = m == null ? 10 : m; iters = iters || 5;
    const N = W * H, lab = rgbaToLab(rgba, W, H);
    const cx = [], cy = [], cl = [], ca = [], cb = [];
    const off = Math.floor(cell / 2);
    for (let y = off; y < H; y += cell) for (let x = off; x < W; x += cell) { const i = y * W + x; cx.push(x); cy.push(y); cl.push(lab[i * 3]); ca.push(lab[i * 3 + 1]); cb.push(lab[i * 3 + 2]); }
    const K = cx.length, labels = new Int32Array(N).fill(-1), dists = new Float32Array(N);
    const invS2 = 1 / (cell * cell), m2 = m * m;
    for (let it = 0; it < iters; it++) {
      dists.fill(Infinity);
      for (let c = 0; c < K; c++) {
        const px = cx[c], py = cy[c], x0 = Math.max(0, (px - cell) | 0), x1 = Math.min(W - 1, (px + cell) | 0), y0 = Math.max(0, (py - cell) | 0), y1 = Math.min(H - 1, (py + cell) | 0);
        const L = cl[c], A = ca[c], B = cb[c];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const i = y * W + x, dl = lab[i * 3] - L, da = lab[i * 3 + 1] - A, db = lab[i * 3 + 2] - B;
          const dc = dl * dl + da * da + db * db, dx = x - px, dy = y - py, D = dc + m2 * (dx * dx + dy * dy) * invS2;
          if (D < dists[i]) { dists[i] = D; labels[i] = c; }
        }
      }
      const sL = new Float64Array(K), sA = new Float64Array(K), sB = new Float64Array(K), sX = new Float64Array(K), sY = new Float64Array(K), cnt = new Int32Array(K);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, c = labels[i]; if (c < 0) continue; sL[c] += lab[i * 3]; sA[c] += lab[i * 3 + 1]; sB[c] += lab[i * 3 + 2]; sX[c] += x; sY[c] += y; cnt[c]++; }
      for (let c = 0; c < K; c++) { if (!cnt[c]) continue; const inv = 1 / cnt[c]; cl[c] = sL[c] * inv; ca[c] = sA[c] * inv; cb[c] = sB[c] * inv; cx[c] = sX[c] * inv; cy[c] = sY[c] * inv; }
    }
    for (let i = 0; i < N; i++) if (labels[i] < 0) labels[i] = 0;
    const labMeans = new Float32Array(K * 3); for (let c = 0; c < K; c++) { labMeans[c * 3] = cl[c]; labMeans[c * 3 + 1] = ca[c]; labMeans[c * 3 + 2] = cb[c]; }
    return { labels, count: K, labMeans };
  }

  // スーパーピクセル隣接（4近傍で異ラベルが接する対）
  function buildAdjacency(labels, W, H, K) {
    const adj = new Array(K); for (let i = 0; i < K; i++) adj[i] = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = labels[i];
      if (x + 1 < W) { const b = labels[i + 1]; if (b !== a) { adj[a].add(b); adj[b].add(a); } }
      if (y + 1 < H) { const b = labels[i + W]; if (b !== a) { adj[a].add(b); adj[b].add(a); } }
    }
    return adj.map((s) => Array.from(s));
  }

  // 二分ヒープ（[dist, node]）
  function heapPush(a, x) { a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; const t = a[p]; a[p] = a[i]; a[i] = t; i = p; } }
  function heapPop(a) { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = 2 * i + 2, s = i; if (l < a.length && a[l][0] < a[s][0]) s = l; if (r < a.length && a[r][0] < a[s][0]) s = r; if (s === i) break; const t = a[s]; a[s] = a[i]; a[i] = t; i = s; } } return top; }

  // 多始点Dijkstra。seeds=[{sp,cls}]、辺重み=ΔLab²+ε。各SPは最短の種のクラスに割当。返り値 Int32(K)（未到達=UNSEEN）。
  const UNSEEN = -2147483648;
  function assignByDijkstra(adj, labMeans, seeds) {
    const K = adj.length, dist = new Float64Array(K).fill(Infinity), cls = new Int32Array(K).fill(UNSEEN), heap = [];
    for (const s of seeds) { if (s.sp < 0 || s.sp >= K) continue; if (0 < dist[s.sp]) { dist[s.sp] = 0; cls[s.sp] = s.cls; heapPush(heap, [0, s.sp]); } }
    const w2 = (u, v) => { const dl = labMeans[u * 3] - labMeans[v * 3], da = labMeans[u * 3 + 1] - labMeans[v * 3 + 1], db = labMeans[u * 3 + 2] - labMeans[v * 3 + 2]; return dl * dl + da * da + db * db + 1; };
    while (heap.length) {
      const top = heapPop(heap), d = top[0], u = top[1]; if (d > dist[u]) continue;
      const nb = adj[u]; for (let k = 0; k < nb.length; k++) { const v = nb[k], nd = d + w2(u, v); if (nd < dist[v]) { dist[v] = nd; cls[v] = cls[u]; heapPush(heap, [nd, v]); } }
    }
    return cls;
  }

  const API = { rgbToLab, slicSuperpixels, buildAdjacency, assignByDijkstra, SLIC_UNSEEN: UNSEEN };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  if (!window.CL) return;

  /* ============ スクリブルUI（縮小解像度で処理、確定時にネイティブへ） ============ */
  const CL = window.CL, S = CL.S, CLab = window.ContourLab, $ = (id) => document.getElementById(id);
  const BG = -1;
  let sc = null; // {frame,cell,rw,rh,labels,adj,labMeans,count,scale}
  let seeds = null; // Int32Array(rN): 0=none, -1=bg, >=1=fg lid
  let seedFrame = -1, painting = false, assignCls = null, previewCanvas = null;
  S.scribbleClass = null; // 現在の塗りクラス（activeLid or BG）

  function reduced() { const short = 360, s = short / Math.max(1, Math.min(S.W, S.H)); return { rw: Math.max(1, Math.round(S.W * s)), rh: Math.max(1, Math.round(S.H * s)) }; }
  function ensureSLIC() {
    if (!S.frameBmp) return null;
    const cell = +($('slicCell') ? $('slicCell').value : 12), r = reduced();
    const key = S.cur + ':' + cell + ':' + r.rw;
    if (sc && sc.key === key) return sc;
    const cv = document.createElement('canvas'); cv.width = r.rw; cv.height = r.rh; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingEnabled = true;
    cx.drawImage(S.frameBmp, 0, 0, r.rw, r.rh);
    let rgba = cx.getImageData(0, 0, r.rw, r.rh).data;
    if (S.quantSmooth && CLab.guidedFilterRGB) rgba = CLab.guidedFilterRGB(rgba, r.rw, r.rh, 3, 0.01);
    const sl = slicSuperpixels(rgba, r.rw, r.rh, cell, 12, 5);
    const adj = buildAdjacency(sl.labels, r.rw, r.rh, sl.count);
    sc = { key, cell, rw: r.rw, rh: r.rh, labels: sl.labels, adj, labMeans: sl.labMeans, count: sl.count };
    return sc;
  }
  function resetSeedsIfFrameChanged() { if (seedFrame !== S.cur) { const r = reduced(); seeds = new Int32Array(r.rw * r.rh); seedFrame = S.cur; assignCls = null; previewCanvas = null; } }

  function paintAt(px, py) {
    const s = ensureSLIC(); if (!s) return; resetSeedsIfFrameChanged();
    // 前景は常に「現在のアクティブ色」に追従（BGだけ固定）。setClass のスナップショットのままだと、色を切替えても
    // 旧色へ塗られる（P4レビュー#2）。
    const rx = Math.floor(px * s.rw / S.W), ry = Math.floor(py * s.rh / S.H), rad = 3, cls = S.scribbleClass === BG ? BG : S.activeLid;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dy * dy > rad * rad) continue; const x = rx + dx, y = ry + dy; if (x < 0 || y < 0 || x >= s.rw || y >= s.rh) continue; seeds[y * s.rw + x] = cls; }
  }
  function recompute() {
    const s = ensureSLIC(); if (!s || !seeds) return;
    // 種SP: 各SPに最後に塗られたクラス（面積多数決の簡略＝上書き最終値）
    const spCls = new Int32Array(s.count).fill(0);
    for (let i = 0; i < seeds.length; i++) if (seeds[i]) spCls[s.labels[i]] = seeds[i];
    const seedList = []; for (let c = 0; c < s.count; c++) if (spCls[c]) seedList.push({ sp: c, cls: spCls[c] });
    if (!seedList.length) { assignCls = null; previewCanvas = null; return; }
    assignCls = assignByDijkstra(s.adj, s.labMeans, seedList);
    // プレビュー canvas（縮小）: SPを割当クラス色で淡く塗る
    const cv = document.createElement('canvas'); cv.width = s.rw; cv.height = s.rh; const cx = cv.getContext('2d');
    const img = cx.createImageData(s.rw, s.rh), px = img.data;
    const colOf = (cls) => { if (cls === BG || cls === CLab.SLIC_UNSEEN) return null; const L = S.layers.find((l) => l.id === cls); return L ? L.color : null; };
    for (let i = 0; i < s.labels.length; i++) { const col = colOf(assignCls[s.labels[i]]); const p = i * 4; if (col) { px[p] = col[0]; px[p + 1] = col[1]; px[p + 2] = col[2]; px[p + 3] = 120; } else px[p + 3] = 0; }
    cx.putImageData(img, 0, 0); previewCanvas = cv;
  }

  function commit() {
    // 割当が「今表示中のフレーム」のものでなければ確定しない。別フレームの割当を今のフレームへ 'replace' で
    // 書くと、そのフレームの既存マスクを壊す（P4レビュー#1/#5）。
    if (seedFrame !== S.cur) { assignCls = null; previewCanvas = null; CL.toast('このフレームにスクリブルの割当がありません'); return; }
    const s = ensureSLIC(); if (!s || !assignCls) { CL.toast('先にスクリブルしてください'); return; }
    const lids = new Set(); for (let c = 0; c < s.count; c++) { const cl = assignCls[c]; if (cl > 0) lids.add(cl); }
    if (!lids.size) { CL.toast('前景スクリブルがありません'); return; }
    const W = S.W, H = S.H, N = W * H;
    for (const lid of lids) {
      const mask = new Uint8Array(N);
      for (let y = 0; y < H; y++) { const ry = Math.floor(y * s.rh / H); for (let x = 0; x < W; x++) { const rx = Math.floor(x * s.rw / W); if (assignCls[s.labels[ry * s.rw + rx]] === lid) mask[y * W + x] = 1; } }
      if (window.CLIO) window.CLIO.applyMaskToLayer(S.cur, lid, mask, 'replace');
    }
    assignCls = null; previewCanvas = null; if (seeds) seeds.fill(0);
    S.cur = -1; CL.requestFrame(S.want || 0); CL.toast('スクリブルから' + lids.size + '色を領域化しました');
  }
  function clearScribbles() { if (seeds) seeds.fill(0); assignCls = null; previewCanvas = null; CL.render(); CL.toast('スクリブルを消去'); }

  /* ============ 表示（プレビュー＋種ストローク） ============ */
  const prevAfter = S.onAfterSource;
  S.onAfterSource = function (ctx, v) {
    if (prevAfter) prevAfter(ctx, v);
    if (S.tool !== 'scribble') return;
    if (seedFrame !== S.cur) return; // 別フレームのプレビュー/種を今のフレームへ重ねない（P4レビュー#1）
    if (previewCanvas) { ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.55; ctx.drawImage(previewCanvas, 0, 0, S.W, S.H); ctx.globalAlpha = 1; }
    // 種ストロークを点で表示
    if (seeds && seedFrame === S.cur && sc) {
      const img = ctx; img.save();
      for (let i = 0; i < seeds.length; i++) { const c = seeds[i]; if (!c) continue; const rx = i % sc.rw, ry = (i / sc.rw) | 0; const x = rx * S.W / sc.rw, y = ry * S.H / sc.rh; const col = c === BG ? [30, 30, 30] : (S.layers.find((l) => l.id === c) || { color: [255, 255, 255] }).color; img.fillStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')'; img.fillRect(x, y, S.W / sc.rw, S.H / sc.rh); }
      img.restore();
    }
  };

  /* ============ 入力 ============ */
  const view = CL.dom.view;
  const prevOnToolDown = S.onToolDown;
  S.onToolDown = function (e, px, py, wx, wy) { if (S.tool === 'scribble') { painting = true; view.setPointerCapture && view.setPointerCapture(e.pointerId); paintAt(px, py); CL.render(); return; } if (prevOnToolDown) prevOnToolDown(e, px, py, wx, wy); };
  view.addEventListener('pointermove', (e) => { if (!painting || S.tool !== 'scribble') return; const [px, py] = CL.eventToPixel(e); paintAt(px, py); CL.render(); });
  window.addEventListener('pointerup', () => { if (painting) { painting = false; recompute(); CL.render(); } });

  const prevOnToolChange = S.onToolChange;
  S.onToolChange = function (t) { const b = $('toolScribble'); if (b) b.classList.toggle('active', t === 'scribble'); if (prevOnToolChange) prevOnToolChange(t); };

  /* ============ 配線 ============ */
  function setClass(cls) { S.scribbleClass = cls; CL.setTool('scribble'); const fg = $('scribFg'), bg = $('scribBg'); if (fg) fg.classList.toggle('active', cls !== BG); if (bg) bg.classList.toggle('active', cls === BG); }
  if ($('toolScribble')) $('toolScribble').addEventListener('click', () => setClass(S.activeLid));
  if ($('scribFg')) $('scribFg').addEventListener('click', () => setClass(S.activeLid));
  if ($('scribBg')) $('scribBg').addEventListener('click', () => setClass(BG));
  if ($('slicConfirm')) $('slicConfirm').addEventListener('click', commit);
  if ($('slicClear')) $('slicClear').addEventListener('click', clearScribbles);
  if ($('slicCell')) $('slicCell').addEventListener('input', () => { sc = null; assignCls = null; previewCanvas = null; if (seeds) seeds.fill(0); const l = $('slicCellLabel'); if (l) l.textContent = $('slicCell').value; });

  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'x') { setClass(S.activeLid); CL.toast('スクリブル（前景）'); }
  });

  // 動画読込時にモジュール状態を全リセット（別動画へ同じフレーム番号で残った種/割当/SPが混入するのを防ぐ, P4レビュー#4）。
  const prevOVL = S.onVideoLoaded;
  S.onVideoLoaded = function (file) { sc = null; seeds = null; seedFrame = -1; painting = false; assignCls = null; previewCanvas = null; S.scribbleClass = null; return prevOVL ? prevOVL(file) : undefined; };

  window.CLSlic = { ensureSLIC, recompute, commit, clearScribbles, paintAt, _seeds: () => seeds, _assign: () => assignCls, _seedFrame: () => seedFrame };
})(typeof self !== 'undefined' ? self : this);
