'use strict';
/* move.js — マスク移動ツール (M)：選択色のマスク（線）を現フレーム内で平行移動する。
   操作: ドラッグ＝大まかに移動（半透明ゴーストでプレビュー、離すと反映）／
         矢印キー＝1px微調整（Shift=10px。ツールが有効な間だけ乗っ取り、抜ければ従来のフレーム移動）／
         Enter・ツール切替＝確定（1 Undo）／Esc・（未確定中の）Ctrl+Z＝取消。
   実装: ツール選択時に基準コピー(base)を取り、移動は常に base からの一括シフト＝端で往復しても
   画素が欠けない（確定時に画面外へ出た分だけ消える）。確定まで undo 履歴を汚さず、
   未確定の生変更も S.onFrameChanged で自動保存に通知して保存内容と実データを常に一致させる。 */
(function (window) {
  // 線ビットマップを (dx,dy) だけ平行移動した新しい配列を返す（画面外は切り捨て）。純関数。
  function shiftLines(src, W, H, dx, dy) {
    const out = new Uint8Array(W * H);
    const x0 = Math.max(0, dx), x1 = Math.min(W, W + dx);
    for (let y = 0; y < H; y++) {
      const sy = y - dy; if (sy < 0 || sy >= H) continue;
      const dRow = y * W, sRow = sy * W;
      for (let x = x0; x < x1; x++) out[dRow + x] = src[sRow + x - dx];
    }
    return out;
  }

  const API = { shiftLines };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  if (!window.CL) return;

  /* ============ ハンドラ ============ */
  const CL = window.CL, S = CL.S, $ = (id) => document.getElementById(id);
  let mv = null; // {frame, lid, base, off:[x,y], ghost, dragging, dragStart, dragStartOff}

  function capture() {
    const lid = S.activeLid, cd = S.frames.get(S.cur), lines = cd && cd.lines.get(lid);
    if (!lines) { CL.toast('この色に線がありません'); mv = null; return false; }
    const base = Uint8Array.from(lines);
    const lay = S.layers.find((l) => l.id === lid), c = (lay && lay.color) || [255, 211, 77];
    const ghost = document.createElement('canvas'); ghost.width = S.W; ghost.height = S.H;
    const g = ghost.getContext('2d'), im = g.createImageData(S.W, S.H);
    for (let i = 0; i < base.length; i++) if (base[i]) { const j = i * 4; im.data[j] = c[0]; im.data[j + 1] = c[1]; im.data[j + 2] = c[2]; im.data[j + 3] = 255; }
    g.putImageData(im, 0, 0);
    mv = { frame: S.cur, lid, base, off: [0, 0], ghost, dragging: false };
    return true;
  }
  // フレーム/選択色が変わっていたら前の移動を確定してから取り直す
  function ensureCurrent() {
    if (mv && mv.frame === S.cur && mv.lid === S.activeLid) return true;
    commitMove(true);
    return capture();
  }
  const fmtOff = () => (mv.off[0] >= 0 ? '+' : '') + mv.off[0] + ', ' + (mv.off[1] >= 0 ? '+' : '') + mv.off[1];
  function applyOff() {
    const arr = CL.writableLines(mv.frame, mv.lid);
    arr.set(shiftLines(mv.base, S.W, S.H, mv.off[0], mv.off[1]));
    CL.fdata(mv.frame).fill.set(mv.lid, CL.newFill(arr));
    if (S.onFrameChanged) S.onFrameChanged(mv.frame); // 未確定でも自動保存と実データを一致させる
    S.maskDirty = true; CL.render();
  }
  function commitMove(toastIt) {
    if (!mv) return;
    const moved = mv.off[0] || mv.off[1];
    if (moved && S.layers.some((l) => l.id === mv.lid)) {
      const arr = CL.writableLines(mv.frame, mv.lid); // 既にシフト適用済み
      const changed = new Map();
      for (let i = 0; i < arr.length; i++) { if ((mv.base[i] ? 1 : 0) !== (arr[i] ? 1 : 0)) changed.set(i, mv.base[i]); }
      if (changed.size) {
        CL.commitChanges(mv.frame, mv.lid, changed); CL.updateUndoButtons();
        if (toastIt) CL.toast('マスク移動を確定しました（' + fmtOff() + '。Ctrl+Zで戻せます）');
      }
    }
    mv = null; // 次の操作で再キャプチャ＝確定後が新しい基準になる
  }
  function cancelMove() {
    if (!mv) return;
    if ((mv.off[0] || mv.off[1]) && S.layers.some((l) => l.id === mv.lid)) {
      const arr = CL.writableLines(mv.frame, mv.lid);
      arr.set(mv.base);
      CL.fdata(mv.frame).fill.set(mv.lid, CL.newFill(arr));
      if (S.onFrameChanged) S.onFrameChanged(mv.frame);
      S.maskDirty = true; CL.render();
    }
    mv = null; CL.toast('マスク移動を取り消しました');
  }
  function nudge(dx, dy) {
    if (!ensureCurrent()) return;
    mv.off[0] += dx; mv.off[1] += dy;
    applyOff();
    CL.toast('マスク移動中 (' + fmtOff() + ') — Enterかツール切替で確定・Escで取消');
  }

  // 矢印キーの乗っ取りは capture 段＝本体のフレーム移動リスナーより先に受けて止める。
  // ツールが movemask の間だけ。Ctrl+Z は未確定の移動があるときだけ「取消」として奪う。
  window.addEventListener('keydown', (e) => {
    if (S.tool !== 'movemask') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const pending = mv && (mv.off[0] || mv.off[1]);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (pending) { e.preventDefault(); e.stopImmediatePropagation(); cancelMove(); }
      return; // 未確定が無ければ通常の Undo に流す
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const st = e.shiftKey ? 10 : 1;
    const d = e.key === 'ArrowLeft' ? [-st, 0] : e.key === 'ArrowRight' ? [st, 0] : e.key === 'ArrowUp' ? [0, -st] : e.key === 'ArrowDown' ? [0, st] : null;
    if (d) { e.preventDefault(); e.stopImmediatePropagation(); nudge(d[0], d[1]); return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); commitMove(true); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cancelMove(); return; }
  }, true);

  // ドラッグで大まかに移動（掴んでいる間はゴースト表示、離すと反映。確定は Enter/ツール切替）
  const prevOnToolDown = S.onToolDown;
  S.onToolDown = function (e, px, py, wx, wy) {
    if (S.tool === 'movemask') {
      if (!ensureCurrent()) return;
      mv.dragging = true; mv.dragStart = [px, py]; mv.dragStartOff = [mv.off[0], mv.off[1]];
      CL.render(); return;
    }
    if (prevOnToolDown) prevOnToolDown(e, px, py, wx, wy);
  };
  CL.dom.view.addEventListener('pointermove', (e) => {
    if (S.tool !== 'movemask' || !mv || !mv.dragging) return;
    const [px, py] = CL.eventToPixel(e);
    mv.off[0] = mv.dragStartOff[0] + (px - mv.dragStart[0]);
    mv.off[1] = mv.dragStartOff[1] + (py - mv.dragStart[1]);
    CL.scheduleRender();
  });
  window.addEventListener('pointerup', () => {
    if (S.tool !== 'movemask' || !mv || !mv.dragging) return;
    mv.dragging = false; applyOff();
    CL.toast('マスク移動中 (' + fmtOff() + ') — Enterかツール切替で確定・Escで取消');
  });
  const prevAfter = S.onAfterSource;
  S.onAfterSource = function (ctx, v) {
    if (prevAfter) prevAfter(ctx, v);
    if (S.tool !== 'movemask' || !mv || !mv.dragging) return;
    const sm0 = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.55; ctx.drawImage(mv.ghost, mv.off[0], mv.off[1]); ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = sm0;
  };
  // ツールを離れるとき＝確定。ボタンの active とカーソルも更新。
  const prevOnToolChange = S.onToolChange;
  S.onToolChange = function (t) {
    if (t !== 'movemask') commitMove(true);
    const b = $('toolMoveMask'); if (b) b.classList.toggle('active', t === 'movemask');
    CL.dom.view.style.cursor = t === 'movemask' ? 'move' : '';
    if (prevOnToolChange) prevOnToolChange(t);
  };
  const prevOVL = S.onVideoLoaded;
  S.onVideoLoaded = function (file) { mv = null; return prevOVL ? prevOVL(file) : undefined; };

  if ($('toolMoveMask')) $('toolMoveMask').addEventListener('click', () => { CL.setTool('movemask'); CL.toast('マスク移動: ドラッグ or 矢印キー（Shift=10px）→ Enterかツール切替で確定・Escで取消'); });
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'm') { CL.setTool('movemask'); CL.toast('マスク移動: ドラッグ or 矢印キー（Shift=10px）→ Enterかツール切替で確定・Escで取消'); }
  });

  window.CLMove = { commitMove, cancelMove, nudge, _mv: () => mv };
})(typeof self !== 'undefined' ? self : this);
