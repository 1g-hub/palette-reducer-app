'use strict';
/* snap.js (P3-0/1/2) — 確定エッジスナップ。雑に描く→W→そのストロークを近くの色エッジへ吸着（レビュー可・Undo可）。
   純関数（costFromMag / dijkstraPath / buildCorridor / snapEndpoint）は ContourLab に co-attach（node テスト可）。
   コスト場＝色勾配（ICM.colorSobelMag）。回廊内で始点→終点の最小コスト経路（Dijkstra）を新しい線にする。 */
(function (global) {
  // 勾配強度 → コスト（勾配が高い＝エッジ＝低コスト）。cost = 1 + K*(1 - mag/magMax)。
  function costFromMag(mag, N, K, magMax) {
    K = K == null ? 8 : K; const inv = magMax > 0 ? 1 / magMax : 0, cost = new Float32Array(N);
    for (let i = 0; i < N; i++) { let r = mag[i] * inv; if (r > 1) r = 1; cost[i] = 1 + K * (1 - r); }
    return cost;
  }
  // 二分ヒープ [dist,node]
  function hpush(a, x) { a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; const t = a[p]; a[p] = a[i]; a[i] = t; i = p; } }
  function hpop(a) { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = 2 * i + 2, s = i; if (l < a.length && a[l][0] < a[s][0]) s = l; if (r < a.length && a[r][0] < a[s][0]) s = r; if (s === i) break; const t = a[s]; a[s] = a[i]; a[i] = t; i = s; } } return top; }
  // 回廊(allowed)内で (sx,sy)->(tx,ty) の最小コスト経路。8近傍、斜めは√2倍。返り値 [[x,y]...] or null。
  function dijkstraPath(cost, W, H, allowed, sx, sy, tx, ty) {
    const N = W * H, s = sy * W + sx, t = ty * W + tx;
    if (s < 0 || t < 0 || s >= N || t >= N || !allowed[s] || !allowed[t]) return null;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), SQ = Math.SQRT2, heap = [];
    dist[s] = 0; hpush(heap, [0, s]);
    while (heap.length) {
      const top = hpop(heap), d = top[0], u = top[1]; if (d > dist[u]) continue; if (u === t) break;
      const ux = u % W, uy = (u / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const x = ux + dx, y = uy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const v = y * W + x; if (!allowed[v]) continue;
        const nd = d + cost[v] * ((dx && dy) ? SQ : 1);
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; hpush(heap, [nd, v]); }
      }
    }
    if (dist[t] === Infinity) return null;
    const path = []; let c = t; while (c !== -1) { path.push([c % W, (c / W) | 0]); c = prev[c]; }
    path.reverse(); return path;
  }
  // 点列(polyline)を半径Rで膨張した回廊マスク。bbox も返す。
  function buildCorridor(pts, W, H, R) {
    const allowed = new Uint8Array(W * H); let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const stamp = (cx, cy) => { for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > R * R) continue; const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; allowed[y * W + x] = 1; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } };
    for (let k = 0; k < pts.length; k++) {
      stamp(pts[k][0], pts[k][1]);
      if (k > 0) { let ax = pts[k - 1][0], ay = pts[k - 1][1]; const bx = pts[k][0], by = pts[k][1]; let dx = Math.abs(bx - ax), dy = Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, err = dx - dy; for (;;) { stamp(ax, ay); if (ax === bx && ay === by) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; ax += sx; } if (e2 < dx) { err += dx; ay += sy; } } }
    }
    return { allowed, x0, y0, x1, y1 };
  }
  // (x,y) の半径 r 内で allowed かつ mag 最大の画素へ（端点固定用）。
  function snapEndpoint(mag, W, H, allowed, x, y, r) {
    let bx = x, by = y, best = -1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = yy * W + xx; if (!allowed[i]) continue; if (mag[i] > best) { best = mag[i]; bx = xx; by = yy; } }
    return [bx, by];
  }

  // 線を「チェーン」に分解（P3-3）。8連結の連結成分ごとに1本として辿る（角で分断しない）。
  // 端点(次数1)があれば open、無ければ closed(ループ)。直交近傍優先で角の対角ショートカットを避ける。
  function traceChains(lines, W, H) {
    const N = W * H, seen = new Uint8Array(N), open = [], closed = [], tmp = [];
    const nbrs = (p, out) => { out.length = 0; const x = p % W, y = (p / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (lines[q]) out.push(q); } return out; };
    const deg = new Int8Array(N); for (let p = 0; p < N; p++) if (lines[p]) deg[p] = nbrs(p, tmp).length;
    function walk(start) {
      const comp = [], set = new Set([start]), stk = [start];
      while (stk.length) { const p = stk.pop(); comp.push(p); const nn = []; nbrs(p, nn); for (const q of nn) if (!set.has(q)) { set.add(q); stk.push(q); } }
      let s = -1; for (const p of comp) if (deg[p] === 1) { s = p; break; }
      const isClosed = s === -1; if (isClosed) s = comp[0];
      const order = [], vis = new Set(); let cur = s;
      while (cur >= 0 && !vis.has(cur)) { order.push(cur); vis.add(cur); const nn = []; nbrs(cur, nn); let nx = -1, ortho = -1; const cx = cur % W, cy = (cur / W) | 0; for (const q of nn) { if (vis.has(q)) continue; const qx = q % W, qy = (q / W) | 0; if ((qx === cx || qy === cy) && ortho < 0) ortho = q; if (nx < 0) nx = q; } cur = ortho >= 0 ? ortho : nx; }
      for (const p of comp) seen[p] = 1;
      const pts = order.map((i) => [i % W, (i / W) | 0]);
      (isClosed ? closed : open).push(pts);
    }
    for (let p = 0; p < N; p++) if (lines[p] && !seen[p]) walk(p);
    return { open, closed };
  }
  // 閉ループの各点を法線方向±r で勾配最大へ移動＋ラプラシアン平滑（アクティブ輪郭ライト）。
  function snapClosed(pts, mag, W, H, r) {
    const n = pts.length; if (n < 3) return pts.slice();
    const moved = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L; const nx = -ty, ny = tx;
      let best = -1, bp = p; for (let d = -r; d <= r; d++) { const x = Math.round(p[0] + nx * d), y = Math.round(p[1] + ny * d); if (x < 0 || y < 0 || x >= W || y >= H) continue; const m = mag[y * W + x]; if (m > best) { best = m; bp = [x, y]; } } return bp;
    });
    let cur = moved;
    for (let it = 0; it < 2; it++) cur = cur.map((p, i) => { const a = cur[(i - 1 + n) % n], b = cur[(i + 1) % n]; return [Math.round(p[0] * 0.5 + (a[0] + b[0]) * 0.25), Math.round(p[1] * 0.5 + (a[1] + b[1]) * 0.25)]; });
    return cur;
  }

  const API = { costFromMag, dijkstraPath, buildCorridor, snapEndpoint, traceChains, snapClosed };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  if (!window.CL) return;

  /* ============ ハンドラ ============ */
  const CL = window.CL, S = CL.S, CLab = window.ContourLab, $ = (id) => document.getElementById(id);
  let magCache = null; // {src, mag, magMax}
  function getMag() {
    if (!S.frameImgData) return null;
    // captureFrame は訪問毎に新しい frameImgData を作る。オブジェクト同一性で判定すれば、
    // fps変更/別動画/同フレーム番号の別画像でも自動で作り直す（P3レビュー: フレーム番号キーは陳腐化）。
    if (magCache && magCache.src === S.frameImgData) return magCache;
    const mag = window.ICM.colorSobelMag({ width: S.W, height: S.H, data: S.frameImgData.data });
    let mx = 0; for (let i = 0; i < mag.length; i++) if (mag[i] > mx) mx = mag[i];
    magCache = { src: S.frameImgData, mag, magMax: mx }; return magCache;
  }

  function snapLastStroke() {
    const ls = S.lastStroke;
    if (!ls || ls.frame !== S.cur) { CL.toast('直前に描いた線がありません（このフレームで描いてください）'); return; }
    if (ls.closed) { CL.toast('閉じた線は対象外です'); return; }
    if (!ls.pts || ls.pts.length < 2) { CL.toast('点が少なく吸着できません'); return; }
    // 自己検証: レイヤ削除・消しゴム・全消去・領域整形・fps変更など「スナップ以外の経路」でストロークが
    // 消えていたら、幻の線を復活させない（P3レビュー: 各操作で lastStroke を消すより堅牢）。
    const cd = S.frames.get(S.cur), arr0 = cd && cd.lines.get(ls.lid);
    if (!S.layers.some((l) => l.id === ls.lid) || !arr0 || !ls.added.length || !ls.added.some((i) => arr0[i])) {
      CL.toast('直前に描いた線が見つかりません'); S.lastStroke = null; return;
    }
    const mg = getMag(); if (!mg) { CL.toast('エッジ場が使えません'); return; }
    const W = S.W, H = S.H, R = +($('snapRadius') ? $('snapRadius').value : 6);
    const cor = buildCorridor(ls.pts, W, H, R);
    // 回廊内の勾配最大でコスト場を正規化（コントラストを出す）
    let cmax = 1; for (let y = cor.y0; y <= cor.y1; y++) for (let x = cor.x0; x <= cor.x1; x++) { const i = y * W + x; if (cor.allowed[i] && mg.mag[i] > cmax) cmax = mg.mag[i]; }
    const cost = costFromMag(mg.mag, W * H, 8, cmax);
    const a = ls.pts[0], b = ls.pts[ls.pts.length - 1];
    const sPt = snapEndpoint(mg.mag, W, H, cor.allowed, a[0], a[1], 3), tPt = snapEndpoint(mg.mag, W, H, cor.allowed, b[0], b[1], 3);
    const path = dijkstraPath(cost, W, H, cor.allowed, sPt[0], sPt[1], tPt[0], tPt[1]);
    if (!path || path.length < 2) { CL.toast('経路が見つかりません（半径を上げてみてください）'); return; }
    // 経路を8近傍でラスタ化
    const pathSet = new Set();
    for (let k = 0; k < path.length; k++) { const p = path[k]; let ax = k > 0 ? path[k - 1][0] : p[0], ay = k > 0 ? path[k - 1][1] : p[1]; const bx = p[0], by = p[1]; let dx = Math.abs(bx - ax), dy = Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, err = dx - dy; for (;;) { pathSet.add(ay * W + ax); if (ax === bx && ay === by) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; ax += sx; } if (e2 < dx) { err += dx; ay += sy; } } }
    // 差分適用: ラフ線(ls.added)を消し、経路を立てる。1つの Undo エントリ＝Wを1回戻すとラフ線に戻る。
    const arr = CL.writableLines(S.cur, ls.lid), changed = new Map();
    for (const i of ls.added) if (arr[i] && !pathSet.has(i)) { if (!changed.has(i)) changed.set(i, arr[i]); arr[i] = 0; }
    for (const i of pathSet) if (arr[i] !== 1) { if (!changed.has(i)) changed.set(i, arr[i]); arr[i] = 1; }
    if (!changed.size) { CL.toast('変化なし（既にエッジ上でした）'); return; }
    const d = CL.fdata(S.cur); d.fill.set(ls.lid, CL.newFill(arr)); CL.commitChanges(S.cur, ls.lid, changed);
    S.lastStroke = null; S.maskDirty = true; CL.render(); CL.updateUndoButtons();
    CL.toast('エッジに吸着しました（' + path.length + '点）');
  }

  /* ============ 全線再吸着（R, β / P3-3）＝carry後のズレ一括修正＝疑似トラッキング ============ */
  function popFill(lines) { const f = CLab.computeFill(lines, S.W, S.H); let c = 0; for (let i = 0; i < f.length; i++) if (f[i]) c++; return c; }
  function resnapAll() {
    const lid = S.activeLid, cd = S.frames.get(S.cur), lines = cd && cd.lines.get(lid);
    if (!lines) { CL.toast('この色に線がありません'); return; }
    const mg = getMag(); if (!mg) { CL.toast('エッジ場が使えません'); return; }
    const W = S.W, H = S.H, N = W * H, R = +($('snapRadius') ? $('snapRadius').value : 6);
    const { open, closed } = traceChains(lines, W, H);
    if (!open.length && !closed.length) { CL.toast('線がありません'); return; }
    const newLines = Uint8Array.from(lines);
    const erase = (pts) => { for (let k = 0; k < pts.length; k++) newLines[pts[k][1] * W + pts[k][0]] = 0; };
    const drawSeq = (pts, loop) => { for (let k = 1; k < pts.length; k++) CLab.bresenham(newLines, W, H, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], 1, null); if (loop && pts.length > 1) CLab.bresenham(newLines, W, H, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], 1, null); };
    for (const ch of open) {
      if (ch.length < 3) continue;
      const cor = buildCorridor(ch, W, H, R);
      let cmax = 1; for (let y = cor.y0; y <= cor.y1; y++) for (let x = cor.x0; x <= cor.x1; x++) { const i = y * W + x; if (cor.allowed[i] && mg.mag[i] > cmax) cmax = mg.mag[i]; }
      const cost = costFromMag(mg.mag, N, 8, cmax);
      const a = ch[0], b = ch[ch.length - 1];
      const s = snapEndpoint(mg.mag, W, H, cor.allowed, a[0], a[1], 3), t = snapEndpoint(mg.mag, W, H, cor.allowed, b[0], b[1], 3);
      const path = dijkstraPath(cost, W, H, cor.allowed, s[0], s[1], t[0], t[1]);
      erase(ch); drawSeq(path && path.length >= 2 ? path : ch, false);
    }
    for (const ch of closed) {
      if (ch.length < 6) continue;
      erase(ch); drawSeq(snapClosed(ch, mg.mag, W, H, Math.min(R, 3)), true);
    }
    const oldPop = popFill(lines), newPop = popFill(newLines);
    if (oldPop > 0 && newPop < oldPop * 0.7) { CL.toast('再吸着で領域が壊れるため中止しました'); return; } // リーク保険
    const changed = new Map(); for (let i = 0; i < N; i++) if ((lines[i] ? 1 : 0) !== (newLines[i] ? 1 : 0)) changed.set(i, lines[i]);
    if (!changed.size) { CL.toast('変化なし（既にエッジ上でした）'); return; }
    const arr = CL.writableLines(S.cur, lid); for (const [i] of changed) arr[i] = newLines[i];
    cd.fill.set(lid, CL.newFill(arr)); CL.commitChanges(S.cur, lid, changed);
    S.lastStroke = null; S.maskDirty = true; CL.render(); CL.updateUndoButtons();
    CL.toast('全線を再吸着（' + (open.length + closed.length) + '本）');
  }

  if ($('snapStroke')) $('snapStroke').addEventListener('click', snapLastStroke);
  if ($('resnapAll')) $('resnapAll').addEventListener('click', resnapAll);
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'w') { e.preventDefault(); snapLastStroke(); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); resnapAll(); }
  });
  // 動画読込で mag キャッシュ＋直前ストロークをリセット（別動画の残留を防ぐ、P4 と同クラス）。
  const prevOVL = S.onVideoLoaded;
  S.onVideoLoaded = function (file) { magCache = null; S.lastStroke = null; S.strokePts = null; return prevOVL ? prevOVL(file) : undefined; };

  window.CLSnap = { snapLastStroke, resnapAll, getMag, _magCache: () => magCache };
})(typeof self !== 'undefined' ? self : this);
