"use strict";

const APP_VERSION = "20260617-1";

const $ = (id) => document.getElementById(id);
const dom = {
  // header / rail
  videoCountBadge: $("videoCountBadge"),
  rail: $("rail"),
  // steps
  step1: $("step1"), step2: $("step2"), analyzing: $("analyzing"), step3: $("step3"), step4: $("step4"),
  // step1
  dropzone: $("dropzone"), fileInput: $("fileInput"),
  step1Added: $("step1Added"), addedCount: $("addedCount"), clearAllBtn: $("clearAllBtn"),
  step1List: $("step1List"), toStep2Btn: $("toStep2Btn"),
  // step2
  backToStep1: $("backToStep1"), step2Desc: $("step2Desc"),
  presetSeg: $("presetSeg"), analyzeBtn: $("analyzeBtn"), analyzeBtnLabel: $("analyzeBtnLabel"),
  advancedToggle: $("advancedToggle"), advancedCaret: $("advancedCaret"), advancedBody: $("advancedBody"),
  thresholdSeg: $("thresholdSeg"), fixedField: $("fixedField"), resetAdvancedBtn: $("resetAdvancedBtn"),
  // analyzing
  analyzingDesc: $("analyzingDesc"), analyzingList: $("analyzingList"),
  elapsedText: $("elapsedText"), stopAnalyzeBtn: $("stopAnalyzeBtn"),
  reassure: $("reassure"), transcodeNote: $("transcodeNote"), transcodeText: $("transcodeText"),
  // step3
  backToStep2: $("backToStep2"), playBtn: $("playBtn"), step3Tabs: $("step3Tabs"), activeName: $("activeName"),
  cvOrig: $("cvOrig"), cvReduced: $("cvReduced"), cvMask: $("cvMask"),
  vConfirm: $("vConfirm"), sConfirm: $("sConfirm"),
  paletteCount: $("paletteCount"), palette: $("palette"), cvPlot: $("cvPlot"),
  detailsToggle: $("detailsToggle"), detailsCaret: $("detailsCaret"), detailsBody: $("detailsBody"),
  metrics: $("metrics"), ktableBody: $("ktableBody"), toStep4Btn: $("toStep4Btn"),
  // step4
  backToStep3: $("backToStep3"), selCountText: $("selCountText"),
  selectAllBtn: $("selectAllBtn"), deselectAllBtn: $("deselectAllBtn"), step4List: $("step4List"),
  exportBtn: $("exportBtn"), exportingText: $("exportingText"),
  exportedBox: $("exportedBox"), exportedText: $("exportedText"), restartBtn: $("restartBtn"),
  // toast / work
  toast: $("toast"),
  workVideo: $("workVideo"), exportCanvas: $("exportCanvas"),
  // sliders
  sAna: $("sAna"), sPrev: $("sPrev"), sMaxc: $("sMaxc"), sMindist: $("sMindist"),
  sMink: $("sMink"), sMaxk: $("sMaxk"), sFixed: $("sFixed"), sMargin: $("sMargin"),
  vAna: $("vAna"), vPrev: $("vPrev"), vMaxc: $("vMaxc"), vMindist: $("vMindist"),
  vMink: $("vMink"), vMaxk: $("vMaxk"), vFixed: $("vFixed"), vMargin: $("vMargin"),
};

const DEFAULT_VALS = { ana: 540, prev: 360, maxc: 800, mindist: 12, mink: 4, maxk: 40, fixed: 60, margin: 5 };
const PRESETS = {
  recommend: { ana: 540, prev: 360, maxc: 800, mindist: 12 },
  hq: { ana: 720, prev: 540, maxc: 1500, mindist: 8 },
  light: { ana: 400, prev: 240, maxc: 400, mindist: 20 },
};

const state = {
  step: 1,
  videos: [],
  activeIdx: 0,
  preset: "recommend",
  advanced: false,
  detailsOpen: false,
  thresholdMode: "auto",
  analyzing: false,
  analyzeStartedAt: 0,
  elapsedTimer: null,
  reassure: false,
  exporting: false,
  exported: false,
  playing: false,
  cancelled: false,
  vals: { ...DEFAULT_VALS },
  activeWorker: null,
  currentReject: null,
  activeRecorder: null,
  ffmpeg: null,
  ffmpegLoaded: false,
  transcoding: false,
  rafPreview: null,
  rafPlot: null,
  plotBound: false,
  plotRot: { yaw: 0.6, pitch: -0.45 },
  plotDragging: false,
  plotLast: { x: 0, y: 0 },
  toastTimer: null,
  vid: 0,
};

/* ============================ init / events ============================ */

function init() {
  // step nav
  dom.dropzone.addEventListener("click", () => dom.fileInput.click());
  dom.dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dom.dropzone.classList.add("drag"); });
  dom.dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); dom.dropzone.classList.remove("drag"); });
  dom.dropzone.addEventListener("drop", onDrop);
  dom.fileInput.addEventListener("change", () => { addFiles(dom.fileInput.files); dom.fileInput.value = ""; });
  dom.clearAllBtn.addEventListener("click", clearVideos);
  dom.step1List.addEventListener("click", onListClick);
  dom.toStep2Btn.addEventListener("click", () => goStep(2));

  dom.backToStep1.addEventListener("click", () => goStep(1));
  dom.presetSeg.addEventListener("click", onPresetClick);
  dom.analyzeBtn.addEventListener("click", analyzeAll);
  dom.advancedToggle.addEventListener("click", () => { state.advanced = !state.advanced; syncAdvanced(); });
  dom.thresholdSeg.addEventListener("click", onThresholdModeClick);
  dom.resetAdvancedBtn.addEventListener("click", resetAdvanced);
  bindSlider(dom.sAna, dom.vAna, "ana");
  bindSlider(dom.sPrev, dom.vPrev, "prev");
  bindSlider(dom.sMaxc, dom.vMaxc, "maxc");
  bindSlider(dom.sMindist, dom.vMindist, "mindist");
  bindSlider(dom.sMink, dom.vMink, "mink");
  bindSlider(dom.sMaxk, dom.vMaxk, "maxk");
  bindSlider(dom.sFixed, dom.vFixed, "fixed");
  bindSlider(dom.sMargin, dom.vMargin, "margin");

  dom.stopAnalyzeBtn.addEventListener("click", stopAnalyze);

  dom.backToStep2.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(2); });
  dom.playBtn.addEventListener("click", togglePlay);
  dom.step3Tabs.addEventListener("click", onTabClick);
  dom.sConfirm.addEventListener("input", (e) => setConfirmThreshold(+e.target.value));
  dom.palette.addEventListener("click", onPaletteClick);
  dom.detailsToggle.addEventListener("click", () => { state.detailsOpen = !state.detailsOpen; syncDetails(); });
  dom.toStep4Btn.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(4); });

  dom.backToStep3.addEventListener("click", () => goStep(3));
  dom.selectAllBtn.addEventListener("click", () => setAllSave(true));
  dom.deselectAllBtn.addEventListener("click", () => setAllSave(false));
  dom.step4List.addEventListener("click", onSaveListClick);
  dom.exportBtn.addEventListener("click", exportSelected);
  dom.restartBtn.addEventListener("click", restart);

  attachPlot();
  render();

  if (window.location.protocol === "file:") {
    showToast("error", "HTTPサーバー（GitHub Pages等）で開いてください。file:// では解析が動きません。");
  }
}

function bindSlider(slider, label, key) {
  slider.addEventListener("input", () => {
    state.vals[key] = Number(slider.value);
    label.textContent = slider.value;
  });
}

/* ============================ video model ============================ */

function makeVideo(file) {
  state.vid += 1;
  const objectUrl = URL.createObjectURL(file);
  return {
    id: "v" + state.vid,
    file,
    name: file.name,
    url: objectUrl,
    objectUrl,
    transcoded: false,
    sizeText: formatBytes(file.size),
    dimsText: "—",
    durText: "—",
    videoWidth: 0, videoHeight: 0, duration: 0,
    thumb: null,
    analysis: null,
    confirmThreshold: 47,
    processedCache: new Map(),
    maskCache: new Map(),
    status: "pending",
    progress: 0,
    error: null,
    save: true,
    exportProgress: 0,
    exportDone: false,
    exportUrl: null,
    exportName: "",
    exportSize: 0,
  };
}

function addFiles(fileList) {
  const files = [...(fileList || [])].filter((f) => /video\//.test(f.type) || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(f.name));
  if (!files.length) {
    showToast("error", "動画ファイルが見つかりませんでした。");
    return;
  }
  files.forEach((f) => state.videos.push(makeVideo(f)));
  state.exported = false;
  render();
}

function onDrop(e) {
  e.preventDefault();
  dom.dropzone.classList.remove("drag");
  const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
  addFiles(files);
}

function removeVideo(id) {
  const idx = state.videos.findIndex((v) => v.id === id);
  if (idx < 0) return;
  releaseVideo(state.videos[idx]);
  state.videos.splice(idx, 1);
  if (state.activeIdx >= state.videos.length) state.activeIdx = Math.max(0, state.videos.length - 1);
  render();
}

function clearVideos() {
  state.videos.forEach(releaseVideo);
  state.videos = [];
  state.activeIdx = 0;
  state.exported = false;
  render();
}

function releaseVideo(v) {
  if (v.objectUrl) URL.revokeObjectURL(v.objectUrl);
  if (v.transcoded && v.url && v.url !== v.objectUrl) URL.revokeObjectURL(v.url);
  if (v.exportUrl) URL.revokeObjectURL(v.exportUrl);
}

const hasVideos = () => state.videos.length > 0;
const analyzedAny = () => state.videos.some((v) => v.status === "done");
const doneVideos = () => state.videos.filter((v) => v.status === "done");
const activeVideo = () => state.videos[state.activeIdx];

/* ============================ navigation / render ============================ */

function goStep(n) {
  state.step = n;
  render();
  if (n === 3) {
    const v = activeVideo();
    if (!v || v.status !== "done") {
      const first = state.videos.findIndex((x) => x.status === "done");
      if (first >= 0) state.activeIdx = first;
    }
    loadActiveIntoPreview();
    startPlot();
  }
}

function render() {
  show(dom.step1, state.step === 1);
  show(dom.step2, state.step === 2 && !state.analyzing);
  show(dom.analyzing, state.analyzing);
  show(dom.step3, state.step === 3 && !state.analyzing);
  show(dom.step4, state.step === 4);

  renderRail();

  if (state.videos.length) {
    dom.videoCountBadge.hidden = false;
    dom.videoCountBadge.textContent = `📁 ${state.videos.length} 件の動画`;
  } else {
    dom.videoCountBadge.hidden = true;
  }

  if (state.step === 1) renderStep1();
  if (state.step === 2 && !state.analyzing) renderStep2();
  if (state.analyzing) renderAnalyzingList();
  if (state.step === 3 && !state.analyzing) renderStep3Dynamic();
  if (state.step === 4) renderStep4();
}

function show(el, on) { el.hidden = !on; }

function renderRail() {
  const an = state.analyzing;
  const done = analyzedAny();
  const s1 = hasVideos() ? "done" : "active";
  const s2 = an ? "progress" : done ? "done" : (state.step === 2 ? "active" : hasVideos() ? "ready" : "todo");
  const s3 = (done && state.step >= 4) ? "done" : (state.step === 3 ? "active" : done ? "ready" : "todo");
  const s4 = state.exported ? "done" : state.exporting ? "progress" : (state.step === 4 ? "active" : done ? "ready" : "todo");
  const states = { 1: s1, 2: s2, 3: s3, 4: s4 };
  dom.rail.querySelectorAll(".rail-item").forEach((el) => {
    const st = states[el.getAttribute("data-step")];
    if (st === "todo") el.removeAttribute("data-state");
    else el.setAttribute("data-state", st);
    const subs = { todo: "未着手", ready: "準備OK", active: "選択中", progress: "処理中…", done: "完了" };
    el.querySelector(".rail-sub").textContent = subs[st];
  });
}

/* ---------- step1 ---------- */
function renderStep1() {
  const has = hasVideos();
  dom.step1Added.hidden = !has;
  if (!has) return;
  dom.addedCount.textContent = `追加した動画（${state.videos.length}件）`;
  dom.step1List.innerHTML = state.videos.map((v) => `
    <div class="video-card">
      ${thumbHtml(v, "thumb")}
      <div class="vc-info">
        <div class="vc-name">${esc(v.name)}</div>
        <div class="vc-meta"><span>${v.sizeText}</span><span>${v.dimsText}</span><span>${v.durText}</span></div>
      </div>
      <button class="vc-remove" data-act="remove" data-id="${v.id}" type="button">×</button>
    </div>`).join("");
}

function onListClick(e) {
  const btn = e.target.closest("[data-act]");
  if (btn && btn.dataset.act === "remove") removeVideo(btn.dataset.id);
}

/* ---------- step2 ---------- */
function renderStep2() {
  dom.step2Desc.textContent = `${state.videos.length}件すべてに同じ設定を適用します。細かく調整したいときは「詳細設定」を開いてください。`;
  dom.analyzeBtnLabel.textContent = `${state.videos.length}件の色を分析する`;
  dom.presetSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
  syncSliders();
  syncAdvanced();
  syncThresholdMode();
}

function onPresetClick(e) {
  const btn = e.target.closest("[data-preset]");
  if (!btn) return;
  state.preset = btn.dataset.preset;
  Object.assign(state.vals, PRESETS[state.preset]);
  syncSliders();
  dom.presetSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
}

function syncSliders() {
  const map = [
    [dom.sAna, dom.vAna, "ana"], [dom.sPrev, dom.vPrev, "prev"], [dom.sMaxc, dom.vMaxc, "maxc"],
    [dom.sMindist, dom.vMindist, "mindist"], [dom.sMink, dom.vMink, "mink"], [dom.sMaxk, dom.vMaxk, "maxk"],
    [dom.sFixed, dom.vFixed, "fixed"], [dom.sMargin, dom.vMargin, "margin"],
  ];
  map.forEach(([s, l, k]) => { s.value = state.vals[k]; l.textContent = state.vals[k]; });
}

function syncAdvanced() {
  dom.advancedBody.hidden = !state.advanced;
  dom.advancedCaret.textContent = state.advanced ? "閉じる ▲" : "開く ▼";
}

function onThresholdModeClick(e) {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;
  state.thresholdMode = btn.dataset.mode;
  syncThresholdMode();
}

function syncThresholdMode() {
  dom.thresholdSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.thresholdMode));
  dom.fixedField.hidden = state.thresholdMode !== "manual";
}

function resetAdvanced() {
  state.vals = { ...DEFAULT_VALS };
  state.thresholdMode = "auto";
  state.preset = "recommend";
  renderStep2();
  showToast("info", "詳細設定をリセットしました");
}

function syncDetails() {
  dom.detailsBody.hidden = !state.detailsOpen;
  dom.detailsCaret.textContent = state.detailsOpen ? "閉じる ▲" : "開く ▼";
}

/* ============================ settings ============================ */

function readSettings() {
  const v = state.vals;
  const minClusters = v.mink;
  const maxClusters = Math.max(minClusters + 1, v.maxk);
  return {
    analysisShortSide: v.ana,
    previewShortSide: v.prev,
    maxCandidates: v.maxc,
    minRepresentativeDistance: v.mindist,
    minClusters,
    maxClusters,
    thresholdMode: state.thresholdMode === "manual" ? "fixed" : "auto",
    fixedThreshold: v.fixed,
    thresholdQuantile: 0.995,
    thresholdMargin: v.margin,
  };
}

/* ============================ analysis (batch) ============================ */

async function analyzeAll() {
  if (!hasVideos() || state.analyzing) return;
  state.analyzing = true;
  state.cancelled = false;
  state.exported = false;
  state.step = 2;
  state.videos.forEach((v) => { v.status = "pending"; v.progress = 0; v.error = null; });
  render();
  startElapsedTimer();
  const settings = readSettings();

  for (const v of state.videos) {
    if (state.cancelled) break;
    v.status = "analyzing";
    v.progress = 0;
    renderAnalyzingList();
    try {
      await prepareVideoElement(v);
      throwIfCancelled();
      updateProc(v, 8);
      const first = await extractFrame(dom.workVideo, 0, settings.analysisShortSide);
      throwIfCancelled();
      v.thumb = makeThumb(first.imageData);
      v.videoWidth = dom.workVideo.videoWidth;
      v.videoHeight = dom.workVideo.videoHeight;
      v.duration = dom.workVideo.duration;
      v.dimsText = `${v.videoWidth}×${v.videoHeight}`;
      v.durText = formatDuration(v.duration);
      updateProc(v, 18);
      const lastTime = Math.max(0, dom.workVideo.duration - 1 / 30);
      const last = await extractFrame(dom.workVideo, lastTime, settings.analysisShortSide);
      throwIfCancelled();
      updateProc(v, 28);
      const result = await runAnalysisWorker(first.imageData, last.imageData, settings, (frac) => {
        updateProc(v, 28 + Math.max(0, Math.min(1, frac)) * 70);
      });
      throwIfCancelled();
      v.analysis = { ...result, settings };
      v.confirmThreshold = Math.round(result.threshold);
      v.processedCache = new Map();
      v.maskCache = new Map();
      v.status = "done";
      v.progress = 100;
    } catch (err) {
      if (state.cancelled) break;
      console.error(err);
      v.status = "error";
      v.error = friendlyError(err);
    }
    dom.transcodeNote.hidden = true;
    renderAnalyzingList();
  }

  stopElapsedTimer();
  state.analyzing = false;
  if (state.cancelled) {
    state.cancelled = false;
    state.step = 2;
    render();
    return;
  }
  const ok = doneVideos();
  if (!ok.length) {
    state.step = 2;
    render();
    showToast("error", "分析できる動画がありませんでした。");
    return;
  }
  state.activeIdx = state.videos.findIndex((v) => v.status === "done");
  goStep(3);
  showToast("success", `${ok.length}件の分析が完了しました`);
}

function throwIfCancelled() {
  if (state.cancelled) throw new Error("Stopped");
}

async function prepareVideoElement(v) {
  resetWorkVideo();
  dom.workVideo.preload = "metadata";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  try {
    await ensureMetadata(dom.workVideo);
  } catch (error) {
    if (!shouldAttemptTranscode(v, error)) throw error;
    await transcodeVideo(v, error);
    throwIfCancelled();
    await ensureMetadata(dom.workVideo);
  }
}

function shouldAttemptTranscode(v, error) {
  if (!v.file || v.transcoded || state.transcoding) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Could not load video metadata")
    || message.includes("Timed out while reading video metadata")
    || message.includes("unsupported video format or codec");
}

function runAnalysisWorker(firstImageData, lastImageData, settings, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`./worker.js?v=${APP_VERSION}`);
    state.activeWorker = worker;
    state.currentReject = reject;
    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "progress") {
        if (onProgress) onProgress(message.value);
      } else if (message.type === "done") {
        worker.terminate();
        state.activeWorker = null;
        state.currentReject = null;
        resolve(message.result);
      } else if (message.type === "error") {
        worker.terminate();
        state.activeWorker = null;
        state.currentReject = null;
        reject(new Error(message.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      state.activeWorker = null;
      state.currentReject = null;
      reject(new Error(event.message));
    };
    worker.postMessage(
      { type: "analyze", payload: { firstBuffer: firstImageData.data.buffer, lastBuffer: lastImageData.data.buffer, settings } },
      [firstImageData.data.buffer, lastImageData.data.buffer],
    );
  });
}

function stopAnalyze() {
  state.cancelled = true;
  stopElapsedTimer();
  if (state.activeWorker) { state.activeWorker.terminate(); state.activeWorker = null; }
  if (state.currentReject) { const r = state.currentReject; state.currentReject = null; r(new Error("Stopped")); }
  if (state.ffmpeg && state.transcoding) {
    state.ffmpeg.terminate();
    state.ffmpeg = null;
    state.ffmpegLoaded = false;
    state.transcoding = false;
  }
  state.analyzing = false;
  state.step = 2;
  render();
}

/* ---------- analyzing list ---------- */
function renderAnalyzingList() {
  dom.analyzingDesc.textContent = `${state.videos.length}件を順に処理しています。動画ごとに進みぐあいが表示されます。`;
  dom.analyzingList.innerHTML = state.videos.map((v) => {
    const pct = Math.round(v.progress || 0);
    let statusText = pct + "%";
    let statusCls = "";
    if (v.status === "done") { statusText = "✓ 完了"; statusCls = "done"; }
    else if (v.status === "error") { statusText = "失敗"; statusCls = "error"; }
    else if (v.status === "pending") { statusText = "待機中"; }
    const barCls = v.status === "done" ? "done" : "";
    return `
      <div class="proc-row" id="proc-${v.id}">
        ${thumbHtml(v, "proc-thumb")}
        <div class="proc-body">
          <div class="proc-top">
            <span class="proc-name">${esc(v.name)}${v.error ? " — " + esc(v.error) : ""}</span>
            <span class="proc-status ${statusCls}">${statusText}</span>
          </div>
          <div class="bar"><i class="${barCls}" style="width:${pct}%"></i></div>
        </div>
      </div>`;
  }).join("");
}

function updateProc(v, pct) {
  v.progress = pct;
  const row = document.getElementById("proc-" + v.id);
  if (!row) return;
  row.querySelector(".bar > i").style.width = Math.round(pct) + "%";
  const st = row.querySelector(".proc-status");
  if (v.status === "analyzing") st.textContent = Math.round(pct) + "%";
}

function startElapsedTimer() {
  stopElapsedTimer();
  state.analyzeStartedAt = performance.now();
  state.reassure = false;
  dom.reassure.hidden = true;
  state.elapsedTimer = window.setInterval(() => {
    const el = Math.floor((performance.now() - state.analyzeStartedAt) / 1000);
    dom.elapsedText.textContent = `経過 ${el} 秒`;
    if (el >= 4 && state.analyzing) dom.reassure.hidden = false;
  }, 500);
}

function stopElapsedTimer() {
  if (state.elapsedTimer !== null) { window.clearInterval(state.elapsedTimer); state.elapsedTimer = null; }
}

/* ============================ step3 preview ============================ */

function renderStep3Dynamic() {
  const dones = doneVideos();
  const multi = dones.length > 1;
  dom.step3Tabs.hidden = !multi;
  if (multi) {
    dom.step3Tabs.innerHTML = state.videos.map((v, i) => {
      if (v.status !== "done") return "";
      const cls = i === state.activeIdx ? "vid-tab active" : "vid-tab";
      const thumb = v.thumb ? `<img src="${v.thumb}" alt="">` : `<img alt="">`;
      return `<button class="${cls}" data-idx="${i}" type="button">${thumb}<span>${esc(v.name.replace(/\.[^.]+$/, ""))}</span></button>`;
    }).join("");
  }
  const v = activeVideo();
  if (!v || !v.analysis) return;
  dom.activeName.textContent = v.name;
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
}

function onTabClick(e) {
  const btn = e.target.closest("[data-idx]");
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  if (idx === state.activeIdx) return;
  stopPlay();
  state.activeIdx = idx;
  renderStep3Dynamic();
  loadActiveIntoPreview();
}

function renderPalette(v) {
  const reps = v.analysis.representatives;
  dom.paletteCount.textContent = reps.length + "色";
  dom.palette.innerHTML = reps.map((rgb, i) => {
    const hex = rgbToHex(rgb);
    return `<button class="swatch" data-hex="${hex}" type="button">
      <span class="swatch-chip" style="background:${hex}"></span>
      <span class="swatch-txt"><span class="swatch-idx">${i + 1}.</span><span class="swatch-hex">${hex}</span></span>
    </button>`;
  }).join("");
}

function onPaletteClick(e) {
  const btn = e.target.closest("[data-hex]");
  if (!btn) return;
  const hex = btn.dataset.hex;
  try { if (navigator.clipboard) navigator.clipboard.writeText(hex); } catch (err) { /* ignore */ }
  showToast("success", `${hex} をコピーしました`);
}

function renderMetrics(v) {
  const a = v.analysis;
  const ti = a.thresholdInfo;
  const rows = [
    ["代表色の数", String(a.selectedK)],
    ["しきい値", String(v.confirmThreshold)],
    ["元のユニーク色", a.uniqueColors.toLocaleString()],
    ["カバー率", formatNumber(a.candidateCoverage * 100, 1) + "%"],
    ["候補色数", a.candidateCount.toLocaleString()],
    ["代表色の最小距離", formatNumber(a.selectedMinRepresentativeDistance, 1)],
    ["判定方法", ti.mode === "auto" ? "自動" : "手動"],
    ["分位点", ti.quantileDistance == null ? "—" : formatNumber(ti.quantileDistance, 1)],
  ];
  dom.metrics.innerHTML = rows.map((r) => `<div class="metric"><div class="metric-label">${r[0]}</div><div class="metric-value">${r[1]}</div></div>`).join("");
}

function renderKTable(v) {
  const a = v.analysis;
  const rows = a.rows.slice(0, 8);
  dom.ktableBody.innerHTML = rows.map((r) => {
    const sel = r.k === a.selectedK ? " sel" : "";
    return `<div class="ktable-row${sel}"><span>${r.k}</span><span>${formatNumber(r.relativeGap, 2)}</span><span>${formatNumber(r.minRepresentativeDistance, 1)}</span></div>`;
  }).join("");
}

function loadActiveIntoPreview() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  stopPlay();
  resetWorkVideo();
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  ensureMetadata(dom.workVideo)
    .then(() => { setPreviewCanvasSizes(v.analysis.settings.previewShortSide); return seekVideo(dom.workVideo, 0); })
    .then(() => drawActiveFrame())
    .catch((err) => console.error(err));
}

function setPreviewCanvasSizes(shortSide) {
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, shortSide);
  for (const canvas of [dom.cvOrig, dom.cvReduced, dom.cvMask]) {
    canvas.width = width;
    canvas.height = height;
  }
}

function setConfirmThreshold(value) {
  const v = activeVideo();
  if (!v) return;
  v.confirmThreshold = value;
  v.processedCache = new Map();
  v.maskCache = new Map();
  dom.vConfirm.textContent = value;
  const m = dom.metrics.querySelector(".metric:nth-child(2) .metric-value");
  if (m) m.textContent = String(value);
  if (!state.playing) drawActiveFrame();
}

function drawActiveFrame() {
  const v = activeVideo();
  if (!v || !v.analysis || !dom.cvOrig.width) return;
  const reps = v.analysis.representatives;
  const th = v.confirmThreshold;
  const sCtx = dom.cvOrig.getContext("2d", { willReadFrequently: true });
  const pCtx = dom.cvReduced.getContext("2d", { willReadFrequently: true });
  const mCtx = dom.cvMask.getContext("2d", { willReadFrequently: true });
  sCtx.drawImage(dom.workVideo, 0, 0, dom.cvOrig.width, dom.cvOrig.height);
  const base = sCtx.getImageData(0, 0, dom.cvOrig.width, dom.cvOrig.height);
  const proc = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  processPixels(proc.data, reps, th, v.processedCache, false);
  pCtx.putImageData(proc, 0, 0);
  const mask = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  processPixels(mask.data, reps, th, v.maskCache, true);
  mCtx.putImageData(mask, 0, 0);
}

async function togglePlay() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  if (state.playing) { stopPlay(); return; }
  state.playing = true;
  dom.playBtn.textContent = "⏸ 停止";
  dom.workVideo.muted = true;
  if (dom.workVideo.ended) dom.workVideo.currentTime = 0;
  try { await dom.workVideo.play(); } catch (err) { stopPlay(); return; }
  const loop = () => {
    if (!state.playing || dom.workVideo.paused || dom.workVideo.ended) { stopPlay(); return; }
    drawActiveFrame();
    state.rafPreview = requestAnimationFrame(loop);
  };
  state.rafPreview = requestAnimationFrame(loop);
}

function stopPlay() {
  state.playing = false;
  dom.playBtn.textContent = "▶ 再生";
  if (state.rafPreview) { cancelAnimationFrame(state.rafPreview); state.rafPreview = null; }
  if (!dom.workVideo.paused) dom.workVideo.pause();
}

/* ============================ 3D RGB plot ============================ */

function attachPlot() {
  if (state.plotBound) return;
  state.plotBound = true;
  const el = dom.cvPlot;
  const pos = (e) => { const o = e.touches ? e.touches[0] : e; return { x: o.clientX, y: o.clientY }; };
  const down = (e) => { state.plotDragging = true; state.plotLast = pos(e); };
  const move = (e) => {
    if (!state.plotDragging) return;
    const p = pos(e);
    state.plotRot.yaw += (p.x - state.plotLast.x) * 0.01;
    state.plotRot.pitch += (p.y - state.plotLast.y) * 0.01;
    state.plotRot.pitch = Math.max(-1.4, Math.min(1.4, state.plotRot.pitch));
    state.plotLast = p;
  };
  const up = () => { state.plotDragging = false; };
  el.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  el.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: true });
  window.addEventListener("touchend", up);
}

function startPlot() {
  if (state.rafPlot) return;
  const loop = () => {
    if (state.step !== 3) { state.rafPlot = null; return; }
    if (!state.plotDragging) state.plotRot.yaw += 0.004;
    drawPlot();
    state.rafPlot = requestAnimationFrame(loop);
  };
  state.rafPlot = requestAnimationFrame(loop);
}

function stopPlot() {
  if (state.rafPlot) { cancelAnimationFrame(state.rafPlot); state.rafPlot = null; }
}

function drawPlot() {
  const cv = dom.cvPlot;
  const v = activeVideo();
  if (!cv || !v || !v.analysis) return;
  if (!cv.width) { cv.width = 720; cv.height = 320; }
  const reps = v.analysis.representatives;
  const samples = v.analysis.sampleColors || [];
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, W, H);
  const yaw = state.plotRot.yaw, pitch = state.plotRot.pitch;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  const cxv = W / 2, cyv = H / 2 + 12, scale = Math.min(W, H) * 0.42, dist = 3.4;
  const proj = (x, y, z) => {
    let X = x * cy - z * sy, Z = x * sy + z * cy;
    let Y = y * cx - Z * sx; Z = y * sx + Z * cx;
    const f = dist / (dist - Z);
    return { x: cxv + X * scale * f, y: cyv - Y * scale * f, depth: Z, f };
  };
  const O = proj(-1, -1, -1);
  const axes = [[1, -1, -1, "#e8584f", "R"], [-1, 1, -1, "#5fb86a", "G"], [-1, -1, 1, "#5a8fe0", "B"]];
  axes.forEach((a) => {
    const P = proj(a[0], a[1], a[2]);
    ctx.strokeStyle = a[3]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(P.x, P.y); ctx.stroke();
    ctx.fillStyle = a[3]; ctx.font = "bold 13px sans-serif"; ctx.fillText(a[4], P.x + 4, P.y + 4);
  });
  const pts = [];
  for (const c of samples) pts.push({ r: c[0], g: c[1], b: c[2], node: false });
  for (const c of reps) pts.push({ r: c[0], g: c[1], b: c[2], node: true });
  const drawpts = pts.map((p) => {
    const P = proj(p.r / 127.5 - 1, p.g / 127.5 - 1, p.b / 127.5 - 1);
    return { x: P.x, y: P.y, depth: P.depth, f: P.f, p };
  }).sort((a, b) => a.depth - b.depth);
  drawpts.forEach((d) => {
    const rad = d.p.node ? 6.5 * d.f : 2.0 * d.f;
    ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(1, rad), 0, 7);
    ctx.fillStyle = `rgb(${d.p.r},${d.p.g},${d.p.b})`;
    ctx.globalAlpha = d.p.node ? 1 : 0.6; ctx.fill();
    if (d.p.node) { ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke(); }
  });
  ctx.globalAlpha = 1;
}

/* ============================ step4 export (batch) ============================ */

function renderStep4() {
  const dones = doneVideos();
  const sel = dones.filter((v) => v.save);
  dom.selCountText.textContent = `${sel.length} / ${dones.length} 件 選択中`;
  renderStep4List();
  dom.exportBtn.hidden = state.exporting || state.exported;
  dom.exportBtn.textContent = `⬇ 選択した ${sel.length} 件を書き出す（WebM）`;
  dom.exportBtn.classList.toggle("disabled", sel.length === 0);
  dom.exportingText.hidden = !state.exporting;
  dom.exportedBox.hidden = !state.exported;
  if (state.exported) dom.exportedText.textContent = `${sel.length} 件の書き出しが完了しました`;
}

function renderStep4List() {
  const dones = doneVideos();
  dom.step4List.innerHTML = dones.map((v) => {
    const pct = Math.round(v.exportProgress || 0);
    let statusText, statusCls = "";
    if (state.exported) { statusText = v.save ? (v.exportUrl ? "✓ 保存済み" : "失敗") : "対象外"; statusCls = v.save && v.exportUrl ? "done" : (v.save ? "" : "off"); }
    else if (state.exporting) { statusText = v.save ? pct + "%" : "対象外"; statusCls = v.save ? "" : "off"; }
    else { statusText = v.save ? "保存する" : "保存しない"; statusCls = v.save ? "" : "off"; }
    const bar = state.exporting && v.save ? `<div class="bar"><i style="width:${pct}%"></i></div>` : "";
    const dl = state.exported && v.exportUrl ? `<a class="save-dl" href="${v.exportUrl}" download="${esc(v.exportName)}">ダウンロード (${formatBytes(v.exportSize)})</a>` : "";
    return `
      <div class="save-row ${v.save ? "on" : ""}" id="save-${v.id}">
        <button class="save-check" data-act="toggle" data-id="${v.id}" type="button">${v.save ? "✓" : ""}</button>
        ${thumbHtml(v, "save-thumb")}
        <div class="save-info">
          <div class="save-name">${esc(v.name)}</div>
          <div class="save-meta">${v.sizeText} ・ ${v.dimsText} → ${esc(makeOutputName(v.name))}</div>
        </div>
        <div class="save-right">${bar}<span class="save-status ${statusCls}">${statusText}</span><br>${dl}</div>
      </div>`;
  }).join("");
}

function onSaveListClick(e) {
  const btn = e.target.closest("[data-act='toggle']");
  if (!btn || state.exporting) return;
  const v = state.videos.find((x) => x.id === btn.dataset.id);
  if (v) { v.save = !v.save; renderStep4(); }
}

function setAllSave(on) {
  if (state.exporting) return;
  doneVideos().forEach((v) => { v.save = on; });
  renderStep4();
}

async function exportSelected() {
  const sel = doneVideos().filter((v) => v.save);
  if (!sel.length) { showToast("info", "保存する動画を選んでください"); return; }
  if (!supportsRecording()) { showToast("error", "このブラウザは書き出しに対応していません（Chrome / Edge 推奨）。"); return; }
  state.exporting = true;
  state.exported = false;
  state.cancelled = false;
  stopPlay();
  sel.forEach((v) => { v.exportProgress = 0; v.exportDone = false; if (v.exportUrl) { URL.revokeObjectURL(v.exportUrl); v.exportUrl = null; } });
  render();

  for (const v of sel) {
    if (state.cancelled) break;
    try {
      await exportOne(v);
      v.exportDone = true;
      v.exportProgress = 100;
    } catch (err) {
      console.error(err);
      v.exportDone = false;
    }
    renderStep4List();
  }

  state.exporting = false;
  if (state.cancelled) { state.cancelled = false; render(); showToast("info", "書き出しを中断しました"); return; }
  state.exported = true;
  render();
  showToast("success", `${sel.filter((v) => v.exportUrl).length}件の書き出しが完了しました`);
}

async function exportOne(v) {
  resetWorkVideo();
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  await ensureMetadata(dom.workVideo);
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, v.analysis.settings.previewShortSide);
  dom.exportCanvas.width = width;
  dom.exportCanvas.height = height;
  const ctx = dom.exportCanvas.getContext("2d", { willReadFrequently: true });
  const stream = dom.exportCanvas.captureStream(24);
  const mimeType = chooseRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.activeRecorder = recorder;
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  await seekVideo(dom.workVideo, 0);
  dom.workVideo.muted = true;
  await dom.workVideo.play();
  await new Promise((resolve) => {
    const step = () => {
      if (state.cancelled) { dom.workVideo.pause(); resolve(); return; }
      ctx.drawImage(dom.workVideo, 0, 0, width, height);
      const img = ctx.getImageData(0, 0, width, height);
      processPixels(img.data, v.analysis.representatives, v.confirmThreshold, v.processedCache, false);
      ctx.putImageData(img, 0, 0);
      v.exportProgress = Math.min(99, dom.workVideo.currentTime / Math.max(0.001, dom.workVideo.duration) * 100);
      updateExport(v);
      if (dom.workVideo.ended || dom.workVideo.paused) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  state.activeRecorder = null;
  dom.workVideo.pause();
  if (state.cancelled) return;
  const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
  v.exportUrl = URL.createObjectURL(blob);
  v.exportName = makeOutputName(v.name);
  v.exportSize = blob.size;
}

function updateExport(v) {
  const row = document.getElementById("save-" + v.id);
  if (!row) return;
  const bar = row.querySelector(".bar > i");
  if (bar) bar.style.width = Math.round(v.exportProgress) + "%";
  const st = row.querySelector(".save-status");
  if (st && v.save) st.textContent = Math.round(v.exportProgress) + "%";
}

function restart() {
  stopPlay();
  stopPlot();
  state.step = 1;
  state.exported = false;
  state.exporting = false;
  state.videos.forEach((v) => { v.exportProgress = 0; v.exportDone = false; v.save = true; });
  render();
}

/* ============================ engine (video / frames / ffmpeg) ============================ */

function resetWorkVideo() {
  dom.workVideo.pause();
  dom.workVideo.removeAttribute("src");
  dom.workVideo.load();
}

async function transcodeVideo(v, originalError) {
  state.transcoding = true;
  v.transcoded = true;
  dom.transcodeNote.hidden = false;
  dom.transcodeText.textContent = "このコーデックは直接読めません。変換器を読み込んでいます…（初回のみ約31MB）";
  try {
    const ffmpeg = await getFFmpeg();
    throwIfCancelled();
    const inputName = `input${fileExtension(v.file.name) || ".video"}`;
    const outputName = "browser-compatible.mp4";
    dom.transcodeText.textContent = `${v.name} を変換器に読み込み中…`;
    await ffmpeg.writeFile(inputName, new Uint8Array(await v.file.arrayBuffer()));
    throwIfCancelled();
    dom.transcodeText.textContent = "ブラウザ対応の H.264 MP4 へ変換中…";
    const exitCode = await ffmpeg.exec([
      "-i", inputName, "-map", "0:v:0", "-an", "-c:v", "libx264",
      "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputName,
    ]);
    if (exitCode !== 0) throw new Error(`FFmpeg conversion failed with exit code ${exitCode}`);
    throwIfCancelled();
    const data = await ffmpeg.readFile(outputName);
    const convertedBlob = new Blob([data.buffer], { type: "video/mp4" });
    const convertedUrl = URL.createObjectURL(convertedBlob);
    const oldUrl = v.url;
    v.url = convertedUrl;
    resetWorkVideo();
    dom.workVideo.preload = "metadata";
    dom.workVideo.src = v.url;
    dom.workVideo.load();
    if (oldUrl && oldUrl === v.objectUrl) { /* keep objectUrl ref for cleanup */ }
    await deleteFFmpegFile(ffmpeg, inputName);
    await deleteFFmpegFile(ffmpeg, outputName);
  } catch (error) {
    v.transcoded = false;
    const base = originalError instanceof Error ? originalError.message : String(originalError);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${base}. Automatic browser conversion also failed: ${detail}`);
  } finally {
    state.transcoding = false;
  }
}

async function getFFmpeg() {
  if (!state.ffmpeg) {
    const { FFmpeg } = await import(`./vendor/ffmpeg/ffmpeg/index.js?v=${APP_VERSION}`);
    state.ffmpeg = new FFmpeg();
    state.ffmpeg.on("progress", ({ progress }) => {
      const bounded = Math.max(0, Math.min(1, Number(progress) || 0));
      dom.transcodeText.textContent = `変換中 ${Math.round(bounded * 100)}%`;
    });
  }
  if (!state.ffmpegLoaded) {
    const coreBase = new URL("./vendor/ffmpeg/core/", window.location.href).href;
    dom.transcodeText.textContent = "ffmpeg.wasm を読み込み中…";
    state.ffmpegLoaded = await state.ffmpeg.load({
      coreURL: `${coreBase}ffmpeg-core.js?v=${APP_VERSION}`,
      wasmURL: `${coreBase}ffmpeg-core.wasm?v=${APP_VERSION}`,
    });
  }
  return state.ffmpeg;
}

async function deleteFFmpegFile(ffmpeg, path) {
  try { await ffmpeg.deleteFile(path); } catch { /* best-effort */ }
}

function fileExtension(name) {
  const match = /\.[A-Za-z0-9]+$/.exec(name);
  return match ? match[0].toLowerCase() : "";
}

async function extractFrame(video, time, shortSide) {
  await ensureMetadata(video);
  await seekVideo(video, Math.min(time, Math.max(0, video.duration - 0.001)));
  const { width, height } = scaledSize(video.videoWidth, video.videoHeight, shortSide);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);
  return { width, height, imageData: ctx.getImageData(0, 0, width, height) };
}

function scaledSize(width, height, shortSide) {
  if (!width || !height) return { width: 640, height: 360 };
  const scale = Math.min(1, shortSide / Math.min(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function processPixels(data, representatives, threshold, cache, maskOnly) {
  const thresholdSq = threshold * threshold;
  for (let index = 0; index < data.length; index += 4) {
    const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
    let mapped = cache.get(key);
    if (!mapped) {
      let best = representatives[0];
      let bestSq = Infinity;
      for (const rep of representatives) {
        const dr = data[index] - rep[0];
        const dg = data[index + 1] - rep[1];
        const db = data[index + 2] - rep[2];
        const distSq = dr * dr + dg * dg + db * db;
        if (distSq < bestSq) { bestSq = distSq; best = rep; }
      }
      const isNew = bestSq > thresholdSq;
      mapped = maskOnly ? (isNew ? [255, 0, 255] : [0, 0, 0]) : (isNew ? [255, 0, 255] : best);
      cache.set(key, mapped);
    }
    data[index] = mapped[0];
    data[index + 1] = mapped[1];
    data[index + 2] = mapped[2];
    data[index + 3] = 255;
  }
}

function ensureMetadata(video) {
  if (hasVideoMetadata(video)) return Promise.resolve();
  if (video.error) return Promise.reject(new Error(`Could not load video metadata: ${mediaErrorMessage(video)}`));
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Timed out while reading video metadata")); }, 20000);
    const onLoaded = () => { if (!hasVideoMetadata(video)) return; cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(`Could not load video metadata: ${mediaErrorMessage(video)}`)); };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("canplay", onLoaded);
      video.removeEventListener("durationchange", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("canplay", onLoaded, { once: true });
    video.addEventListener("durationchange", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.preload = "metadata";
    video.load();
  });
}

function hasVideoMetadata(video) {
  return video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0;
}

function mediaErrorMessage(video) {
  const error = video.error;
  if (!error) return "the browser did not provide a media error code";
  const labels = { 1: "loading was aborted", 2: "network error while loading the selected file", 3: "decode error or damaged video stream", 4: "unsupported video format or codec" };
  const label = labels[error.code] || "unknown media error";
  const extra = error.message ? `: ${error.message}` : "";
  return `${label} (code ${error.code})${extra}`;
}

function seekVideo(video, time) {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error(`Timed out while seeking video to ${formatNumber(time, 3)}s`)); }, 30000);
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("Video seek failed")); };
    const cleanup = () => { window.clearTimeout(timeout); video.removeEventListener("seeked", onSeeked); video.removeEventListener("error", onError); };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

function supportsRecording() {
  return Boolean(dom.exportCanvas.captureStream && window.MediaRecorder);
}

function chooseRecorderMimeType() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

/* ============================ helpers ============================ */

function makeThumb(imageData) {
  const src = new OffscreenCanvas(imageData.width, imageData.height);
  src.getContext("2d").putImageData(imageData, 0, 0);
  const tw = 168;
  const th = Math.max(1, Math.round(tw * imageData.height / imageData.width));
  const out = document.createElement("canvas");
  out.width = tw; out.height = th;
  out.getContext("2d").drawImage(src, 0, 0, tw, th);
  return out.toDataURL("image/jpeg", 0.72);
}

function thumbHtml(v, cls) {
  if (v.thumb) return `<img class="${cls}" src="${v.thumb}" alt="">`;
  return `<div class="${cls} placeholder">🎞</div>`;
}

function friendlyError(err) {
  const m = err instanceof Error ? err.message : String(err);
  if (/Stopped/.test(m)) return "中断しました";
  if (/metadata|unsupported|codec|decode|conversion/i.test(m)) return "読み込めませんでした（形式が非対応の可能性）。MP4 でお試しください。";
  return "エラーが発生しました";
}

function showToast(type, msg) {
  if (state.toastTimer) clearTimeout(state.toastTimer);
  dom.toast.className = "toast" + (type === "success" ? " success" : type === "error" ? " error" : "");
  dom.toast.querySelector(".toast-ic").textContent = type === "success" ? "✓" : type === "error" ? "!" : "ℹ";
  dom.toast.querySelector(".toast-msg").textContent = msg;
  dom.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => { dom.toast.hidden = true; }, 2400);
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function formatNumber(value, digits) {
  if (!Number.isFinite(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
}

function formatDuration(sec) {
  if (!Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function makeOutputName(inputName) {
  const base = inputName.replace(/\.[^.]+$/, "") || "palette-reduced";
  return `${base}-reduced.webm`;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

init();
