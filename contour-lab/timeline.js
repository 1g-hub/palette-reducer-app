'use strict';
/* timeline.js (P2) — カット検出 + タイムライン表示。
   detectCuts は純関数（ContourLab に co-attach、node でテスト可能）。
   解析は再生パス(rVFC)で各フレームの HSV ヒストグラム距離を測る（seek 全走査より速い）。 */
(function (global) {
  // dists[i] = フレーム i と直前サンプルの HSV 距離（未サンプルは0）。sens 既定0.5。
  // しきい値 = min(0.82, max(sens, median+3*MAD))（本体 app.js:937 と同式）。連続超過は先頭のみ採用。
  function detectCuts(dists, sens) {
    sens = sens == null ? 0.5 : sens;
    const jumps = []; for (let i = 0; i < dists.length; i++) if (dists[i] > 0) jumps.push(dists[i]);
    const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const med = median(jumps);
    const mad = median(jumps.map((d) => Math.abs(d - med)));
    const threshold = Math.min(0.82, Math.max(sens, med + 3 * mad));
    const cuts = [];
    for (let i = 1; i < dists.length; i++) if (dists[i] > threshold && !(dists[i - 1] > threshold)) cuts.push(i);
    return cuts;
  }

  // シーン移動の目標フレーム（純関数）。starts=[0, ...cuts] が各シーンの先頭。
  //  dir>0: cur より後の最初のシーン先頭（＝次シーンの最初のフレーム）。無ければ null。
  //  dir<0: 現在シーンの先頭。既にそこなら前シーンの先頭。無ければ null。
  function sceneTarget(cuts, cur, dir) {
    const starts = [0, ...((cuts || []).slice().sort((a, b) => a - b))];
    if (dir > 0) { for (const s of starts) if (s > cur) return s; return null; }
    let idx = 0; for (let i = 0; i < starts.length; i++) if (starts[i] <= cur) idx = i;
    const target = (starts[idx] === cur && idx > 0) ? starts[idx - 1] : starts[idx];
    return target === cur ? null : target;
  }

  const API = { detectCuts, sceneTarget };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  if (!window.CL) return;

  const CL = window.CL, S = CL.S, $ = (id) => document.getElementById(id);
  const ICM = window.ICM;

  function scaledSize(w, h, shortSide) { const s = shortSide / Math.max(1, Math.min(w, h)); return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }; }

  // ---- 解析（再生パス） ----
  let analyzing = false, cancelFlag = false;
  function analyzeCuts(onProgress, shortSide) {
    return new Promise((resolve, reject) => {
      const v = S.video; if (!v || !ICM) { reject(new Error('no video/ICM')); return; }
      const sz = scaledSize(S.W, S.H, shortSide || 96);
      const cvs = document.createElement('canvas'); cvs.width = sz.width; cvs.height = sz.height;
      const cx = cvs.getContext('2d', { willReadFrequently: true });
      const dists = new Float32Array(S.total);
      let prevHist = null, prevF = -1, done = false;
      const finish = () => { if (done) return; done = true; try { v.pause(); } catch (e) {} v.removeEventListener('ended', finish); resolve(dists); };
      const cb = () => {
        if (cancelFlag) { finish(); return; }
        const f = Math.min(S.total - 1, Math.max(0, Math.round(v.currentTime * S.fps - 0.5)));
        cx.drawImage(v, 0, 0, sz.width, sz.height);
        const hist = ICM.hsvHist(cx.getImageData(0, 0, sz.width, sz.height));
        if (prevHist && f > prevF) dists[f] = ICM.histIntersectionDistance(prevHist, hist);
        prevHist = hist; prevF = f;
        if (onProgress) onProgress((f + 1) / S.total);
        if (v.ended || f >= S.total - 1) { finish(); return; }
        v.requestVideoFrameCallback(cb);
      };
      v.addEventListener('ended', finish, { once: true });
      try { v.currentTime = 0; } catch (e) {}
      v.play().then(() => v.requestVideoFrameCallback(cb)).catch((e) => { finish(); reject(e); });
    });
  }

  async function runAnalyze() {
    if (analyzing || !S.video) return;
    analyzing = true; cancelFlag = false;
    const btn = $('analyzeCuts'), prog = $('cutProgress');
    if (btn) btn.textContent = '解析中…（クリックで中止）';
    try {
      const dists = await analyzeCuts((p) => { if (prog) prog.textContent = Math.round(p * 100) + '%'; });
      S.cutDists = Array.from(dists);
      const sens = +($('cutSens') ? $('cutSens').value : 0.5);
      S.cuts = detectCuts(dists, sens);
      if (S.onMetaChanged) S.onMetaChanged();
      if (prog) prog.textContent = S.cuts.length + 'カット検出';
      drawTimeline();
    } catch (e) { if (prog) prog.textContent = '解析失敗: ' + e.message; }
    finally { analyzing = false; if (btn) btn.textContent = 'カット検出'; S.cur = -1; CL.requestFrame(S.want || 0); }
  }
  function recomputeCuts() { if (!S.cutDists) return; const sens = +($('cutSens') ? $('cutSens').value : 0.5); S.cuts = detectCuts(S.cutDists, sens); if (S.onMetaChanged) S.onMetaChanged(); drawTimeline(); }

  // ---- タイムライン描画 ----
  const owner = (f) => { if (S.savedFrames && S.savedFrames.has(f)) return 2; const d = S.frames.get(f); if (!d) return 0; return CL.owned(f) ? 2 : (d.lines.size ? 1 : 0); };
  function drawTimeline() {
    const cv = $('tlCanvas'); if (!cv || !S.total) return;
    const cont = $('timeline'); if (cont && cont.hidden) cont.hidden = false;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 26;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const xOf = (f) => (S.total <= 1 ? 0 : (f / (S.total - 1)) * (W - 1));
    // シーン交互塗り
    const bounds = [0, ...(S.cuts || []), S.total];
    for (let i = 0; i < bounds.length - 1; i++) { g.fillStyle = (i % 2 === 0) ? 'rgba(90,130,200,.10)' : 'rgba(90,130,200,.20)'; const x0 = xOf(bounds[i]), x1 = xOf(Math.min(S.total - 1, bounds[i + 1])); g.fillRect(x0, 0, Math.max(1, x1 - x0), H); }
    // 所有/借用ティック
    const seen = new Set();
    const tick = (f) => { const o = owner(f); if (!o || seen.has(f)) return; seen.add(f); const x = xOf(f); g.strokeStyle = o === 2 ? 'rgba(120,220,140,.95)' : 'rgba(120,220,140,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(x) + 0.5, H - 9); g.lineTo(Math.round(x) + 0.5, H - 1); g.stroke(); };
    if (S.savedFrames) for (const f of S.savedFrames.keys()) tick(f);
    for (const f of S.frames.keys()) tick(f);
    // カット線
    g.strokeStyle = 'rgba(255,120,90,.9)'; g.lineWidth = 1;
    for (const c of (S.cuts || [])) { const x = Math.round(xOf(c)) + 0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    // 再生ヘッド
    if (S.cur >= 0) { const x = Math.round(xOf(S.cur)) + 0.5; g.strokeStyle = '#ffd34d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  }
  function seekFromEvent(e) { const cv = $('tlCanvas'); const r = cv.getBoundingClientRect(); const x = e.clientX - r.left; const f = Math.round((x / Math.max(1, r.width)) * (S.total - 1)); CL.requestFrame(f); }

  // シーン頭/次シーンへ。Shift+→ は「次のシーンの最初のフレーム」、Shift+← は「現在(or前)シーンの先頭」。
  function sceneJump(dir) {
    const target = sceneTarget(S.cuts, S.cur < 0 ? 0 : S.cur, dir);
    if (target == null) { CL.toast(dir > 0 ? '最後のシーンです（カット未検出ならタイムライン右クリックで追加）' : '最初のシーンです'); return; }
    CL.requestFrame(target);
  }

  // ---- 配線 ----
  if ($('analyzeCuts')) $('analyzeCuts').addEventListener('click', () => { if (analyzing) { cancelFlag = true; } else runAnalyze(); });
  if ($('cutSens')) $('cutSens').addEventListener('change', recomputeCuts);
  const cv = $('tlCanvas');
  if (cv) {
    let dragging = false;
    cv.addEventListener('pointerdown', (e) => { if (e.button === 2) { toggleCutAt(e); return; } dragging = true; cv.setPointerCapture(e.pointerId); seekFromEvent(e); });
    cv.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
    cv.addEventListener('pointerup', () => { dragging = false; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  // 右クリックでカット手動トグル
  function toggleCutAt(e) {
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left;
    const f = Math.round((x / Math.max(1, r.width)) * (S.total - 1));
    S.cuts = S.cuts || [];
    let near = -1, best = 1e9; for (let i = 0; i < S.cuts.length; i++) { const d = Math.abs(S.cuts[i] - f); if (d < best) { best = d; near = i; } }
    const tolF = Math.max(2, Math.round(S.total * 0.01));
    if (near >= 0 && best <= tolF) S.cuts.splice(near, 1); else { S.cuts.push(f); S.cuts.sort((a, b) => a - b); }
    if (S.onMetaChanged) S.onMetaChanged(); drawTimeline(); CL.toast(best <= tolF ? 'カット削除' : 'カット追加');
  }

  S.onTimelineRefresh = drawTimeline; // contour-lab の render/nav から呼ぶフック
  S.onSceneJump = sceneJump;
  window.addEventListener('resize', () => drawTimeline());
  window.CLTimeline = { analyzeCuts, runAnalyze, detectCuts, drawTimeline, sceneJump, recomputeCuts };
})(typeof self !== 'undefined' ? self : this);
