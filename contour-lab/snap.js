'use strict';
/* snap.js (P3-0/1/2) — 確定エッジスナップ。雑に描く→W→そのストロークを近くの色エッジへ吸着（レビュー可・Undo可）。
   純関数（costFromMag / dijkstraPath / buildCorridor / snapEndpoint）は ContourLab に co-attach（node テスト可）。
   コスト場＝色勾配（ICM.colorSobelMag）。回廊内で始点→終点の最小コスト経路（Dijkstra）を新しい線にする。 */
(function (global) {
  // 勾配強度 → コスト（勾配が高い＝エッジ＝低コスト）。cost = 1 + K*(1 - (mag/magMax)^gamma)。
  // gamma<1 で弱いエッジを増幅（AAで滲んだ細部＝髪の先等のエッジが引力を持つ）。既定1=従来どおり。
  function costFromMag(mag, N, K, magMax, gamma) {
    K = K == null ? 8 : K; gamma = gamma == null ? 1 : gamma;
    const inv = magMax > 0 ? 1 / magMax : 0, cost = new Float32Array(N);
    for (let i = 0; i < N; i++) { let r = mag[i] * inv; if (r > 1) r = 1; if (gamma !== 1) r = Math.pow(r, gamma); cost[i] = 1 + K * (1 - r); }
    return cost;
  }
  // 閉輪郭の順序付き点列から「鋭い曲がり」（トゲの先端・角）の添字を返す。
  // 各点で前後 k 点との弦ベクトルの折れ角（0=直進, 180=折返し）を取り、minAngleDeg 以上の局所最大を採用。
  function sharpTurnIndices(bpts, k, minAngleDeg) {
    const L = bpts.length, out = []; if (L < 2 * k + 2) return out;
    const ang = new Float32Array(L);
    for (let i = 0; i < L; i++) {
      const a = bpts[(i - k + L) % L], b = bpts[i], c = bpts[(i + k) % L];
      const v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1];
      const n1 = Math.hypot(v1x, v1y) || 1, n2 = Math.hypot(v2x, v2y) || 1;
      let cos = (v1x * v2x + v1y * v2y) / (n1 * n2); if (cos > 1) cos = 1; else if (cos < -1) cos = -1;
      ang[i] = Math.acos(cos) * 180 / Math.PI;
    }
    for (let i = 0; i < L; i++) {
      if (ang[i] < minAngleDeg) continue;
      let isMax = true;
      for (let d = -k; d <= k && isMax; d++) { if (!d) continue; const j = (i + d + L) % L; if (ang[j] > ang[i] || (ang[j] === ang[i] && j < i)) isMax = false; }
      if (isMax) out.push(i);
    }
    return out;
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

  // (x,y) から半径 r 内で最も近い線画素（円形判定）。無ければ null。
  function nearestLinePixel(lines, W, H, x, y, r) {
    let best = null, bd = Infinity; const cx = Math.round(x), cy = Math.round(y);
    for (let yy = Math.max(0, cy - r); yy <= Math.min(H - 1, cy + r); yy++) for (let xx = Math.max(0, cx - r); xx <= Math.min(W - 1, cx + r); xx++) {
      if (!lines[yy * W + xx]) continue; const d = (xx - x) * (xx - x) + (yy - y) * (yy - y); if (d < bd) { bd = d; best = [xx, yy]; }
    }
    return best && bd <= (r + 0.5) * (r + 0.5) ? best : null;
  }
  // 既存線上を a→b へ、near(許可マスク, 省略可)内の線画素だけを通る最短経路(8近傍BFS)。
  // 閉ループでは near＝なぞり近傍にすることで「なぞった側の弧」が選ばれる。到達不能なら null。
  function linePathWithin(lines, W, H, a, b, near) {
    const N = W * H, sa = a[1] * W + a[0], sb = b[1] * W + b[0];
    if (!lines[sa] || !lines[sb]) return null;
    const prev = new Int32Array(N).fill(-1), q = new Int32Array(N); let head = 0, tail = 0;
    q[tail++] = sa; prev[sa] = sa;
    while (head < tail) {
      const p = q[head++]; if (p === sb) break;
      const x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const t = yy * W + xx; if (prev[t] !== -1 || !lines[t] || (near && !near[t])) continue; prev[t] = p; q[tail++] = t;
      }
    }
    if (prev[sb] === -1) return null;
    const path = []; let c = sb; while (c !== sa) { path.push([c % W, (c / W) | 0]); c = prev[c]; } path.push([a[0], a[1]]); path.reverse(); return path;
  }

  // 塗り領域(mask=1)の外周を8近傍ムーア追跡で一周し、順序付き閉輪郭を返す（古典手法・ギザギザに頑健）。
  // start は領域の最上・最左の画素（その真上は必ず領域外）。Jacob の停止条件（開始画素へ同方向で再入）。
  function mooreBoundary(mask, W, H, start) {
    const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]; // N,NE,E,SE,S,SW,W,NW（時計回り）
    const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x]) ? 1 : 0;
    const sx = start % W, sy = (start / W) | 0;
    if (!at(sx, sy)) return [];
    const pts = [[sx, sy]];
    let cx = sx, cy = sy, scanFrom = 0;
    // 停止条件は「(画素,走査開始方向) の状態が再訪されたら一周」。方向一致だけの Jacob 基準は
    // ギザギザ形状で満たされず無限周回し得る（e2e で 8*W*H 上限まで回るハングを実測）。
    const seen = new Set(); seen.add((sy * W + sx) * 8 + scanFrom);
    for (;;) {
      let moved = -1;
      for (let k = 0; k < 8; k++) {
        const d = (scanFrom + k) % 8, nx = cx + dirs[d][0], ny = cy + dirs[d][1];
        if (at(nx, ny)) { moved = d; cx = nx; cy = ny; break; }
      }
      if (moved < 0) break; // 1画素の領域
      scanFrom = (moved + 6) % 8; // 直前に来た方向の右隣から再走査（時計回り追跡の定石）
      const state = (cy * W + cx) * 8 + scanFrom;
      if (seen.has(state)) break; // 一周完了（状態再訪＝必ず停止）
      seen.add(state); pts.push([cx, cy]);
    }
    return pts;
  }

  // 順序付き点列を移動平均（窓 win、iters 回反復）で滑らかにする。両端は固定（アンカーが動かない）。
  // 窓が端からはみ出す分は「端点を中心にした点対称外挿」で補う＝直線は完全に不変・端の接線も保たれる
  // （単純な切り詰めだと端付近で点が内側へ寄り、曲線が弦側へ引けてしまう）。戻り値は実数座標。
  function smoothChain(pts, win, iters) {
    const n = pts.length; let cur = pts.map((p) => [p[0], p[1]]);
    if (n < 3) return cur;
    const h = Math.min(Math.max(1, win >> 1), n - 1);
    const get = (arr, j) => {
      if (j >= 0 && j < n) return arr[j];
      const e = j < 0 ? arr[0] : arr[n - 1], m = j < 0 ? arr[-j] : arr[2 * (n - 1) - j];
      return [2 * e[0] - m[0], 2 * e[1] - m[1]];
    };
    for (let t = 0; t < iters; t++) {
      const nxt = new Array(n); nxt[0] = cur[0]; nxt[n - 1] = cur[n - 1];
      for (let i = 1; i < n - 1; i++) {
        let sx = 0, sy = 0;
        for (let k = -h; k <= h; k++) { const p = get(cur, i + k); sx += p[0]; sy += p[1]; }
        nxt[i] = [sx / (2 * h + 1), sy / (2 * h + 1)];
      }
      cur = nxt;
    }
    return cur;
  }

  const API = { costFromMag, dijkstraPath, buildCorridor, snapEndpoint, nearestLinePixel, linePathWithin, mooreBoundary, sharpTurnIndices, smoothChain };
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
    const cost = costFromMag(mg.mag, W * H, 8, cmax, 0.5);
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

  /* ============ なぞり吸着 (T)：円ブラシの帯（スワス）に触れた線の区間全体をエッジへ吸着 ============ */
  // 仕様（ユーザ要望で刷新）: カーソルの円（半径=吸着半径スライダー）が掃いた帯に触れた既存線の
  // 「連結した区間まるごと」が置換対象。区間の両端＝線が帯の外へ出る画素が自動でアンカーになる。
  // 新しい線は帯の中を通る色エッジ沿いの最小コスト経路（Dijkstra）。閉ループ対応。1 Undo で復元。
  let tracing = false, tracePts = null;
  // T/なぞり平滑(Y) 共通の前段: 円ブラシが掃いた帯→触れた線の最大連結区間→自動アンカー A,B。
  // 失敗時は理由を toast して null（挙動・文言は従来の T と同一）。
  function pickSwathSection(pts) {
    const lid = S.activeLid, cd = S.frames.get(S.cur), lines0 = cd && cd.lines.get(lid);
    if (!lines0) { CL.toast('この色に線がありません'); return null; }
    if (!pts || !pts.length) return null;
    const W = S.W, H = S.H, N = W * H;
    const R = Math.max(2, S.traceSnapR || (+($('snapRadius') ? $('snapRadius').value : 6)));
    const swath = buildCorridor(pts, W, H, R); // 円が掃いた帯
    // 帯に触れた線画素 → 8連結成分に分け、最大の成分＝置換対象の区間
    const compId = new Int32Array(N).fill(-1); const comps = [];
    for (let y = Math.max(0, swath.y0); y <= Math.min(H - 1, swath.y1); y++) for (let x = Math.max(0, swath.x0); x <= Math.min(W - 1, swath.x1); x++) {
      const s0 = y * W + x; if (!swath.allowed[s0] || !lines0[s0] || compId[s0] >= 0) continue;
      const id = comps.length, px = []; const stk = [s0]; compId[s0] = id;
      while (stk.length) { const p = stk.pop(); px.push(p); const cx0 = p % W, cy0 = (p / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = cx0 + dx, yy = cy0 + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (swath.allowed[q] && lines0[q] && compId[q] < 0) { compId[q] = id; stk.push(q); } } }
      comps.push(px);
    }
    if (!comps.length) { CL.toast('円が既存の線を通っていません（線の上をなぞってください）'); return null; }
    comps.sort((a, b) => b.length - a.length); const comp = comps[0]; const inComp = new Uint8Array(N); for (const p of comp) inComp[p] = 1;
    // アンカー候補 = 「線が帯の外へ続く画素（出口）」∪「区間内にある線の端点（次数≤1）」。最遠ペアを A,B に。
    const candEnds = [];
    for (const p of comp) {
      const x = p % W, y = (p / W) | 0; let deg = 0, exit = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (lines0[q]) { deg++; if (!inComp[q]) exit = true; } }
      if (exit || deg <= 1) candEnds.push(p);
    }
    if (candEnds.length < 2) { CL.toast('線を覆いすぎです：区間の両側が円の外に続くようになぞってください'); return null; }
    let aIdx = -1, bIdx = -1, bestD = -1;
    for (let i = 0; i < candEnds.length; i++) for (let j = i + 1; j < candEnds.length; j++) {
      const p = candEnds[i], q = candEnds[j]; const dx = (p % W) - (q % W), dy = ((p / W) | 0) - ((q / W) | 0), d = dx * dx + dy * dy;
      if (d > bestD) { bestD = d; aIdx = p; bIdx = q; }
    }
    if (bestD <= 0) { CL.toast('なぞる範囲が狭すぎます'); return null; }
    const A = [aIdx % W, (aIdx / W) | 0], B = [bIdx % W, (bIdx / W) | 0];
    return { lid, lines0, W, H, N, R, swath, comp, inComp, aIdx, bIdx, A, B };
  }
  function traceSnapApply(pts) {
    const sec = pickSwathSection(pts); if (!sec) return;
    const { W, H, N, swath, comp, A, B } = sec;
    const mg = getMag(); if (!mg) { CL.toast('エッジ場が使えません'); return; }
    let cmax = 1; for (let y = swath.y0; y <= swath.y1; y++) for (let x = swath.x0; x <= swath.x1; x++) { const i = y * W + x; if (swath.allowed[i] && mg.mag[i] > cmax) cmax = mg.mag[i]; }
    const cost = costFromMag(mg.mag, N, 8, cmax, 0.5);
    const path = dijkstraPath(cost, W, H, swath.allowed, A[0], A[1], B[0], B[1]);
    if (!path || path.length < 2) { CL.toast('経路が見つかりません（吸着半径を上げてみてください）'); return; }
    replaceSection(sec, pts, path, '円が通った区間をエッジへ吸着しました（' + comp.length + 'px→' + path.length + '点）', '変化なし（既にエッジ上でした）');
  }
  // T/なぞり平滑(Y) 共通の後段: 区間を新しい点列で置換して確定。
  // 新線 = 旧線 − 区間全体(アンカー除く) + 新経路。取り残し（孤立/ぶら下がり）は帯+3px内で連鎖掃除。
  // 塗り3割崩壊で中止。1 Undo で全復元（挙動・文言は従来の T と同一）。
  function replaceSection(sec, tpts, path, okMsg, noChangeMsg) {
    const { lid, lines0, W, H, N, R, comp, inComp, aIdx, bIdx } = sec;
    const newLines = Uint8Array.from(lines0);
    for (const p of comp) if (p !== aIdx && p !== bIdx) newLines[p] = 0;
    const pathMask = new Uint8Array(N);
    for (let k = 1; k < path.length; k++) CLab.bresenham(pathMask, W, H, path[k - 1][0], path[k - 1][1], path[k][0], path[k][1], 1, null);
    for (let i = 0; i < N; i++) if (pathMask[i]) newLines[i] = 1;
    newLines[aIdx] = 1; newLines[bIdx] = 1;
    // 取り残し掃除: 区間除去の縁に残る旧線の孤立/ぶら下がり(次数≤1)画素を反復除去。
    // 候補＝除去区間の8近傍の旧線画素。削除でぶら下がりが伝播する（2px以上のヒゲ）ため、削除した画素の
    // 隣も候補へ連鎖追加する。ただし帯の近傍(+3px)に限定＝離れた正規の線・枝は巻き込まない。
    // 新経路・アンカーは常に保護。
    {
      const nearSw = buildCorridor(tpts, W, H, R + 3).allowed;
      const okCand = (q) => lines0[q] && !inComp[q] && !pathMask[q] && q !== aIdx && q !== bIdx && nearSw[q];
      const cand = new Set();
      for (const p of comp) {
        const sx = p % W, sy = (p / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = sx + dx, yy = sy + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const q = yy * W + xx; if (okCand(q)) cand.add(q);
        }
      }
      let removedAny = true;
      while (removedAny) {
        removedAny = false;
        for (const c of cand) {
          if (!newLines[c]) continue;
          const x = c % W, y = (c / W) | 0; let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (newLines[yy * W + xx]) n++; }
          if (n <= 1) {
            newLines[c] = 0; removedAny = true;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (okCand(q)) cand.add(q); }
          }
        }
      }
    }
    // リーク保険: 塗り(閉領域)が3割以上崩れるなら中止
    const pop = (u8) => { let c = 0; for (let i = 0; i < u8.length; i++) if (u8[i]) c++; return c; };
    const oldPop = pop(CLab.computeFill(lines0, W, H)), newPop = pop(CLab.computeFill(newLines, W, H));
    if (oldPop > 0 && newPop < oldPop * 0.7) { CL.toast('領域が壊れるため中止しました（なぞる範囲を見直してください）'); return; }
    const changed = new Map(); for (let i = 0; i < N; i++) { const nv = newLines[i] ? 1 : 0; if ((lines0[i] ? 1 : 0) !== nv) changed.set(i, lines0[i]); }
    if (!changed.size) { CL.toast(noChangeMsg); return; }
    const arr = CL.writableLines(S.cur, lid); for (const [i] of changed) arr[i] = newLines[i];
    CL.fdata(S.cur).fill.set(lid, CL.newFill(arr)); CL.commitChanges(S.cur, lid, changed);
    S.lastStroke = null; S.maskDirty = true; CL.render(); CL.updateUndoButtons();
    CL.toast(okMsg);
  }
  /* ============ なぞり平滑 (Y)：なぞった区間を「エッジに寄せず」滑らかな1px線へ置き換える ============ */
  // T と同じ帯選択・アンカー決定。置換経路＝既存線を区間内でたどった順序付き点列（局所的に2px厚い
  // 塊もBFSで1本の糸に集約）を移動平均で平滑化してラスタ化。エッジ検出は一切使わない＝意図しない
  // 境界へ引っ張られない。なめらかさスライダー＝平滑反復回数。
  function traceSmoothApply(pts) {
    const sec = pickSwathSection(pts); if (!sec) return;
    const { lines0, W, H, comp, inComp, A, B } = sec;
    const chain = linePathWithin(lines0, W, H, A, B, inComp);
    if (!chain || chain.length < 3) { CL.toast('区間をたどれません（なぞる範囲を見直してください）'); return; }
    const s = Math.max(1, +($('smoothStrength') ? $('smoothStrength').value : 4));
    const sm = smoothChain(chain, 7, s);
    // 丸め＋連続重複除去（両端＝アンカーは smoothChain が固定済み）
    const path = []; let lx = -1, ly = -1;
    for (const p of sm) {
      const x = Math.max(0, Math.min(W - 1, Math.round(p[0]))), y = Math.max(0, Math.min(H - 1, Math.round(p[1])));
      if (x === lx && y === ly) continue; path.push([x, y]); lx = x; ly = y;
    }
    if (path.length < 2) { CL.toast('なぞる範囲が狭すぎます'); return; }
    replaceSection(sec, pts, path, 'なぞった区間を滑らかな1px線にしました（' + comp.length + 'px→' + path.length + '点）', '変化なし（既に滑らかでした）');
  }
  /* ============ フレーム全体のエッジ吸着：選択色の全輪郭を一括でエッジへ（専用半径） ============ */
  // 「塗り領域の外周」をムーア追跡で順序付き閉輪郭にし（線グラフの枝・ギザギザに頑健）、
  // 約90px間隔のアンカーで区切って区間ごとに帯Dijkstraで置換。アンカーは局所の勾配最大へ小さく(≤4px)
  // 寄せ、隣接区間とアンカーを共有＝ループは閉じたまま。塗りの無い開曲線（手描きメモ等）と20px未満の
  // 微小成分（ノイズ片）は対象外。塗り3割崩壊で中止。1 Undo で全復元。
  function snapFrameEdges() {
    const lid = S.activeLid, cd = S.frames.get(S.cur), lines0 = cd && cd.lines.get(lid);
    if (!lines0) { CL.toast('この色に線がありません'); return; }
    const mg = getMag(); if (!mg) { CL.toast('エッジ場が使えません'); return; }
    const W = S.W, H = S.H, N = W * H;
    const Rf = Math.max(2, +($('frameSnapRadius') ? $('frameSnapRadius').value : 5));
    const SEG = 90;
    // 領域 = 線 ∪ 塗り。領域の8連結成分ごとに外周を処理する。
    const fill0 = CLab.computeFill(lines0, W, H);
    const full = new Uint8Array(N); for (let i = 0; i < N; i++) if (lines0[i] || fill0[i]) full[i] = 1;
    const compOf = new Int32Array(N).fill(-1); const comps = []; // {start(最上左), size, fillCnt, idx[]}
    for (let i = 0; i < N; i++) {
      if (!full[i] || compOf[i] >= 0) continue;
      const id = comps.length, idx = []; let fillCnt = 0; const stk = [i]; compOf[i] = id;
      while (stk.length) { const p = stk.pop(); idx.push(p); if (!lines0[p]) fillCnt++; const x = p % W, y = (p / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (full[q] && compOf[q] < 0) { compOf[q] = id; stk.push(q); } } }
      comps.push({ start: i, size: idx.length, fillCnt, idx }); // i はスキャン順で最上左
    }
    const newLines = Uint8Array.from(lines0);
    let snapped = 0;
    const drawChain = (pts) => { for (let k = 1; k < pts.length; k++) CLab.bresenham(newLines, W, H, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], 1, null); if (pts.length === 1) newLines[pts[0][1] * W + pts[0][0]] = 1; };
    // 閉輪郭（順序付き点列）をアンカー分割してエッジへ吸着（外周・穴の縁の共通処理）。
    // コスト＝エッジ項（グローバル正規化）＋「元の輪郭からの距離」バイアス。エッジ信号が無い平坦部
    // （例: 髪内部の穴）では距離項が支配して元の形を保ち、実エッジがある所だけ吸着する。
    // 回廊内正規化だと平坦部でノイズが増幅され、最短経路化で閉ループが退化して穴が潰れる（実測）。
    const globalMax = mg.magMax || 1, nudgeThr = 0.15 * globalMax;
    const snapClosedBoundary = (bpts) => {
      const L = bpts.length;
      // トゲの先端・角（鋭い曲がり）を検出して固定アンカーに＝Dijkstraの近道で先端が丸められない。
      // 均等アンカー（約SEG間隔）は鋭角アンカーの近く(±12)では省く。
      const sharp = sharpTurnIndices(bpts, 6, 55), pinned = new Set(sharp);
      const anchorIdx = sharp.slice();
      { const n = Math.max(2, Math.round(L / SEG));
        for (let i = 0; i < n; i++) { const u = Math.floor(i * L / n); let near = false; for (const s2 of sharp) { let d = Math.abs(u - s2); d = Math.min(d, L - d); if (d < 12) { near = true; break; } } if (!near) anchorIdx.push(u); } }
      anchorIdx.sort((x, y) => x - y);
      if (anchorIdx.length < 2) anchorIdx.push((anchorIdx[0] + (L >> 1)) % L), anchorIdx.sort((x, y) => x - y);
      const rN = Math.min(Rf, 4);
      // アンカー移動は「意味のあるエッジ（グローバル最大の15%以上）へ、今より良くなる時だけ」。鋭角アンカーは動かさない。
      const anchors = anchorIdx.map((i) => {
        const p = bpts[i]; if (pinned.has(i)) return p;
        let best = p, bd = mg.mag[p[1] * W + p[0]];
        for (let dy = -rN; dy <= rN; dy++) for (let dx = -rN; dx <= rN; dx++) { const x = p[0] + dx, y = p[1] + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const m = mg.mag[y * W + x]; if (m > bd && m >= nudgeThr) { bd = m; best = [x, y]; } }
        return best;
      });
      for (let a = 0; a < anchors.length; a++) {
        const i0 = anchorIdx[a], i1 = anchorIdx[(a + 1) % anchors.length];
        const arcPts = (a === anchors.length - 1) ? bpts.slice(i0).concat(bpts.slice(0, i1 + 1)) : bpts.slice(i0, i1 + 1);
        const A = anchors[a], B = anchors[(a + 1) % anchors.length];
        const cor = buildCorridor(arcPts.concat([A, B]), W, H, Rf);
        const cost = costFromMag(mg.mag, N, 8, globalMax, 0.5);
        // 元の弧からの距離（回廊内BFS）をコストに加算 → 平坦部では元の形を維持
        const distB = new Int32Array(N).fill(-1); const q = [];
        for (const p of arcPts) { const i = p[1] * W + p[0]; if (cor.allowed[i] && distB[i] < 0) { distB[i] = 0; q.push(i); } }
        let qh = 0; while (qh < q.length) { const i = q[qh++]; const x = i % W, y = (i / W) | 0, d = distB[i] + 1;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (cor.allowed[j] && distB[j] < 0) { distB[j] = d; q.push(j); } } }
        for (let y = cor.y0; y <= cor.y1; y++) for (let x = cor.x0; x <= cor.x1; x++) { const i = y * W + x; if (cor.allowed[i]) cost[i] += (distB[i] < 0 ? Rf : distB[i]); }
        const path = dijkstraPath(cost, W, H, cor.allowed, A[0], A[1], B[0], B[1]);
        drawChain(path && path.length >= 2 ? path : arcPts); // 失敗区間は元の形を維持
      }
    };
    const holeScratch = new Uint8Array(N); // 穴の縁追跡用（使い回し）
    for (const c of comps) {
      if (c.size < 20 || c.fillCnt === 0) continue; // ノイズ片・塗りのない開曲線はそのまま
      const bpts = mooreBoundary(full, W, H, c.start); // 外周（順序付き・閉）
      if (bpts.length < 12) continue;
      for (const p of c.idx) if (lines0[p]) newLines[p] = 0; // この領域の旧線を丸ごと消す（内部の迷い線も掃除）
      snapClosedBoundary(bpts);
      // 穴（ドーナツ）: 領域bbox内で「この領域以外」を外周(bbox縁)から4近傍floodし、届かない空間＝穴。
      // 穴の縁も輪郭として同様に吸着（外周だけ描き直すと穴の縁の線が失われ even-odd で穴が埋まる、ユーザ報告バグ）。
      {
        const cid = compOf[c.start];
        let minx = W, miny = H, maxx = 0, maxy = 0;
        for (const p of c.idx) { const x = p % W, y = (p / W) | 0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
        minx = Math.max(0, minx - 1); miny = Math.max(0, miny - 1); maxx = Math.min(W - 1, maxx + 1); maxy = Math.min(H - 1, maxy + 1);
        const bw = maxx - minx + 1, bh = maxy - miny + 1, mark = new Uint8Array(bw * bh), stk = [];
        const push = (lx, ly, v) => { const li = ly * bw + lx; if (mark[li]) return; const g = (miny + ly) * W + (minx + lx); if (compOf[g] === cid) return; mark[li] = v; stk.push(li); };
        for (let x = 0; x < bw; x++) { push(x, 0, 1); push(x, bh - 1, 1); }
        for (let y = 0; y < bh; y++) { push(0, y, 1); push(bw - 1, y, 1); }
        while (stk.length) { const li = stk.pop(); const lx = li % bw, ly = (li / bw) | 0; if (lx > 0) push(lx - 1, ly, 1); if (lx < bw - 1) push(lx + 1, ly, 1); if (ly > 0) push(lx, ly - 1, 1); if (ly < bh - 1) push(lx, ly + 1, 1); }
        for (let ly = 0; ly < bh; ly++) for (let lx = 0; lx < bw; lx++) {
          const li = ly * bw + lx; if (mark[li]) continue; const g0 = (miny + ly) * W + (minx + lx); if (compOf[g0] === cid) continue;
          // 穴blobを収集（4近傍）
          const blob = []; let minIdx = g0; mark[li] = 2; const hs = [li];
          while (hs.length) { const l2 = hs.pop(); const x2 = l2 % bw, y2 = (l2 / bw) | 0; const g2 = (miny + y2) * W + (minx + x2); blob.push(g2); if (g2 < minIdx) minIdx = g2;
            const tryN = (lx3, ly3) => { const l3 = ly3 * bw + lx3; if (mark[l3]) return; const g3 = (miny + ly3) * W + (minx + lx3); if (compOf[g3] === cid) return; mark[l3] = 2; hs.push(l3); };
            if (x2 > 0) tryN(x2 - 1, y2); if (x2 < bw - 1) tryN(x2 + 1, y2); if (y2 > 0) tryN(x2, y2 - 1); if (y2 < bh - 1) tryN(x2, y2 + 1); }
          for (const g of blob) holeScratch[g] = 1;
          const rim = mooreBoundary(holeScratch, W, H, minIdx);
          for (const g of blob) holeScratch[g] = 0;
          if (rim.length >= 24) snapClosedBoundary(rim);
          else if (rim.length >= 2) drawChain(rim.concat([rim[0]])); // 小さな穴は形をそのまま維持
        }
      }
      snapped++;
    }
    if (!snapped) { CL.toast('対象の輪郭がありません（塗りのある20px以上の領域が対象）'); return; }
    const pop = (u8) => { let c2 = 0; for (let i = 0; i < u8.length; i++) if (u8[i]) c2++; return c2; };
    const oldPop = pop(CLab.computeFill(lines0, W, H)), newPop = pop(CLab.computeFill(newLines, W, H));
    if (oldPop > 0 && newPop < oldPop * 0.7) { CL.toast('領域が壊れるため中止しました（全体半径を小さくしてください）'); return; }
    const changed = new Map(); for (let i = 0; i < N; i++) { const nv = newLines[i] ? 1 : 0; if ((lines0[i] ? 1 : 0) !== nv) changed.set(i, lines0[i]); }
    if (!changed.size) { CL.toast('変化なし（既にエッジ上でした）'); return; }
    const arr = CL.writableLines(S.cur, lid); for (const [i] of changed) arr[i] = newLines[i];
    CL.fdata(S.cur).fill.set(lid, CL.newFill(arr)); CL.commitChanges(S.cur, lid, changed);
    S.lastStroke = null; S.maskDirty = true; CL.render(); CL.updateUndoButtons();
    CL.toast('フレーム全体のエッジへ吸着しました（' + snapped + '本の輪郭）');
  }

  // 入力（カスタムツール委譲＋自前 move/up）。なぞり中はプレビュー線を重畳（T=黄 / 平滑=水色）。
  const isTraceTool = (t) => t === 'tracesnap' || t === 'tracesmooth';
  const prevOnToolDown = S.onToolDown;
  S.onToolDown = function (e, px, py, wx, wy) {
    if (isTraceTool(S.tool)) { tracing = true; tracePts = [[px, py]]; CL.render(); return; }
    if (prevOnToolDown) prevOnToolDown(e, px, py, wx, wy);
  };
  CL.dom.view.addEventListener('pointermove', (e) => {
    if (!tracing || !isTraceTool(S.tool)) return;
    const [px, py] = CL.eventToPixel(e); const last = tracePts[tracePts.length - 1];
    if (px !== last[0] || py !== last[1]) tracePts.push([px, py]);
    CL.scheduleRender();
  });
  window.addEventListener('pointerup', () => {
    if (!tracing) return; tracing = false; const pts = tracePts; tracePts = null; CL.render();
    if (!pts || !pts.length) return;
    if (S.tool === 'tracesnap') traceSnapApply(pts); // 1点クリック＝その円内だけの局所吸着
    else if (S.tool === 'tracesmooth') traceSmoothApply(pts);
  });
  const prevAfter = S.onAfterSource;
  S.onAfterSource = function (ctx, v) {
    if (prevAfter) prevAfter(ctx, v);
    if (!isTraceTool(S.tool) || !tracing || !tracePts || !tracePts.length) return;
    // 掃いた帯（実際の対象幅）を半透明で表示＋中心線。1点ならその円。
    const R = Math.max(2, S.traceSnapR || 6);
    const band = S.tool === 'tracesmooth' ? 'rgba(122,211,255,.22)' : 'rgba(255,211,77,.22)';
    const mid = S.tool === 'tracesmooth' ? '#7ad3ff' : '#ffd34d';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tracePts.length === 1) {
      ctx.fillStyle = band; ctx.beginPath(); ctx.arc(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5, R, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = band; ctx.lineWidth = R * 2; ctx.beginPath();
      ctx.moveTo(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5);
      for (let k = 1; k < tracePts.length; k++) ctx.lineTo(tracePts[k][0] + 0.5, tracePts[k][1] + 0.5);
      ctx.stroke();
      ctx.strokeStyle = mid; ctx.lineWidth = Math.max(1, 2 / S.view.scale); ctx.beginPath();
      ctx.moveTo(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5);
      for (let k = 1; k < tracePts.length; k++) ctx.lineTo(tracePts[k][0] + 0.5, tracePts[k][1] + 0.5);
      ctx.stroke();
    }
  };
  const prevOnToolChange = S.onToolChange;
  S.onToolChange = function (t) {
    const b = $('toolTraceSnap'); if (b) b.classList.toggle('active', t === 'tracesnap');
    const b2 = $('toolTraceSmooth'); if (b2) b2.classList.toggle('active', t === 'tracesmooth');
    if (prevOnToolChange) prevOnToolChange(t);
  };

  // 吸着半径スライダー: ラベル表示と S.traceSnapR（なぞり吸着カーソルの半径円）を同期。
  // ※従来はリスナーが無くラベルが「6」のまま動かなかった（値自体は使用時に読まれ効いてはいた）。
  const srEl = $('snapRadius'), srLbl = $('snapRadiusLabel');
  function syncSnapR() { const v = srEl ? +srEl.value : 6; S.traceSnapR = v; if (srLbl) srLbl.textContent = v; }
  if (srEl) srEl.addEventListener('input', () => { syncSnapR(); CL.render(); });
  syncSnapR();

  if ($('snapStroke')) $('snapStroke').addEventListener('click', snapLastStroke);
  if ($('toolTraceSnap')) $('toolTraceSnap').addEventListener('click', () => CL.setTool('tracesnap'));
  if ($('toolTraceSmooth')) $('toolTraceSmooth').addEventListener('click', () => CL.setTool('tracesmooth'));
  if ($('snapFrame')) $('snapFrame').addEventListener('click', snapFrameEdges);
  const fsrEl = $('frameSnapRadius'), fsrLbl = $('frameSnapRadiusLabel');
  if (fsrEl) fsrEl.addEventListener('input', () => { if (fsrLbl) fsrLbl.textContent = fsrEl.value; });
  const ssEl = $('smoothStrength'), ssLbl = $('smoothStrengthLabel');
  if (ssEl) ssEl.addEventListener('input', () => { if (ssLbl) ssLbl.textContent = ssEl.value; });
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'w') { e.preventDefault(); snapLastStroke(); }
    else if (e.key.toLowerCase() === 't') { CL.setTool('tracesnap'); CL.toast('なぞり吸着: 既存の線に沿ってなぞる→離すと吸着'); }
    else if (e.key.toLowerCase() === 'y') { CL.setTool('tracesmooth'); CL.toast('なぞり平滑: 線に沿ってなぞる→離すと滑らかな1px線に'); }
  });
  // 動画読込で mag キャッシュ＋直前ストロークをリセット（別動画の残留を防ぐ、P4 と同クラス）。
  const prevOVL = S.onVideoLoaded;
  S.onVideoLoaded = function (file) { magCache = null; S.lastStroke = null; S.strokePts = null; return prevOVL ? prevOVL(file) : undefined; };

  window.CLSnap = { snapLastStroke, traceSnapApply, traceSmoothApply, snapFrameEdges, getMag, _magCache: () => magCache };
})(typeof self !== 'undefined' ? self : this);
