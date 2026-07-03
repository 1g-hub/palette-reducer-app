'use strict';
/* storage.js (P1-2) — IndexedDB 自動保存 + プロジェクト JSON 入出力 + 保存済みフレームの遅延復元。
   contour-lab.js の保存フック（S.onVideoLoaded/onFrameEnter/onFrameChanged/onMetaChanged）に接続する。
   マスクは所有(owned)フレームのみ RLE で保存。fill/Undo/carry は保存しない（復元後にナビゲーションで再導出）。
   注: IndexedDB は file:// 直開き(不透明オリジン)では使えない。ローカルHTTPサーバか本番(https)で動作する。 */
(() => {
  if (!window.CL) return;
  const CL = window.CL, S = CL.S, CLab = window.ContourLab;
  const $ = (id) => document.getElementById(id);
  if (!S.cuts) S.cuts = [];

  const DB_NAME = 'contour-lab', DB_VER = 1;
  let dbp = null, dbBroken = false;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let rq; try { rq = indexedDB.open(DB_NAME, DB_VER); } catch (e) { rej(e); return; }
      rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'sig' }); if (!d.objectStoreNames.contains('frames')) d.createObjectStore('frames', { keyPath: ['sig', 'f'] }); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    dbp.catch(() => { dbBroken = true; });
    return dbp;
  }
  const store = (name, mode) => db().then((d) => d.transaction(name, mode).objectStore(name));
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const txDone = (st) => { const t = st.transaction; return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  const rangeFor = (sig) => IDBKeyRange.bound([sig, 0], [sig, Number.MAX_SAFE_INTEGER]);
  const sigOf = (file, duration) => file.name + '|' + file.size + '|' + (duration || 0).toFixed(3);

  // ---- 保存ステータス ----
  function setStatus(msg, kind) { const el = $('saveStatus'); if (el) { el.textContent = msg; el.className = 'muted small' + (kind ? ' ' + kind : ''); } }
  function savedNow() { const d = new Date(), p = (n) => (n < 10 ? '0' : '') + n; setStatus('保存済み ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())); }

  // ---- owned フレーム → RLE レコード {lid: Int32Array} ----
  function frameRLE(f) {
    const d = S.frames.get(f); if (!d) return null;
    const rec = {}; let any = false;
    for (const [lid, arr] of d.lines) { if (d.sharedLids.has(lid)) continue; const runs = CLab.rleFromBitmap(arr); if (runs.length) { rec[lid] = runs; any = true; } }
    return any ? rec : null;
  }
  function buildMeta() {
    return { sig: S.sig, name: S.file ? S.file.name : '', W: S.W, H: S.H, fps: S.fps, total: S.total,
      layers: S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color.slice(), visible: l.visible, opacity: l.opacity })),
      nextLid: S.nextLid, activeLid: S.activeLid, cuts: (S.cuts || []).slice(), savedAt: Date.now() };
  }

  // ---- 自動保存（デバウンス 800ms） ----
  const dirtyFrames = new Set(); let frameTimer = null, metaTimer = null;
  async function flushFrames() {
    frameTimer = null; if (!S.sig || dbBroken) { dirtyFrames.clear(); return; }
    const sig = S.sig, list = [...dirtyFrames]; dirtyFrames.clear();
    try {
      const st = await store('frames', 'readwrite');
      for (const f of list) { const rec = frameRLE(f); if (rec) { st.put({ sig, f, lines: rec }); if (S.savedFrames) S.savedFrames.set(f, rec); } else { st.delete([sig, f]); if (S.savedFrames) S.savedFrames.delete(f); } }
      await txDone(st); savedNow();
    } catch (e) { setStatus('保存エラー: ' + e.message, 'danger'); }
  }
  async function flushMeta() {
    metaTimer = null; if (!S.sig || dbBroken) return;
    try { const st = await store('meta', 'readwrite'); st.put(buildMeta()); await txDone(st); savedNow(); } catch (e) { setStatus('保存エラー: ' + e.message, 'danger'); }
  }
  S.onFrameChanged = (f) => { dirtyFrames.add(f); setStatus('保存中…'); if (frameTimer) clearTimeout(frameTimer); frameTimer = setTimeout(flushFrames, 800); };
  S.onMetaChanged = () => { setStatus('保存中…'); if (metaTimer) clearTimeout(metaTimer); metaTimer = setTimeout(flushMeta, 800); };

  // ---- 遅延復元: 保存済みフレームを初訪時にデコード（carry より優先） ----
  S.onFrameEnter = (f) => {
    if (!S.savedFrames || !S.savedFrames.has(f)) return;
    const d = CL.fdata(f); if (d.lines.size) return; // 既に in-memory
    const rec = S.savedFrames.get(f), N = S.W * S.H, valid = new Set(S.layers.map((l) => l.id));
    for (const k in rec) { const lid = +k; if (valid.has(lid)) d.lines.set(lid, CLab.bitmapFromRle(rec[k], N)); } // 削除済みレイヤの残骸は無視
    d.sharedLids = new Set();
  };

  // ---- 動画読込時の復元 ----
  S.onVideoLoaded = async (file) => {
    const sig = sigOf(file, S.duration); S.sig = sig; S.savedFrames = new Map();
    let meta = null;
    try { const st = await store('meta', 'readonly'); meta = await req(st.get(sig)); } catch (e) { dbBroken = true; setStatus('保存は使えません（このオリジンではIndexedDB不可）', 'danger'); }
    if (meta) {
      applyMetaToState(meta);
      try { const st = await store('frames', 'readonly'); const rows = await req(st.getAll(rangeFor(sig))); for (const row of rows) S.savedFrames.set(row.f, row.lines); } catch (e) {}
      CL.renderLayers(); CL.toast('前回の作業を復元しました（' + S.savedFrames.size + 'フレーム）'); setStatus('復元しました');
    } else if (!dbBroken) { setStatus('新規プロジェクト'); }
    await refreshProjectList();
  };
  function applyMetaToState(meta) {
    if (meta.layers && meta.layers.length) {
      S.layers = meta.layers.map((l) => ({ id: l.id, name: l.name || '', color: l.color.slice(), visible: l.visible !== false, opacity: l.opacity == null ? 1 : l.opacity }));
      S.nextLid = meta.nextLid || (Math.max(0, ...S.layers.map((l) => l.id)) + 1);
      S.activeLid = meta.activeLid && S.layers.some((l) => l.id === meta.activeLid) ? meta.activeLid : S.layers[0].id;
    }
    S.cuts = (meta.cuts || []).slice();
    if (meta.fps > 0) { S.fps = meta.fps; S.total = Math.max(1, Math.round(S.duration * S.fps)); const fi = $('fpsInput'); if (fi) fi.value = (+S.fps.toFixed(3)).toString(); }
  }

  // ---- プロジェクト一覧 ----
  async function refreshProjectList() {
    const el = $('projectList'); if (!el) return;
    let metas = [];
    try { const st = await store('meta', 'readonly'); metas = await req(st.getAll()); } catch (e) { el.textContent = ''; return; }
    metas.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    el.innerHTML = '';
    if (!metas.length) { el.textContent = '（保存済みプロジェクトなし）'; return; }
    for (const m of metas) {
      const row = document.createElement('div'); row.className = 'projrow';
      const cur = m.sig === S.sig;
      const nm = document.createElement('span'); nm.className = 'projname' + (cur ? ' cur' : ''); nm.textContent = (cur ? '● ' : '') + (m.name || '(無題)') + ' (' + (m.total || '?') + 'f)';
      const del = document.createElement('button'); del.className = 'btn xs danger'; del.textContent = '削除';
      del.addEventListener('click', async () => { if (confirm('この保存を削除しますか？')) { await deleteProject(m.sig); await refreshProjectList(); } });
      row.append(nm, del); el.appendChild(row);
    }
  }
  async function deleteProject(sig) {
    try { const ms = await store('meta', 'readwrite'); ms.delete(sig); await txDone(ms); const fsx = await store('frames', 'readwrite'); fsx.delete(rangeFor(sig)); await txDone(fsx); if (sig === S.sig) S.savedFrames = new Map(); } catch (e) { setStatus('削除エラー: ' + e.message, 'danger'); }
  }

  // ---- プロジェクト JSON（in-memory 所有フレーム ∪ savedFrames、in-memory 優先） ----
  function buildProjectObject() {
    const frames = {};
    if (S.savedFrames) for (const [f, rec] of S.savedFrames) { const o = {}; for (const lid in rec) o[lid] = Array.from(rec[lid]); frames[f] = o; }
    for (const f of S.frames.keys()) { const rec = frameRLE(f); if (rec) { const o = {}; for (const lid in rec) o[lid] = Array.from(rec[lid]); frames[f] = o; } else delete frames[f]; }
    return { format: 'contour-lab-project', version: 1,
      video: { sig: S.sig, name: S.file ? S.file.name : '', W: S.W, H: S.H, fps: S.fps, total: S.total },
      layers: S.layers.map((l) => ({ id: l.id, name: l.name, color: l.color.slice(), visible: l.visible, opacity: l.opacity })),
      nextLid: S.nextLid, activeLid: S.activeLid, cuts: (S.cuts || []).slice(), frames };
  }
  function applyProjectObject(obj) {
    if (!obj || obj.format !== 'contour-lab-project') { CL.toast('対応していないファイル形式'); return false; }
    if (!S.W) { CL.toast('先に動画を読み込んでください'); return false; }
    if (obj.layers && obj.layers.length) { S.layers = obj.layers.map((l) => ({ id: l.id, name: l.name || '', color: l.color.slice(), visible: l.visible !== false, opacity: l.opacity == null ? 1 : l.opacity })); S.nextLid = obj.nextLid || (Math.max(0, ...S.layers.map((l) => l.id)) + 1); S.activeLid = S.layers[0].id; }
    S.cuts = (obj.cuts || []).slice();
    S.savedFrames = new Map(); let n = 0, dropped = 0;
    const frames = obj.frames || {};
    for (const fk in frames) { const f = +fk; if (f >= S.total) { dropped++; continue; } const rec = {}, src = frames[fk]; for (const lid in src) rec[+lid] = Int32Array.from(src[lid]); S.savedFrames.set(f, rec); n++; }
    S.frames.clear(); S.undo.clear(); S.redo.clear(); S.fillLRU = [];
    CL.renderLayers(); S.cur = -1; CL.requestFrame(Math.min(S.want || 0, Math.max(0, S.total - 1)));
    persistAllSaved(); if (S.onMetaChanged) S.onMetaChanged();
    CL.toast('プロジェクトを読み込みました（' + n + 'フレーム' + (dropped ? '、' + dropped + '枚は範囲外' : '') + '）');
    refreshProjectList();
    return true;
  }
  async function persistAllSaved() {
    if (!S.sig || dbBroken || !S.savedFrames) return;
    try { const st = await store('frames', 'readwrite'); st.delete(rangeFor(S.sig)); for (const [f, rec] of S.savedFrames) st.put({ sig: S.sig, f, lines: rec }); await txDone(st); savedNow(); } catch (e) { setStatus('保存エラー: ' + e.message, 'danger'); }
  }
  function exportProjectJSON() {
    if (!S.sig) { CL.toast('動画が読み込まれていません'); return; }
    const blob = new Blob([JSON.stringify(buildProjectObject())], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'project') + '.contourlab.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function importProjectJSON(file) { let obj; try { obj = JSON.parse(await file.text()); } catch (e) { CL.toast('JSONの解析に失敗'); return; } applyProjectObject(obj); }

  // ---- UI 配線 ----
  if ($('exportProject')) $('exportProject').addEventListener('click', exportProjectJSON);
  const ie = $('importProject'); if (ie) ie.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importProjectJSON(f); ie.value = ''; });
  refreshProjectList();

  // テスト用に内部を公開（DL/ファイル選択を介さず往復検証できるように）
  window.CLStore = { sigOf, buildProjectObject, applyProjectObject, frameRLE, flushFrames, flushMeta, refreshProjectList, get dbBroken() { return dbBroken; } };
})();
