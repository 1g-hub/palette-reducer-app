"use strict";
/*
 * icm.js — ported from Structure Lab into the main app.
 *
 * Two capabilities, as pure/deterministic functions (no Math.random, no DOM):
 *   1. HSV-histogram shot detection helpers (hsvHist + histIntersectionDistance).
 *   2. RGB label-field (ICM/Potts) recolor with detail protection (reduceFrameICM) — the in-place
 *      drop-in for the app's nearest-color processPixels when the 「高品質(ICM)」toggle is ON.
 *
 * Namespaced on `self.ICM` to avoid colliding with app.js (which already has scaledSize/rgbToHex/esc).
 * A module.exports guard at the bottom lets a Node harness require() it for headless verification.
 *
 * Source of the math: palette-reducer-app-20260623-34/.../structure-lab/structure-lab.js (final, fixed).
 */
(function (global) {
  /* ============================ shot detection (HSV) ============================ */
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d !== 0) {
      if (mx === r) h = 60 * (((g - b) / d) % 6);
      else if (mx === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    const s = mx === 0 ? 0 : d / mx;
    return [h, s, mx];
  }
  // 32(H)×16(S) normalized histogram of an ImageData-like {data}. Brightness-agnostic on purpose
  // (cut detection should fire on hue/sat changes, tolerate exposure ramps).
  function hsvHist(img) {
    const data = img.data, n = data.length / 4;
    const hBins = 32, sBins = 16, hist = new Float32Array(hBins * sBins);
    for (let i = 0; i < data.length; i += 4) {
      const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      const hi = Math.min(hBins - 1, Math.floor(hsv[0] / 360 * hBins));
      const si = Math.min(sBins - 1, Math.floor(hsv[1] * sBins));
      hist[hi * sBins + si] += 1;
    }
    const inv = n > 0 ? 1 / n : 0;
    for (let i = 0; i < hist.length; i++) hist[i] *= inv;
    return hist;
  }
  function histIntersectionDistance(a, b) {
    let inter = 0;
    for (let i = 0; i < a.length; i++) inter += Math.min(a[i], b[i]);
    return 1 - inter;
  }

  /* ============================ geometry ============================ */
  function dist2(a, b) { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; }

  /* ============================ detail mask ============================ */
  function gaussBlur(src, w, h, sigma) {
    const r = Math.max(1, Math.round(sigma * 2));
    const ker = []; let ks = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); ker.push(v); ks += v; }
    for (let i = 0; i < ker.length; i++) ker[i] /= ks;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { let xx = x + i; if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1; s += src[y * w + xx] * ker[i + r]; }
      tmp[y * w + x] = s;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { let yy = y + i; if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1; s += tmp[yy * w + x] * ker[i + r]; }
      out[y * w + x] = s;
    }
    return out;
  }
  function sobelMag(src, w, h) {
    const out = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -src[i - w - 1] - 2 * src[i - 1] - src[i + w - 1] + src[i - w + 1] + 2 * src[i + 1] + src[i + w + 1];
      const gy = -src[i - w - 1] - 2 * src[i - w] - src[i - w + 1] + src[i + w - 1] + 2 * src[i + w] + src[i + w + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
    return out;
  }
  function absDiff(a, b) { const out = new Float32Array(a.length); for (let i = 0; i < a.length; i++) out[i] = Math.abs(a[i] - b[i]); return out; }
  // Color-aware edge strength = max of per-channel Sobel, so iso-luminance chroma boundaries fire too.
  function colorSobelMag(img) {
    const w = img.width, h = img.height, n = w * h, d = img.data;
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) { R[i] = d[p]; G[i] = d[p + 1]; B[i] = d[p + 2]; }
    const gr = sobelMag(R, w, h), gg = sobelMag(G, w, h), gb = sobelMag(B, w, h);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.max(gr[i], gg[i], gb[i]);
    return out;
  }
  function dilate4(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i] || (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])) out[i] = 1;
    }
    return out;
  }
  function erode4(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] = (mask[i] && (x === 0 || mask[i - 1]) && (x === w - 1 || mask[i + 1]) && (y === 0 || mask[i - w]) && (y === h - 1 || mask[i + w])) ? 1 : 0;
    }
    return out;
  }
  function morphClose(mask, w, h) { return erode4(dilate4(mask, w, h), w, h); }
  // Uint8Array (1 = protected detail): dark lines + strong COLOR edges (+ high-freq in "hf" mode).
  function computeDetailMask(img, settings) {
    const w = img.width, h = img.height, n = w * h, d = img.data;
    const gray = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) gray[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    const mask = new Uint8Array(n);
    if (settings.detailMode === "none") return mask;
    const blur = gaussBlur(gray, w, h, 2.0);
    const grad = settings.detailMode === "darkline" ? null : colorSobelMag(img);
    const dog = settings.detailMode === "hf" ? absDiff(gray, gaussBlur(gray, w, h, 1.2)) : null;
    for (let i = 0; i < n; i++) {
      let on = false;
      if (gray[i] < blur[i] - settings.darkLine && gray[i] < 120) on = true;
      if (!on && grad && grad[i] > settings.edgeThresh) on = true;
      if (!on && settings.detailMode === "hf") { const dd = dog ? dog[i] : 0; if (dd > settings.hfThresh) on = true; }
      mask[i] = on ? 1 : 0;
    }
    return morphClose(mask, w, h);
  }

  /* ============================ assignment (RGB) ============================ */
  // Squared distance from every pixel to every rep. reps: array of [r,g,b] integer triples.
  function unaryCostRGB(img, reps) {
    const k = reps.length, n = img.width * img.height, d = img.data;
    const D = new Float32Array(n * k);
    const cache = new Map();
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const key = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
      let row = cache.get(key);
      if (!row) {
        row = new Float32Array(k);
        const r = d[p], g = d[p + 1], b = d[p + 2];
        for (let c = 0; c < k; c++) { const rep = reps[c]; const dr = r - rep[0], dg = g - rep[1], db = b - rep[2]; row[c] = dr * dr + dg * dg + db * db; }
        cache.set(key, row);
      }
      for (let c = 0; c < k; c++) D[i * k + c] = row[c];
    }
    return D;
  }
  function nearestFromUnary(D, n, k) {
    const lab = new Int32Array(n);
    for (let i = 0; i < n; i++) { let bi = 0, bd = Infinity; const o = i * k; for (let c = 0; c < k; c++) { const v = D[o + c]; if (v < bd) { bd = v; bi = c; } } lab[i] = bi; }
    return lab;
  }
  // Edge weight per pixel (flat ~1, edge ~0) from the COLOR gradient.
  function edgeWeights(img, sigma) {
    const grad = colorSobelMag(img);
    const n = grad.length, ew = new Float32Array(n);
    for (let i = 0; i < n; i++) ew[i] = Math.exp(-grad[i] / sigma);
    return ew;
  }
  // ICM (red-black): minimize unary + sum_{bonds} beta*min(ew_i,ew_j)*[label_i != label_j].
  // D and ew may be precomputed and passed in (reduceFrameICM does, to avoid a second unaryCost).
  function icmLabels(img, reps, settings, protectMask, D, ew) {
    const w = img.width, h = img.height, n = w * h, k = reps.length;
    if (!D) D = unaryCostRGB(img, reps);
    if (!ew) ew = edgeWeights(img, settings.edgeSigma);
    const lab = nearestFromUnary(D, n, k);
    const beta = settings.beta;
    for (let it = 0; it < settings.icmIters; it++) {
      let changed = 0;
      for (let parity = 0; parity < 2; parity++) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (((x + y) & 1) !== parity) continue;
            if (protectMask && protectMask[i]) continue;
            const nU = y > 0 ? lab[i - w] : -1, nD = y < h - 1 ? lab[i + w] : -1;
            const nL = x > 0 ? lab[i - 1] : -1, nR = x < w - 1 ? lab[i + 1] : -1;
            const wU = nU >= 0 ? beta * Math.min(ew[i], ew[i - w]) : 0;
            const wD = nD >= 0 ? beta * Math.min(ew[i], ew[i + w]) : 0;
            const wL = nL >= 0 ? beta * Math.min(ew[i], ew[i - 1]) : 0;
            const wR = nR >= 0 ? beta * Math.min(ew[i], ew[i + 1]) : 0;
            let bi = lab[i], bd = Infinity; const o = i * k;
            for (let c = 0; c < k; c++) {
              let sc = D[o + c];
              if (nU >= 0 && nU !== c) sc += wU;
              if (nD >= 0 && nD !== c) sc += wD;
              if (nL >= 0 && nL !== c) sc += wL;
              if (nR >= 0 && nR !== c) sc += wR;
              if (sc < bd) { bd = sc; bi = c; }
            }
            if (bi !== lab[i]) { lab[i] = bi; changed++; }
          }
        }
      }
      if (changed === 0) break;
    }
    return lab;
  }
  // Label-domain 3x3 majority on FLAT (ew>=0.6), non-protected pixels: removes isolated speckle
  // without painting (smooths LABELS, not pixels => no oil-paint texture / phantom colors).
  function labelModeFilter(lab, img, k, protectMask, ew, passes) {
    const w = img.width, h = img.height;
    const flatThresh = 0.6;
    const counts = new Int32Array(k);
    let cur = lab;
    for (let pass = 0; pass < passes; pass++) {
      const out = cur.slice();
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (protectMask && protectMask[i]) continue;
        if (ew[i] < flatThresh) continue;
        counts.fill(0);
        let best = cur[i], bc = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const l = cur[(y + dy) * w + x + dx]; counts[l]++;
          if (counts[l] > bc) { bc = counts[l]; best = l; }
        }
        if (best !== cur[i] && bc >= 5) out[i] = best;
      }
      cur = out;
    }
    return cur;
  }

  /* ============================ in-place recolor (the processPixels drop-in) ============================ */
  // data: RGBA bytes (in place). reps: array of [r,g,b]. threshold: same scale as processPixels.
  // opts (from state.icm): {beta,edgeSigma,icmIters,labelSmooth,detailMode,darkLine,edgeThresh,hfThresh,recompose,flat}.
  // `flat:true` => no detail protection/recompose (pure rep field; used by STEP4 so region flood-fill
  // and color-merge keys never hit a non-palette "hole").
  function reduceFrameICM(data, reps, threshold, w, h, opts) {
    const n = w * h, k = reps.length;
    if (!k || !n) return;
    const img = { width: w, height: h, data };
    const flat = !!opts.flat;
    const detailMode = flat ? "none" : (opts.detailMode || "edgedark");
    const recompose = flat ? "none" : (opts.recompose || "detail");
    const settings = {
      beta: opts.beta, edgeSigma: opts.edgeSigma, icmIters: opts.icmIters, labelSmooth: opts.labelSmooth,
      detailMode, darkLine: opts.darkLine, edgeThresh: opts.edgeThresh, hfThresh: opts.hfThresh,
    };
    const D = unaryCostRGB(img, reps);
    // Nearest squared distance per pixel — drives the magenta/out-of-threshold decision EXACTLY like
    // processPixels, so the magenta set is byte-identical whether ICM is on or off.
    const bestSq = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = i * k; let bd = Infinity; for (let c = 0; c < k; c++) { const v = D[o + c]; if (v < bd) bd = v; } bestSq[i] = bd; }
    const ew = edgeWeights(img, settings.edgeSigma);
    const protect = (detailMode !== "none") ? computeDetailMask(img, settings) : null;
    let lab = icmLabels(img, reps, settings, protect, D, ew);
    if (settings.labelSmooth > 0) lab = labelModeFilter(lab, img, k, protect, ew, settings.labelSmooth);
    const th2 = threshold * threshold;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      data[p + 3] = 255;
      if (bestSq[i] > th2) { data[p] = 255; data[p + 1] = 0; data[p + 2] = 255; continue; } // out of threshold -> magenta
      if (recompose === "detail" && protect && protect[i]) continue; // protected detail keeps original rgb
      const rgb = reps[lab[i]];
      data[p] = rgb[0]; data[p + 1] = rgb[1]; data[p + 2] = rgb[2];
    }
  }

  const ICM = {
    hsvHist, histIntersectionDistance, reduceFrameICM,
    // exposed for tests/harness:
    rgbToHsv, dist2, computeDetailMask, colorSobelMag, edgeWeights,
    unaryCostRGB, nearestFromUnary, icmLabels, labelModeFilter,
  };
  global.ICM = ICM;
  if (typeof module !== "undefined" && module.exports) module.exports = ICM;
})(typeof self !== "undefined" ? self : this);
