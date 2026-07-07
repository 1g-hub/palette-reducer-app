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

  const API = { costFromMag, dijkstraPath, buildCorridor, snapEndpoint, nearestLinePixel, linePathWithin };
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

  /* ============ なぞり吸着 (T)：円ブラシの帯（スワス）に触れた線の区間全体をエッジへ吸着 ============ */
  // 仕様（ユーザ要望で刷新）: カーソルの円（半径=吸着半径スライダー）が掃いた帯に触れた既存線の
  // 「連結した区間まるごと」が置換対象。区間の両端＝線が帯の外へ出る画素が自動でアンカーになる。
  // 新しい線は帯の中を通る色エッジ沿いの最小コスト経路（Dijkstra）。閉ループ対応。1 Undo で復元。
  let tracing = false, tracePts = null;
  function traceSnapApply(pts) {
    const lid = S.activeLid, cd = S.frames.get(S.cur), lines0 = cd && cd.lines.get(lid);
    if (!lines0) { CL.toast('この色に線がありません'); return; }
    if (!pts || !pts.length) return;
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
    if (!comps.length) { CL.toast('円が既存の線を通っていません（線の上をなぞってください）'); return; }
    comps.sort((a, b) => b.length - a.length); const comp = comps[0]; const inComp = new Uint8Array(N); for (const p of comp) inComp[p] = 1;
    // アンカー候補 = 「線が帯の外へ続く画素（出口）」∪「区間内にある線の端点（次数≤1）」。最遠ペアを A,B に。
    const candEnds = [];
    for (const p of comp) {
      const x = p % W, y = (p / W) | 0; let deg = 0, exit = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (lines0[q]) { deg++; if (!inComp[q]) exit = true; } }
      if (exit || deg <= 1) candEnds.push(p);
    }
    if (candEnds.length < 2) { CL.toast('線を覆いすぎです：区間の両側が円の外に続くようになぞってください'); return; }
    let aIdx = -1, bIdx = -1, bestD = -1;
    for (let i = 0; i < candEnds.length; i++) for (let j = i + 1; j < candEnds.length; j++) {
      const p = candEnds[i], q = candEnds[j]; const dx = (p % W) - (q % W), dy = ((p / W) | 0) - ((q / W) | 0), d = dx * dx + dy * dy;
      if (d > bestD) { bestD = d; aIdx = p; bIdx = q; }
    }
    if (bestD <= 0) { CL.toast('なぞる範囲が狭すぎます'); return; }
    const A = [aIdx % W, (aIdx / W) | 0], B = [bIdx % W, (bIdx / W) | 0];
    const mg = getMag(); if (!mg) { CL.toast('エッジ場が使えません'); return; }
    let cmax = 1; for (let y = swath.y0; y <= swath.y1; y++) for (let x = swath.x0; x <= swath.x1; x++) { const i = y * W + x; if (swath.allowed[i] && mg.mag[i] > cmax) cmax = mg.mag[i]; }
    const cost = costFromMag(mg.mag, N, 8, cmax);
    const path = dijkstraPath(cost, W, H, swath.allowed, A[0], A[1], B[0], B[1]);
    if (!path || path.length < 2) { CL.toast('経路が見つかりません（吸着半径を上げてみてください）'); return; }
    // 新線 = 旧線 − 帯に触れた区間全体(アンカー除く) + 新経路
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
      const nearSw = buildCorridor(pts, W, H, R + 3).allowed;
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
    if (!changed.size) { CL.toast('変化なし（既にエッジ上でした）'); return; }
    const arr = CL.writableLines(S.cur, lid); for (const [i] of changed) arr[i] = newLines[i];
    CL.fdata(S.cur).fill.set(lid, CL.newFill(arr)); CL.commitChanges(S.cur, lid, changed);
    S.lastStroke = null; S.maskDirty = true; CL.render(); CL.updateUndoButtons();
    CL.toast('円が通った区間をエッジへ吸着しました（' + comp.length + 'px→' + path.length + '点）');
  }
  // 入力（カスタムツール委譲＋自前 move/up）。なぞり中は黄色のプレビュー線を重畳。
  const prevOnToolDown = S.onToolDown;
  S.onToolDown = function (e, px, py, wx, wy) {
    if (S.tool === 'tracesnap') { tracing = true; tracePts = [[px, py]]; CL.render(); return; }
    if (prevOnToolDown) prevOnToolDown(e, px, py, wx, wy);
  };
  CL.dom.view.addEventListener('pointermove', (e) => {
    if (!tracing || S.tool !== 'tracesnap') return;
    const [px, py] = CL.eventToPixel(e); const last = tracePts[tracePts.length - 1];
    if (px !== last[0] || py !== last[1]) tracePts.push([px, py]);
    CL.scheduleRender();
  });
  window.addEventListener('pointerup', () => {
    if (!tracing) return; tracing = false; const pts = tracePts; tracePts = null; CL.render();
    if (S.tool === 'tracesnap' && pts && pts.length >= 1) traceSnapApply(pts); // 1点クリック＝その円内だけの局所吸着
  });
  const prevAfter = S.onAfterSource;
  S.onAfterSource = function (ctx, v) {
    if (prevAfter) prevAfter(ctx, v);
    if (S.tool !== 'tracesnap' || !tracing || !tracePts || !tracePts.length) return;
    // 掃いた帯（実際の吸着対象幅）を半透明で表示＋中心線。1点ならその円。
    const R = Math.max(2, S.traceSnapR || 6);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tracePts.length === 1) {
      ctx.fillStyle = 'rgba(255,211,77,.22)'; ctx.beginPath(); ctx.arc(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5, R, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,211,77,.22)'; ctx.lineWidth = R * 2; ctx.beginPath();
      ctx.moveTo(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5);
      for (let k = 1; k < tracePts.length; k++) ctx.lineTo(tracePts[k][0] + 0.5, tracePts[k][1] + 0.5);
      ctx.stroke();
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = Math.max(1, 2 / S.view.scale); ctx.beginPath();
      ctx.moveTo(tracePts[0][0] + 0.5, tracePts[0][1] + 0.5);
      for (let k = 1; k < tracePts.length; k++) ctx.lineTo(tracePts[k][0] + 0.5, tracePts[k][1] + 0.5);
      ctx.stroke();
    }
  };
  const prevOnToolChange = S.onToolChange;
  S.onToolChange = function (t) { const b = $('toolTraceSnap'); if (b) b.classList.toggle('active', t === 'tracesnap'); if (prevOnToolChange) prevOnToolChange(t); };

  // 吸着半径スライダー: ラベル表示と S.traceSnapR（なぞり吸着カーソルの半径円）を同期。
  // ※従来はリスナーが無くラベルが「6」のまま動かなかった（値自体は使用時に読まれ効いてはいた）。
  const srEl = $('snapRadius'), srLbl = $('snapRadiusLabel');
  function syncSnapR() { const v = srEl ? +srEl.value : 6; S.traceSnapR = v; if (srLbl) srLbl.textContent = v; }
  if (srEl) srEl.addEventListener('input', () => { syncSnapR(); CL.render(); });
  syncSnapR();

  if ($('snapStroke')) $('snapStroke').addEventListener('click', snapLastStroke);
  if ($('toolTraceSnap')) $('toolTraceSnap').addEventListener('click', () => CL.setTool('tracesnap'));
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'w') { e.preventDefault(); snapLastStroke(); }
    else if (e.key.toLowerCase() === 't') { CL.setTool('tracesnap'); CL.toast('なぞり吸着: 既存の線に沿ってなぞる→離すと吸着'); }
  });
  // 動画読込で mag キャッシュ＋直前ストロークをリセット（別動画の残留を防ぐ、P4 と同クラス）。
  const prevOVL = S.onVideoLoaded;
  S.onVideoLoaded = function (file) { magCache = null; S.lastStroke = null; S.strokePts = null; return prevOVL ? prevOVL(file) : undefined; };

  window.CLSnap = { snapLastStroke, traceSnapApply, getMag, _magCache: () => magCache };
})(typeof self !== 'undefined' ? self : this);
