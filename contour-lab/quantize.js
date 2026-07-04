'use strict';
/* quantize.js (P4-1/2/3) — ガイデッドフィルタ（AAつぶし）・k-means量子化ビュー・ワンド。
   純関数（guidedFilterRGB / quantizeLabels / boxMean）は ContourLab に co-attach（node テスト可）。
   ビューは現在フレームをポスタライズ表示し、ワンドは同ラベル領域を CLIO.applyMaskToLayer で取込む。 */
(function (global) {
  // ---- 積分画像ベースのボックス平均（O(N)、窓は端でクランプ） ----
  function boxMean(src, W, H, r) {
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += src[y * W + x]; I[(y + 1) * (W + 1) + (x + 1)] = I[y * (W + 1) + (x + 1)] + row; } }
    const out = new Float64Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W - 1, x + r), y1 = Math.min(H - 1, y + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s = I[(y1 + 1) * (W + 1) + (x1 + 1)] - I[y0 * (W + 1) + (x1 + 1)] - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];
      out[y * W + x] = s / area;
    }
    return out;
  }
  // ガイデッドフィルタ（guide=self、チャンネル独立）。eps は [0,1] スケール。エッジ保存平滑化。
  function guidedFilterRGB(rgba, W, H, r, eps) {
    r = r == null ? 4 : r; eps = eps == null ? 0.01 : eps;
    const N = W * H, out = new Uint8ClampedArray(N * 4);
    for (let c = 0; c < 3; c++) {
      const I = new Float64Array(N); for (let i = 0; i < N; i++) I[i] = rgba[i * 4 + c] / 255;
      const II = new Float64Array(N); for (let i = 0; i < N; i++) II[i] = I[i] * I[i];
      const mI = boxMean(I, W, H, r), cI = boxMean(II, W, H, r);
      const a = new Float64Array(N), b = new Float64Array(N);
      for (let i = 0; i < N; i++) { const varI = cI[i] - mI[i] * mI[i]; const ai = varI / (varI + eps); a[i] = ai; b[i] = (1 - ai) * mI[i]; }
      const ma = boxMean(a, W, H, r), mb = boxMean(b, W, H, r);
      for (let i = 0; i < N; i++) out[i * 4 + c] = (ma[i] * I[i] + mb[i]) * 255;
    }
    for (let i = 0; i < N; i++) out[i * 4 + 3] = 255;
    return out;
  }

  const dist2 = (r, g, b, c) => { const dr = r - c[0], dg = g - c[1], db = b - c[2]; return dr * dr + dg * dg + db * db; };
  function nearestCenter(r, g, b, centers) { let bi = 0, bd = Infinity; for (let i = 0; i < centers.length; i++) { const d = dist2(r, g, b, centers[i]); if (d < bd) { bd = d; bi = i; } } return bi; }

  // 5bit バケツ集計 → 色候補＋重み
  function bucketCandidates(rgba, bits) {
    const shift = 8 - bits, m = new Map();
    for (let p = 0; p < rgba.length; p += 4) {
      const key = ((rgba[p] >> shift) << (bits * 2)) | ((rgba[p + 1] >> shift) << bits) | (rgba[p + 2] >> shift);
      let row = m.get(key); if (!row) { row = [0, 0, 0, 0]; m.set(key, row); }
      row[0]++; row[1] += rgba[p]; row[2] += rgba[p + 1]; row[3] += rgba[p + 2];
    }
    const colors = [], weights = [];
    for (const row of m.values()) { const inv = 1 / row[0]; colors.push([row[1] * inv, row[2] * inv, row[3] * inv]); weights.push(row[0]); }
    return { colors, weights };
  }
  // k-means++ 風シード（worker.js の initCenterSequence を移植）
  function initCenters(colors, weights, K) {
    let first = 0; for (let i = 1; i < colors.length; i++) if (weights[i] > weights[first]) first = i;
    const centers = [colors[first].slice()];
    while (centers.length < K) {
      let bi = 0, bs = -1;
      for (let i = 0; i < colors.length; i++) { let ns = Infinity; for (const c of centers) { const d = dist2(colors[i][0], colors[i][1], colors[i][2], c); if (d < ns) ns = d; } const s = ns * Math.sqrt(Math.max(1, weights[i])); if (s > bs) { bs = s; bi = i; } }
      centers.push(colors[bi].slice());
    }
    return centers;
  }
  function weightedKMeans(colors, weights, seeds, K, iters) {
    const n = colors.length, centers = seeds.slice(0, K).map((c) => c.slice()), labels = new Int32Array(n).fill(-1);
    for (let it = 0; it < iters; it++) {
      const sW = new Float64Array(K), sR = new Float64Array(K), sG = new Float64Array(K), sB = new Float64Array(K); let changed = false;
      for (let i = 0; i < n; i++) { const l = nearestCenter(colors[i][0], colors[i][1], colors[i][2], centers); if (labels[i] !== l) { labels[i] = l; changed = true; } const w = weights[i]; sW[l] += w; sR[l] += colors[i][0] * w; sG[l] += colors[i][1] * w; sB[l] += colors[i][2] * w; }
      for (let c = 0; c < K; c++) { if (sW[c] <= 0) continue; const inv = 1 / sW[c]; centers[c] = [sR[c] * inv, sG[c] * inv, sB[c] * inv]; }
      if (!changed && it > 0) break;
    }
    return centers;
  }
  // rgba(小さめ画像) → {centers:[[r,g,b]...]}（K色）。labels は呼び出し側でネイティブ解像度に対して算出。
  function quantizeCenters(rgba, W, H, K, iters) {
    const { colors, weights } = bucketCandidates(rgba, 5);
    let centers;
    if (colors.length <= K) centers = colors.map((c) => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]);
    else { const seeds = initCenters(colors, weights, K); centers = weightedKMeans(colors, weights, seeds, K, iters || 10).map((c) => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]); }
    return centers;
  }
  // テスト用: rgba を K 色に量子化して {centers, labels(Int32 N)} を返す（同一解像度で）。
  function quantizeLabels(rgba, W, H, K, iters) {
    const centers = quantizeCenters(rgba, W, H, K, iters), N = W * H, labels = new Int32Array(N);
    for (let i = 0, p = 0; i < N; i++, p += 4) labels[i] = nearestCenter(rgba[p], rgba[p + 1], rgba[p + 2], centers);
    return { centers, labels };
  }

  const API = { boxMean, guidedFilterRGB, quantizeLabels, quantizeCenters, bucketCandidates };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  if (!window.CL) return;

  /* ============ ビュー（現在フレームをポスタライズ表示） ============ */
  const CL = window.CL, S = CL.S, $ = (id) => document.getElementById(id);
  S.quantOn = false; S.quantK = 12; S.quantSmooth = false;
  let cache = null;

  function reducedSize() { const short = 270, s = short / Math.max(1, Math.min(S.W, S.H)); return { w: Math.max(1, Math.round(S.W * s)), h: Math.max(1, Math.round(S.H * s)) }; }
  function ensureQuant() {
    if (!S.frameBmp || !S.frameImgData) return null;
    const key = S.cur + ':' + S.quantK + ':' + (S.quantSmooth ? 1 : 0);
    if (cache && cache.key === key) return cache;
    const W = S.W, H = S.H, rs = reducedSize();
    const sc = document.createElement('canvas'); sc.width = rs.w; sc.height = rs.h;
    const sctx = sc.getContext('2d', { willReadFrequently: true }); sctx.imageSmoothingEnabled = true;
    sctx.drawImage(S.frameBmp, 0, 0, rs.w, rs.h);
    let small = sctx.getImageData(0, 0, rs.w, rs.h).data;
    if (S.quantSmooth) small = guidedFilterRGB(small, rs.w, rs.h, 4, 0.01);
    const centers = quantizeCenters(small, rs.w, rs.h, S.quantK, 10);
    // ネイティブ解像度で最近傍ラベル＋ポスタライズ canvas
    const src = S.frameImgData.data, N = W * H, labels = new Int32Array(N);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const cx = c.getContext('2d');
    const img = cx.createImageData(W, H), px = img.data;
    for (let i = 0, p = 0; i < N; i++, p += 4) { const l = nearestCenter(src[p], src[p + 1], src[p + 2], centers); labels[i] = l; const cc = centers[l]; px[p] = cc[0]; px[p + 1] = cc[1]; px[p + 2] = cc[2]; px[p + 3] = 255; }
    cx.putImageData(img, 0, 0);
    cache = { key, centers, labels, canvas: c };
    return cache;
  }
  S.onAfterSource = function (ctx) { if (!S.quantOn) return; const q = ensureQuant(); if (q) { ctx.imageSmoothingEnabled = false; ctx.drawImage(q.canvas, 0, 0); } };

  /* ============ ワンド（同ラベル4連結 flood → レイヤ取込） ============ */
  function wandAt(px, py) {
    const q = ensureQuant(); if (!q) { CL.toast('量子化が使えません'); return; }
    const W = S.W, H = S.H, labels = q.labels, target = labels[py * W + px], mask = new Uint8Array(W * H);
    const seen = new Uint8Array(W * H), stk = new Int32Array(W * H); let sp = 0; const s0 = py * W + px; stk[sp++] = s0; seen[s0] = 1;
    while (sp) { const p = stk[--sp]; if (labels[p] !== target) continue; mask[p] = 1; const x = p % W, y = (p / W) | 0;
      if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; stk[sp++] = p - 1; }
      if (x < W - 1 && !seen[p + 1]) { seen[p + 1] = 1; stk[sp++] = p + 1; }
      if (y > 0 && !seen[p - W]) { seen[p - W] = 1; stk[sp++] = p - W; }
      if (y < H - 1 && !seen[p + W]) { seen[p + W] = 1; stk[sp++] = p + W; } }
    if (!window.CLIO) { CL.toast('取込モジュール未ロード'); return; }
    const n = window.CLIO.applyMaskToLayer(S.cur, S.activeLid, mask, 'or');
    S.cur = -1; CL.requestFrame(S.want || 0); CL.toast('領域を追加（' + n + 'px）');
  }

  /* ============ 配線 ============ */
  const prevOnToolDown = S.onToolDown;
  S.onToolDown = function (e, px, py, wx, wy) { if (S.tool === 'wand') { wandAt(px, py); return; } if (prevOnToolDown) prevOnToolDown(e, px, py, wx, wy); };

  function setQuant(on) { S.quantOn = on; const el = $('quantToggle'); if (el) el.checked = on; cache = on ? cache : cache; CL.render(); }
  if ($('quantToggle')) $('quantToggle').addEventListener('change', () => { S.quantOn = $('quantToggle').checked; CL.render(); });
  if ($('quantK')) $('quantK').addEventListener('input', () => { S.quantK = +$('quantK').value; const lbl = $('quantKLabel'); if (lbl) lbl.textContent = S.quantK; cache = null; if (S.quantOn) CL.render(); });
  if ($('quantSmooth')) $('quantSmooth').addEventListener('change', () => { S.quantSmooth = $('quantSmooth').checked; cache = null; if (S.quantOn) CL.render(); });
  if ($('toolWand')) $('toolWand').addEventListener('click', () => CL.setTool('wand'));

  const prevOnToolChange = S.onToolChange;
  S.onToolChange = function (t) { const b = $('toolWand'); if (b) b.classList.toggle('active', t === 'wand'); if (prevOnToolChange) prevOnToolChange(t); };

  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'q') { S.quantOn = !S.quantOn; const el = $('quantToggle'); if (el) el.checked = S.quantOn; CL.render(); CL.toast('量子化ビュー ' + (S.quantOn ? 'オン' : 'オフ')); }
    else if (k === 'a') { CL.setTool('wand'); CL.toast('ワンド'); }
  });

  window.CLQuant = { ensureQuant, wandAt, setQuant, invalidate: () => { cache = null; } };
})(typeof self !== 'undefined' ? self : this);
