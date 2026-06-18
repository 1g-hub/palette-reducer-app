"use strict";

const APP_VERSION = "20260618-15";

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
  thresholdSeg: $("thresholdSeg"), fixedField: $("fixedField"), marginField: $("marginField"), resetAdvancedBtn: $("resetAdvancedBtn"),
  advPrevTabs: $("advPrevTabs"), advPrevName: $("advPrevName"), advPrevStatus: $("advPrevStatus"),
  cvPrevOrig: $("cvPrevOrig"), cvPrevReduced: $("cvPrevReduced"),
  chkAnaFull: $("chkAnaFull"), chkPrevFull: $("chkPrevFull"),
  // analyzing
  analyzingDesc: $("analyzingDesc"), analyzingList: $("analyzingList"),
  elapsedText: $("elapsedText"), stopAnalyzeBtn: $("stopAnalyzeBtn"),
  reassure: $("reassure"), transcodeNote: $("transcodeNote"), transcodeText: $("transcodeText"),
  // step3
  backToStep2: $("backToStep2"), playBtn: $("playBtn"), loopBtn: $("loopBtn"), step3Tabs: $("step3Tabs"), activeName: $("activeName"),
  cvOrig: $("cvOrig"), cvReduced: $("cvReduced"), cvMask: $("cvMask"),
  vConfirm: $("vConfirm"), sConfirm: $("sConfirm"), resetConfirm: $("resetConfirm"), snapMarker: $("snapMarker"),
  confMinus: $("confMinus"), confPlus: $("confPlus"),
  kMinus: $("kMinus"), kValue: $("kValue"), kPlus: $("kPlus"), kRange: $("kRange"),
  paletteCount: $("paletteCount"), palette: $("palette"), cvPlot: $("cvPlot"), plotWrap: $("plotWrap"),
  plotZoomIn: $("plotZoomIn"), plotZoomOut: $("plotZoomOut"), plotReset: $("plotReset"), plotFull: $("plotFull"),
  detailsToggle: $("detailsToggle"), detailsCaret: $("detailsCaret"), detailsBody: $("detailsBody"),
  metrics: $("metrics"), ktableBody: $("ktableBody"), toStep4Btn: $("toStep4Btn"),
  // step4
  backToStep3: $("backToStep3"), selCountText: $("selCountText"),
  selectAllBtn: $("selectAllBtn"), deselectAllBtn: $("deselectAllBtn"), step4List: $("step4List"),
  formatSelect: $("formatSelect"), fmtInfo: $("fmtInfo"), fmtDesc: $("fmtDesc"),
  folderPickRow: $("folderPickRow"), useFolderPicker: $("useFolderPicker"), folderHint: $("folderHint"),
  exportBtn: $("exportBtn"), exportingBox: $("exportingBox"), exportingText: $("exportingText"), stopExportBtn: $("stopExportBtn"),
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

const NATIVE_RES = 100000; // sentinel → scaledSize keeps native resolution
const EXPORT_FPS = 24; // frame rate used when re-encoding via ffmpeg.wasm

// Full-range BT.709 tagging so YUV outputs are displayed with the same colors as the sRGB preview.
const FULLRANGE_709 = ["-color_range", "pc", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];
const VF_FULL = (pix) => ["-vf", `scale=in_range=full:out_range=full,format=${pix}`];

// Save formats, ordered from most information-preserving to smallest. All video-only (no audio).
// RGB-capable codecs (raw / FFV1) avoid YUV chroma conversion. AVI raw video is stored as BGR24,
// which decodes back to the same RGB colors in players/editors that handle raw AVI correctly.
// YUV codecs are tagged full-range BT.709 to match the preview as closely as possible.
const EXPORT_FORMATS = [
  { id: "raw", label: "非圧縮 RGB（AVI・最高品質/最大）", ext: "avi", mime: "video/x-msvideo", via: "ffmpeg", enc: "rawvideo",
    args: ["-c:v", "rawvideo", "-pix_fmt", "bgr24"],
    desc: "情報量を一切落とさない無圧縮。AVIの標準的なBGR24で保存し、再生時にRGBとして同じ色へ戻ります。ファイルは極端に大きく、書き出しも最も重い。" },
  { id: "ffv1", label: "FFV1 可逆圧縮・RGB（MKV）", ext: "mkv", mime: "video/x-matroska", via: "ffmpeg", enc: "ffv1",
    args: ["-c:v", "ffv1", "-level", "3", "-pix_fmt", "gbrp"],
    desc: "RGBのまま可逆圧縮するので色も画質も完全一致。無圧縮よりかなり小さい。保存・編集向け（再生対応プレイヤーは限られます）。" },
  { id: "h264lossless", label: "H.264 ロスレス（MKV）", ext: "mkv", mime: "video/x-matroska", via: "ffmpeg", enc: "libx264",
    args: ["-c:v", "libx264", "-qp", "0", "-preset", "veryfast", ...VF_FULL("yuv444p"), ...FULLRANGE_709],
    desc: "H.264の可逆モード（色差も間引かない4:4:4・フルレンジ）。画質劣化なし。FFV1より対応環境が多め。" },
  { id: "h265lossless", label: "H.265 ロスレス（MKV）", ext: "mkv", mime: "video/x-matroska", via: "ffmpeg", enc: "libx265",
    args: ["-c:v", "libx265", "-x265-params", "lossless=1", ...VF_FULL("yuv444p"), ...FULLRANGE_709],
    desc: "H.265の可逆モード。可逆の中では小さめですがエンコードは非常に重い。※この環境に無い場合は失敗します。" },
  { id: "prores", label: "ProRes 4444（MOV）", ext: "mov", mime: "video/quicktime", via: "ffmpeg", enc: "prores_ks",
    args: ["-c:v", "prores_ks", "-profile:v", "4", ...VF_FULL("yuv444p10le"), ...FULLRANGE_709],
    desc: "映像編集向けの高品質コーデック（4:4:4）。ほぼ無劣化。ファイルは大きめです。" },
  { id: "h264", label: "H.264 MP4（標準・高画質）", ext: "mp4", mime: "video/mp4", via: "ffmpeg", enc: "libx264",
    args: ["-c:v", "libx264", "-crf", "20", ...VF_FULL("yuv420p"), ...FULLRANGE_709, "-movflags", "+faststart"],
    desc: "一般的なMP4。少し圧縮されますが高画質で、ほとんどの環境で再生できます。色差を間引くため極わずかに変化することがあります。" },
  { id: "webm-fast", label: "WebM（標準・最速）", ext: "webm", mime: "video/webm", via: "mediarecorder",
    desc: "ブラウザ標準の高速書き出し。ffmpegの読み込みが不要で最速。画質は標準的です。" },
  { id: "mp4-low", label: "MP4 低ビットレート（小さい）", ext: "mp4", mime: "video/mp4", via: "ffmpeg", enc: "libx264",
    args: ["-c:v", "libx264", "-b:v", "800k", ...VF_FULL("yuv420p"), ...FULLRANGE_709, "-movflags", "+faststart"],
    desc: "容量を小さく抑えたいとき向け。画質は落ちます。共有・アップロードに。" },
  { id: "webm-low", label: "WebM 低ビットレート（小さい）", ext: "webm", mime: "video/webm", via: "ffmpeg", enc: "libvpx-vp9",
    args: ["-c:v", "libvpx-vp9", "-b:v", "500k", ...VF_FULL("yuv420p"), ...FULLRANGE_709],
    desc: "WebMで容量を抑えたいとき向け。画質は落ちます。" },
];
const DEFAULT_VALS = { ana: 540, prev: 360, anaFull: true, prevFull: true, maxc: 800, mindist: 12, mink: 4, maxk: 40, fixed: 60, margin: 5 };
// Selecting a preset resets ALL parameters (including threshold mode and resolution) to these values.
const PRESETS = {
  recommend: { ana: 540, prev: 360, anaFull: true, prevFull: true, maxc: 800, mindist: 12, mink: 4, maxk: 40, fixed: 60, margin: 5, mode: "auto" },
  hq: { ana: 720, prev: 540, anaFull: true, prevFull: true, maxc: 1500, mindist: 8, mink: 4, maxk: 48, fixed: 60, margin: 4, mode: "auto" },
  light: { ana: 400, prev: 240, anaFull: true, prevFull: true, maxc: 400, mindist: 20, mink: 4, maxk: 32, fixed: 60, margin: 6, mode: "auto" },
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
  exportFormat: "webm-fast",
  useFolderPicker: true,
  playing: false,
  loop: false,
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
  plotZoom: 1,
  plotPan: { x: 0, y: 0 },
  plotMode: "rotate",
  pinchDist: 0,
  plotDragging: false,
  plotLast: { x: 0, y: 0 },
  plotCache: null,
  toastTimer: null,
  vid: 0,
  advPreviewIdx: 0,
  advPreviewToken: 0,
  advPreviewTimer: null,
  previewWorker: null,
  exportDir: null,
  exportDirName: "",
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
  dom.advancedToggle.addEventListener("click", () => { state.advanced = !state.advanced; syncAdvanced(); if (state.advanced) scheduleAdvancedPreview(); });
  dom.thresholdSeg.addEventListener("click", onThresholdModeClick);
  dom.resetAdvancedBtn.addEventListener("click", resetAdvanced);
  dom.advPrevTabs.addEventListener("click", onAdvPrevTabClick);
  bindSlider(dom.sAna, dom.vAna, "ana");
  bindSlider(dom.sPrev, dom.vPrev, "prev");
  bindSlider(dom.sMaxc, dom.vMaxc, "maxc");
  bindSlider(dom.sMindist, dom.vMindist, "mindist");
  bindSlider(dom.sMink, dom.vMink, "mink");
  bindSlider(dom.sMaxk, dom.vMaxk, "maxk");
  bindSlider(dom.sFixed, dom.vFixed, "fixed");
  bindSlider(dom.sMargin, dom.vMargin, "margin");

  dom.stopAnalyzeBtn.addEventListener("click", stopAnalyze);

  dom.chkAnaFull.addEventListener("change", () => { state.vals.anaFull = dom.chkAnaFull.checked; syncSliders(); markCustomPreset(); scheduleAdvancedPreview(); });
  dom.chkPrevFull.addEventListener("change", () => { state.vals.prevFull = dom.chkPrevFull.checked; syncSliders(); markCustomPreset(); });

  dom.backToStep2.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(2); });
  dom.playBtn.addEventListener("click", () => togglePlay(false));
  dom.loopBtn.addEventListener("click", () => togglePlay(true));
  dom.step3Tabs.addEventListener("click", onTabClick);
  dom.plotZoomIn.addEventListener("click", () => zoomPlot(1.25));
  dom.plotZoomOut.addEventListener("click", () => zoomPlot(0.8));
  dom.plotReset.addEventListener("click", resetPlotView);
  dom.plotFull.addEventListener("click", togglePlotFullscreen);
  dom.cvPlot.addEventListener("wheel", onPlotWheel, { passive: false });
  document.addEventListener("fullscreenchange", () => requestPlotDraw());
  dom.sConfirm.addEventListener("input", (e) => setConfirmThreshold(+e.target.value, true));
  dom.confMinus.addEventListener("click", () => changeConfirmThreshold(-1));
  dom.confPlus.addEventListener("click", () => changeConfirmThreshold(1));
  dom.resetConfirm.addEventListener("click", resetConfirmParams);
  dom.palette.addEventListener("click", onPaletteClick);
  dom.detailsToggle.addEventListener("click", () => { state.detailsOpen = !state.detailsOpen; syncDetails(); });
  dom.toStep4Btn.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(4); });

  dom.backToStep3.addEventListener("click", () => goStep(3));
  dom.selectAllBtn.addEventListener("click", () => setAllSave(true));
  dom.deselectAllBtn.addEventListener("click", () => setAllSave(false));
  dom.step4List.addEventListener("click", onSaveListClick);
  dom.formatSelect.addEventListener("change", () => {
    state.exportFormat = dom.formatSelect.value;
    syncFormatDesc();
    if (state.step === 4 && !state.exporting) { state.exported = false; renderStep4(); }
  });
  dom.exportBtn.addEventListener("click", exportSelected);
  dom.stopExportBtn.addEventListener("click", stopExport);
  dom.restartBtn.addEventListener("click", restart);
  dom.useFolderPicker.addEventListener("change", () => {
    state.useFolderPicker = dom.useFolderPicker.checked;
    dom.folderHint.hidden = !state.useFolderPicker;
  });
  // The "choose folder" option only applies where the File System Access API exists (Chrome/Edge).
  if (window.showDirectoryPicker) { dom.folderPickRow.hidden = false; dom.folderHint.hidden = false; }
  initFormatSelect();

  dom.kMinus.addEventListener("click", () => changeK(-1));
  dom.kPlus.addEventListener("click", () => changeK(1));

  attachPlot();
  attachTooltip();
  render();

  if (window.location.protocol === "file:") {
    showToast("error", "HTTPサーバー（GitHub Pages等）で開いてください。file:// では解析が動きません。");
  }
}

function bindSlider(slider, label, key) {
  slider.addEventListener("input", () => {
    state.vals[key] = Number(slider.value);
    if (key === "ana" || key === "prev") label.textContent = slider.value + "px";
    else label.textContent = slider.value;
    markCustomPreset();
    scheduleAdvancedPreview();
  });
}

// When the user hand-tweaks any setting, no preset is "selected" anymore.
function markCustomPreset() {
  if (state.preset === null) return;
  state.preset = null;
  dom.presetSeg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
}

/* ============================ video model ============================ */

function fileKey(file) {
  // Browsers don't expose absolute paths; identify by name + size + lastModified.
  return `${file.name}__${file.size}__${file.lastModified}`;
}

function makeVideo(file) {
  state.vid += 1;
  const objectUrl = URL.createObjectURL(file);
  return {
    id: "v" + state.vid,
    key: fileKey(file),
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
    activeK: 0,
    confirmThreshold: 47,
    processedCache: new Map(),
    maskCache: new Map(),
    status: "pending",
    progress: 0,
    error: null,
    save: true,
    exportProgress: 0,
    exportDone: false,
    exportBlob: null,
    exportUrl: null,
    savedToDir: false,
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
  const existing = new Set(state.videos.map((v) => v.key));
  let added = 0;
  let skipped = 0;
  for (const f of files) {
    const key = fileKey(f);
    if (existing.has(key)) { skipped += 1; continue; }
    existing.add(key);
    const v = makeVideo(f);
    state.videos.push(v);
    enqueueThumb(v); // build a thumbnail right away so STEP 1 shows real previews
    added += 1;
  }
  state.exported = false;
  render();
  if (skipped > 0) showToast("info", `同じ動画 ${skipped} 件はまとめました${added ? `（${added} 件を追加）` : ""}`);
}

/* Thumbnails are generated on add (not only during analysis) so STEP 1 shows real frames.
   Processed sequentially with a dedicated off-DOM <video> so it never disturbs playback. */
const thumbQueue = [];
let thumbBusy = false;

function enqueueThumb(v) {
  thumbQueue.push(v);
  pumpThumbs();
}

async function pumpThumbs() {
  if (thumbBusy) return;
  thumbBusy = true;
  while (thumbQueue.length) {
    const v = thumbQueue.shift();
    if (!v || v.thumb || !state.videos.includes(v)) continue;
    try {
      await makeThumbForVideo(v);
      if (state.step === 1) renderStep1();
    } catch (err) {
      // Unsupported codec etc. — keep the placeholder; analysis will still try later.
    }
  }
  thumbBusy = false;
}

async function makeThumbForVideo(v) {
  const vid = document.createElement("video");
  vid.muted = true;
  vid.playsInline = true;
  vid.preload = "auto";
  try {
    vid.src = v.url;
    vid.load();
    await ensureMetadata(vid);
    await seekVideo(vid, initialPreviewTime(vid));
    const w = 168;
    const ratio = (vid.videoWidth && vid.videoHeight) ? vid.videoHeight / vid.videoWidth : 9 / 16;
    const h = Math.max(1, Math.round(w * ratio));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Could not create thumbnail canvas");
    ctx.drawImage(vid, 0, 0, w, h);
    v.thumb = c.toDataURL("image/jpeg", 0.72);
    if (!v.videoWidth && vid.videoWidth) {
      v.videoWidth = vid.videoWidth;
      v.videoHeight = vid.videoHeight;
      v.duration = vid.duration;
      v.dimsText = `${vid.videoWidth}×${vid.videoHeight}`;
      v.durText = formatDuration(vid.duration);
    }
  } finally {
    vid.removeAttribute("src");
    try { vid.load(); } catch (e) { /* ignore */ }
  }
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
  dom.analyzeBtnLabel.textContent = "色を分析する";
  dom.presetSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
  syncSliders();
  syncAdvanced();
  syncThresholdMode();
  if (state.advanced) scheduleAdvancedPreview();
}

function onPresetClick(e) {
  const btn = e.target.closest("[data-preset]");
  if (!btn) return;
  state.preset = btn.dataset.preset;
  // Reset ALL parameters (resolution, color grouping, threshold mode) to the preset's defaults.
  const p = PRESETS[state.preset];
  Object.keys(DEFAULT_VALS).forEach((k) => { if (p[k] !== undefined) state.vals[k] = p[k]; });
  state.thresholdMode = p.mode || "auto";
  syncSliders();
  syncThresholdMode();
  dom.presetSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
  scheduleAdvancedPreview();
}

function syncSliders() {
  const map = [
    [dom.sMaxc, dom.vMaxc, "maxc"], [dom.sMindist, dom.vMindist, "mindist"],
    [dom.sMink, dom.vMink, "mink"], [dom.sMaxk, dom.vMaxk, "maxk"],
    [dom.sFixed, dom.vFixed, "fixed"], [dom.sMargin, dom.vMargin, "margin"],
  ];
  map.forEach(([s, l, k]) => { s.value = state.vals[k]; l.textContent = state.vals[k]; });
  // resolution fields (slider + "入力と同じ" checkbox)
  dom.chkAnaFull.checked = state.vals.anaFull;
  dom.sAna.disabled = state.vals.anaFull;
  dom.sAna.value = state.vals.ana;
  dom.vAna.textContent = state.vals.anaFull ? "入力と同じ" : state.vals.ana + "px";
  dom.chkPrevFull.checked = state.vals.prevFull;
  dom.sPrev.disabled = state.vals.prevFull;
  dom.sPrev.value = state.vals.prev;
  dom.vPrev.textContent = state.vals.prevFull ? "入力と同じ" : state.vals.prev + "px";
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
  markCustomPreset();
  scheduleAdvancedPreview();
}

function syncThresholdMode() {
  dom.thresholdSeg.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.thresholdMode));
  dom.fixedField.hidden = state.thresholdMode !== "manual";
  dom.marginField.hidden = state.thresholdMode === "manual";
}

function resetAdvanced() {
  state.vals = { ...DEFAULT_VALS };
  state.thresholdMode = "auto";
  state.preset = "recommend";
  renderStep2();
  scheduleAdvancedPreview();
  showToast("info", "詳細設定をリセットしました");
}

function syncDetails() {
  dom.detailsBody.hidden = !state.detailsOpen;
  dom.detailsCaret.textContent = state.detailsOpen ? "閉じる ▲" : "開く ▼";
}

/* ============================ advanced live preview ============================ */

function scheduleAdvancedPreview() {
  if (!state.advanced || state.analyzing || !hasVideos()) return;
  if (state.advPreviewIdx >= state.videos.length) state.advPreviewIdx = 0;
  renderAdvPrevTabs();
  dom.advPrevStatus.textContent = "計算中…";
  if (state.advPreviewTimer) clearTimeout(state.advPreviewTimer);
  state.advPreviewTimer = window.setTimeout(runAdvancedPreview, 450);
}

function cancelAdvancedPreview() {
  state.advPreviewToken += 1;
  if (state.advPreviewTimer) { clearTimeout(state.advPreviewTimer); state.advPreviewTimer = null; }
  if (state.previewWorker) { state.previewWorker.terminate(); state.previewWorker = null; }
}

function renderAdvPrevTabs() {
  const multi = state.videos.length > 1;
  dom.advPrevTabs.hidden = !multi;
  if (!multi) return;
  dom.advPrevTabs.innerHTML = state.videos.map((v, i) => {
    const cls = i === state.advPreviewIdx ? "adv-prev-tab active" : "adv-prev-tab";
    const img = v.thumb ? `<img src="${v.thumb}" alt="">` : `<img alt="">`;
    return `<button class="${cls}" data-idx="${i}" type="button">${img}</button>`;
  }).join("");
}

function onAdvPrevTabClick(e) {
  const btn = e.target.closest("[data-idx]");
  if (!btn) return;
  state.advPreviewIdx = Number(btn.dataset.idx);
  renderAdvPrevTabs();
  scheduleAdvancedPreview();
}

async function runAdvancedPreview() {
  if (!state.advanced || state.analyzing || !hasVideos()) return;
  const token = ++state.advPreviewToken;
  const v = state.videos[state.advPreviewIdx] || state.videos[0];
  if (!v) return;
  dom.advPrevName.textContent = v.name;
  try {
    resetWorkVideo();
    dom.workVideo.preload = "auto";
    dom.workVideo.src = v.url;
    dom.workVideo.load();
    await ensureMetadata(dom.workVideo);
    if (token !== state.advPreviewToken) return;
    const settings = readSettings();
    const previewFrame = await extractFrame(dom.workVideo, initialPreviewTime(dom.workVideo), settings.previewShortSide);
    if (token !== state.advPreviewToken) return;
    drawImageDataTo(dom.cvPrevOrig, previewFrame.imageData);
    dom.advPrevStatus.textContent = "計算中…";

    const firstAnalysis = await extractFrame(dom.workVideo, 0, settings.analysisShortSide);
    if (token !== state.advPreviewToken) return;
    const lastTime = Math.max(0, dom.workVideo.duration - 1 / 30);
    const lastAnalysis = await extractFrame(dom.workVideo, lastTime, settings.analysisShortSide);
    if (token !== state.advPreviewToken) return;

    const result = await runPreviewWorker(firstAnalysis.imageData, lastAnalysis.imageData, settings);
    if (token !== state.advPreviewToken) return;
    const reduced = cloneImageData(previewFrame.imageData);
    processPixels(reduced.data, result.representatives, result.threshold, new Map(), false);
    drawImageDataTo(dom.cvPrevReduced, reduced);
    dom.advPrevStatus.textContent = `代表色 ${result.selectedK} 色`;
  } catch (err) {
    if (token !== state.advPreviewToken) return;
    console.error(err);
    dom.advPrevStatus.textContent = "プレビューを作成できませんでした";
  }
}

function runPreviewWorker(firstImageData, lastImageData, settings) {
  return new Promise((resolve, reject) => {
    if (state.previewWorker) state.previewWorker.terminate();
    const worker = new Worker(`./worker.js?v=${APP_VERSION}`);
    state.previewWorker = worker;
    worker.onmessage = (event) => {
      const m = event.data;
      if (m.type === "done") { worker.terminate(); if (state.previewWorker === worker) state.previewWorker = null; resolve(m.result); }
      else if (m.type === "error") { worker.terminate(); if (state.previewWorker === worker) state.previewWorker = null; reject(new Error(m.message)); }
    };
    worker.onerror = (e) => { worker.terminate(); if (state.previewWorker === worker) state.previewWorker = null; reject(new Error(e.message)); };
    worker.postMessage(
      { type: "analyze", payload: { firstBuffer: firstImageData.data.buffer, lastBuffer: lastImageData.data.buffer, settings } },
      [firstImageData.data.buffer, lastImageData.data.buffer],
    );
  });
}

function cloneImageData(img) {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

function drawImageDataTo(canvas, img) {
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d").putImageData(img, 0, 0);
}

/* ============================ tooltip ============================ */

function attachTooltip() {
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  document.body.appendChild(tip);
  const place = (el) => {
    const r = el.getBoundingClientRect();
    tip.style.left = "0px";
    tip.style.top = "0px";
    tip.hidden = false;
    const tr = tip.getBoundingClientRect();
    let left = r.left + r.width / 2 - tr.width / 2;
    left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, left));
    let top = r.top - tr.height - 10;
    if (top < 8) top = r.bottom + 10;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  };
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest(".info[data-tip]");
    if (!el) return;
    tip.textContent = el.getAttribute("data-tip");
    place(el);
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest && e.target.closest(".info[data-tip]")) tip.hidden = true;
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(".info[data-tip]");
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute("data-tip");
    place(el);
  });
}

/* ============================ settings ============================ */

function readSettings() {
  const v = state.vals;
  const minClusters = v.mink;
  const maxClusters = Math.max(minClusters + 1, v.maxk);
  return {
    analysisShortSide: v.anaFull ? NATIVE_RES : v.ana,
    previewShortSide: v.prevFull ? NATIVE_RES : v.prev,
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
  cancelAdvancedPreview();
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
      v.activeK = result.selectedK;
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
  dom.workVideo.preload = "auto";
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
  updateConfStepperBounds(v.confirmThreshold);
  renderKControl(v);
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
  // The marker is computed from the actual drawn frame, so it is set after the frame
  // is rendered (loadActiveIntoPreview / changeK / resetConfirmParams).
}

function renderKControl(v) {
  const ks = (v.analysis && v.analysis.availableK) || [];
  if (!ks.length) { dom.kValue.textContent = String(v.analysis ? v.analysis.representatives.length : "—"); return; }
  const min = ks[0], max = ks[ks.length - 1];
  dom.kValue.textContent = String(v.activeK);
  dom.kRange.textContent = `（${min}〜${max}）`;
  dom.kMinus.disabled = v.activeK <= min;
  dom.kPlus.disabled = v.activeK >= max;
}

function changeK(delta) {
  const v = activeVideo();
  if (!v || !v.analysis || !v.analysis.availableK) return;
  const ks = v.analysis.availableK;
  let i = ks.indexOf(v.activeK);
  if (i < 0) i = ks.indexOf(v.analysis.selectedK);
  i = Math.max(0, Math.min(ks.length - 1, i + delta));
  const nk = ks[i];
  if (nk === v.activeK) return;
  v.activeK = nk;
  v.analysis.representatives = v.analysis.snapshotsByK[nk].representatives;
  v.processedCache = new Map();
  v.maskCache = new Map();
  state.plotCache = null;
  updateSnapMarker(v);
  renderKControl(v);
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
  if (!state.playing) drawActiveFrame();
  requestPlotDraw();
}

// Restore the active video's threshold and representative count to the auto-determined originals.
function resetConfirmParams() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  v.activeK = v.analysis.selectedK;
  if (v.analysis.snapshotsByK[v.activeK]) {
    v.analysis.representatives = v.analysis.snapshotsByK[v.activeK].representatives;
  }
  v.confirmThreshold = Math.round(v.analysis.threshold);
  v.processedCache = new Map();
  v.maskCache = new Map();
  state.plotCache = null;
  updateSnapMarker(v);
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  renderKControl(v);
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
  if (!state.playing) drawActiveFrame();
  requestPlotDraw();
  showToast("info", "しきい値と代表色の数を自動の値に戻しました");
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
  requestPlotDraw();
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
  const snap = a.snapshotsByK && a.snapshotsByK[v.activeK];
  const minDist = snap ? snap.minRepresentativeDistance : a.selectedMinRepresentativeDistance;
  const rows = [
    ["代表色の数", String(v.activeK || a.selectedK)],
    ["しきい値", String(v.confirmThreshold)],
    ["元のユニーク色", a.uniqueColors.toLocaleString()],
    ["カバー率", formatNumber(a.candidateCoverage * 100, 1) + "%"],
    ["候補色数", a.candidateCount.toLocaleString()],
    ["代表色の最小距離", formatNumber(minDist, 1)],
    ["判定方法", ti.mode === "auto" ? "自動" : "手動"],
    ["分位点", ti.quantileDistance == null ? "—" : formatNumber(ti.quantileDistance, 1)],
  ];
  dom.metrics.innerHTML = rows.map((r) => `<div class="metric"><div class="metric-label">${r[0]}</div><div class="metric-value">${r[1]}</div></div>`).join("");
}

function renderKTable(v) {
  const a = v.analysis;
  const rows = a.rows.slice(0, 8);
  dom.ktableBody.innerHTML = rows.map((r) => {
    const sel = r.k === (v.activeK || a.selectedK) ? " sel" : "";
    return `<div class="ktable-row${sel}"><span>${r.k}</span><span>${formatNumber(r.relativeGap, 2)}</span><span>${formatNumber(r.minRepresentativeDistance, 1)}</span></div>`;
  }).join("");
}

function loadActiveIntoPreview() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  stopPlay();
  resetWorkVideo();
  state.plotCache = null;
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  ensureMetadata(dom.workVideo)
    .then(() => {
      setPreviewCanvasSizes(v.analysis.settings.previewShortSide);
      // Seek to a small positive time so a real frame decodes (seeking to 0 from 0 fires no "seeked").
      return seekVideo(dom.workVideo, initialPreviewTime(dom.workVideo));
    })
    .then(() => {
      drawActiveFrame();
      updateSnapMarker(v);
      // Draw again next frames in case the first decode wasn't ready.
      requestAnimationFrame(() => { drawActiveFrame(); updateSnapMarker(v); });
      setTimeout(() => { if (!state.playing) { drawActiveFrame(); updateSnapMarker(v); } }, 120);
    })
    .catch((err) => console.error(err));
}

function initialPreviewTime(video) {
  return Math.min(0.08, Math.max(0, (video.duration || 1) / 3));
}

function setPreviewCanvasSizes(shortSide) {
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, shortSide);
  for (const canvas of [dom.cvOrig, dom.cvReduced, dom.cvMask]) {
    canvas.width = width;
    canvas.height = height;
  }
}

function setConfirmThreshold(value, snap) {
  const v = activeVideo();
  if (!v) return;
  const min = Number(dom.sConfirm.min);
  const max = Number(dom.sConfirm.max);
  // Light snap to the "no magenta" point — only when dragging the slider, not for ± steps.
  if (snap) {
    const nm = v.noMagentaThreshold;
    if (nm != null && nm >= min && Math.abs(value - nm) <= 2) value = nm;
  }
  value = Math.max(min, Math.min(max, Math.round(value)));
  dom.sConfirm.value = value;
  v.confirmThreshold = value;
  v.processedCache = new Map();
  v.maskCache = new Map();
  dom.vConfirm.textContent = value;
  updateConfStepperBounds(value);
  const m = dom.metrics.querySelector(".metric:nth-child(2) .metric-value");
  if (m) m.textContent = String(value);
  if (!state.playing) drawActiveFrame();
  requestPlotDraw();
}

function changeConfirmThreshold(delta) {
  const v = activeVideo();
  if (!v) return;
  setConfirmThreshold(Number(v.confirmThreshold) + delta, false);
}

function updateConfStepperBounds(value) {
  const min = Number(dom.sConfirm.min);
  const max = Number(dom.sConfirm.max);
  const val = value == null ? Number(dom.sConfirm.value) : value;
  dom.confMinus.disabled = val <= min;
  dom.confPlus.disabled = val >= max;
}

// Fallback estimate from the analyzed color sample (used only if no preview frame is drawn yet).
function computeNoMagenta(v) {
  const reps = v.analysis.representatives;
  const samples = v.analysis.sampleColors || [];
  let maxSq = 0;
  for (const c of samples) {
    let nd = Infinity;
    for (const r of reps) {
      const dr = c[0] - r[0], dg = c[1] - r[1], db = c[2] - r[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < nd) nd = d;
    }
    if (nd > maxSq) maxSq = nd;
  }
  return Math.ceil(Math.sqrt(maxSq));
}

// Exact "no magenta" threshold for the CURRENTLY DISPLAYED frame: the farthest pixel's distance
// to its nearest representative, computed from the same pixels the mask uses (the Original canvas).
// Recomputed against the active representatives, so it tracks changes in the color count (K).
function computeFrameNoMagenta(v) {
  if (!dom.cvOrig.width || !dom.cvOrig.height) return computeNoMagenta(v);
  try {
    const data = dom.cvOrig.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, dom.cvOrig.width, dom.cvOrig.height).data;
    return computeNoMagentaFromData(data, v.analysis.representatives);
  } catch (e) {
    return computeNoMagenta(v);
  }
}

function computeNoMagentaFromData(data, reps) {
  if (!reps || !reps.length) return 0;
  const seen = new Set();
  let maxSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (seen.has(key)) continue;
    seen.add(key);
    let nd = Infinity;
    for (const r of reps) {
      const dr = data[i] - r[0], dg = data[i + 1] - r[1], db = data[i + 2] - r[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < nd) nd = d;
    }
    if (nd > maxSq) maxSq = nd;
  }
  return Math.ceil(Math.sqrt(maxSq));
}

function positionSnapMarker(v, nm) {
  const min = Number(dom.sConfirm.min);
  const exact = Math.max(min, Math.ceil(Number(nm) || 0));
  v.noMagentaThreshold = exact;
  // Expanding the max is fine, but marker updates must never lower the user's chosen threshold.
  const current = Math.max(Number(dom.sConfirm.value) || 0, Number(v.confirmThreshold) || 0);
  const max = Math.max(150, exact + 8, current);
  dom.sConfirm.max = max;
  const frac = max === min ? 0 : Math.max(0, Math.min(1, (exact - min) / (max - min)));
  dom.snapMarker.style.left = `calc(9px + ${frac} * (100% - 18px))`;
  dom.snapMarker.hidden = false;
  updateConfStepperBounds(v.confirmThreshold);
}

function updateSnapMarker(v) {
  if (!v || !v.analysis) { dom.snapMarker.hidden = true; return; }
  positionSnapMarker(v, computeFrameNoMagenta(v));
}

function updateSnapMarkerFromImageData(v, data) {
  if (!v || !v.analysis) { dom.snapMarker.hidden = true; return; }
  positionSnapMarker(v, computeNoMagentaFromData(data, v.analysis.representatives));
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
  updateSnapMarkerFromImageData(v, base.data);
}

async function togglePlay(loop) {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  if (state.playing) {
    // same button → stop; other button → switch play mode while keeping playback
    if (state.loop === loop) { stopPlay(); return; }
    state.loop = loop;
    dom.workVideo.loop = loop;
    updatePlayButtons();
    return;
  }
  state.playing = true;
  state.loop = loop;
  dom.workVideo.loop = loop;
  dom.workVideo.muted = true;
  if (dom.workVideo.ended) dom.workVideo.currentTime = 0;
  updatePlayButtons();
  try { await dom.workVideo.play(); } catch (err) { stopPlay(); return; }
  const tick = () => {
    if (!state.playing || dom.workVideo.paused || (dom.workVideo.ended && !state.loop)) { stopPlay(); return; }
    drawActiveFrame();
    state.rafPreview = requestAnimationFrame(tick);
  };
  state.rafPreview = requestAnimationFrame(tick);
}

function stopPlay() {
  state.playing = false;
  state.loop = false;
  dom.workVideo.loop = false;
  if (state.rafPreview) { cancelAnimationFrame(state.rafPreview); state.rafPreview = null; }
  if (!dom.workVideo.paused) dom.workVideo.pause();
  updatePlayButtons();
}

function updatePlayButtons() {
  if (!state.playing) {
    dom.playBtn.textContent = "▶ 再生";
    dom.loopBtn.textContent = "🔁 連続再生";
  } else if (state.loop) {
    dom.playBtn.textContent = "▶ 再生";
    dom.loopBtn.textContent = "⏸ 停止";
  } else {
    dom.playBtn.textContent = "⏸ 停止";
    dom.loopBtn.textContent = "🔁 連続再生";
  }
}

/* ============================ 3D RGB plot ============================ */

function attachPlot() {
  if (state.plotBound) return;
  state.plotBound = true;
  const el = dom.cvPlot;
  const backingK = () => { const r = el.getBoundingClientRect(); return r.width ? el.width / r.width : 2; };
  const touchMid = (e) => { const a = e.touches[0], b = e.touches[1]; return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; };
  const touchDist = (e) => { const a = e.touches[0], b = e.touches[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };

  el.addEventListener("contextmenu", (e) => e.preventDefault());

  // mouse: left = rotate, right / middle / Shift+left = pan
  el.addEventListener("mousedown", (e) => {
    state.plotDragging = true;
    state.plotMode = (e.button === 2 || e.button === 1 || e.shiftKey) ? "pan" : "rotate";
    state.plotLast = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!state.plotDragging) return;
    applyPlotDrag(e.clientX - state.plotLast.x, e.clientY - state.plotLast.y, backingK());
    state.plotLast = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("mouseup", () => { state.plotDragging = false; });

  // touch: 1 finger = rotate, 2 fingers = pan + pinch-zoom
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      state.plotDragging = true; state.plotMode = "pan";
      state.plotLast = touchMid(e); state.pinchDist = touchDist(e);
    } else if (e.touches.length === 1) {
      state.plotDragging = true; state.plotMode = "rotate";
      state.plotLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!state.plotDragging) return;
    if (e.touches.length === 2) {
      const m = touchMid(e);
      applyPlotDrag(m.x - state.plotLast.x, m.y - state.plotLast.y, backingK(), true);
      state.plotLast = m;
      const d = touchDist(e);
      if (state.pinchDist && d) zoomPlot(d / state.pinchDist);
      state.pinchDist = d;
    } else if (e.touches.length === 1) {
      applyPlotDrag(e.touches[0].clientX - state.plotLast.x, e.touches[0].clientY - state.plotLast.y, backingK());
      state.plotLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  window.addEventListener("touchend", () => { state.plotDragging = false; state.pinchDist = 0; });
}

function applyPlotDrag(dx, dy, k, forcePan) {
  if (forcePan || state.plotMode === "pan") {
    state.plotPan.x += dx * k;
    state.plotPan.y += dy * k;
  } else {
    state.plotRot.yaw += dx * 0.01;
    state.plotRot.pitch = Math.max(-1.4, Math.min(1.4, state.plotRot.pitch + dy * 0.01));
  }
  requestPlotDraw();
}

// On-demand drawing (no auto-rotation): redraw only on interaction / state change.
function requestPlotDraw() {
  if (state.step !== 3) return;
  if (state.rafPlot) return;
  state.rafPlot = requestAnimationFrame(() => { state.rafPlot = null; drawPlot(); });
}

function startPlot() { requestPlotDraw(); }

function stopPlot() {
  if (state.rafPlot) { cancelAnimationFrame(state.rafPlot); state.rafPlot = null; }
}

function zoomPlot(factor) {
  state.plotZoom = Math.max(0.4, Math.min(6, state.plotZoom * factor));
  requestPlotDraw();
}

function onPlotWheel(e) {
  e.preventDefault();
  zoomPlot(e.deltaY < 0 ? 1.12 : 0.89);
}

function resetPlotView() {
  state.plotRot = { yaw: 0.6, pitch: -0.45 };
  state.plotZoom = 1;
  state.plotPan = { x: 0, y: 0 };
  requestPlotDraw();
}

function togglePlotFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (dom.plotWrap.requestFullscreen) {
    dom.plotWrap.requestFullscreen().then(() => setTimeout(requestPlotDraw, 80)).catch(() => {});
  }
}

function buildPlotCache(v) {
  // Precompute normalized positions and each sample's distance to its nearest representative.
  const reps = v.analysis.representatives;
  const samples = v.analysis.sampleColors || [];
  const repPts = reps.map((c) => ({ r: c[0], g: c[1], b: c[2], x: c[0] / 127.5 - 1, y: c[1] / 127.5 - 1, z: c[2] / 127.5 - 1 }));
  const samplePts = samples.map((c) => {
    let nd = Infinity;
    for (const r of reps) {
      const dr = c[0] - r[0], dg = c[1] - r[1], db = c[2] - r[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < nd) nd = d;
    }
    return { r: c[0], g: c[1], b: c[2], x: c[0] / 127.5 - 1, y: c[1] / 127.5 - 1, z: c[2] / 127.5 - 1, nd: Math.sqrt(nd) };
  });
  return { idx: state.activeIdx, k: v.activeK, repPts, samplePts };
}

function drawPlot() {
  const cv = dom.cvPlot;
  const v = activeVideo();
  if (!cv || !v || !v.analysis) return;

  // Crisp backing store at 2× CSS size (follows the element's actual height → taller plot).
  const rect = cv.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const targetW = Math.round(rect.width * 2);
  const targetH = Math.round(rect.height * 2);
  if (cv.width !== targetW || cv.height !== targetH) { cv.width = targetW; cv.height = targetH; }

  if (!state.plotCache || state.plotCache.idx !== state.activeIdx || state.plotCache.k !== v.activeK) {
    state.plotCache = buildPlotCache(v);
  }
  const cache = state.plotCache;
  const threshold = v.confirmThreshold;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, W, H);

  const yaw = state.plotRot.yaw, pitch = state.plotRot.pitch;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cxp = Math.cos(pitch), sxp = Math.sin(pitch);
  const cxv = W / 2 + state.plotPan.x, cyv = H / 2 + H * 0.04 + state.plotPan.y, scale = Math.min(W, H) * 0.46 * state.plotZoom, dist = 3.6;
  const proj = (x, y, z) => {
    let X = x * cyw - z * syw, Z = x * syw + z * cyw;
    let Y = y * cxp - Z * sxp; Z = y * sxp + Z * cxp;
    const f = dist / (dist - Z);
    return { x: cxv + X * scale * f, y: cyv - Y * scale * f, depth: Z, f };
  };

  // axes (R/G/B from the black corner)
  const O = proj(-1, -1, -1);
  const axes = [[1, -1, -1, "#ff5b50", "R"], [-1, 1, -1, "#5fd36a", "G"], [-1, -1, 1, "#5a9bff", "B"]];
  ctx.lineWidth = 2.5;
  axes.forEach((a) => {
    const P = proj(a[0], a[1], a[2]);
    ctx.strokeStyle = a[3];
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(P.x, P.y); ctx.stroke();
    ctx.fillStyle = a[3]; ctx.font = "bold 22px sans-serif"; ctx.fillText(a[4], P.x + 6, P.y + 6);
  });

  // Point/node radius scales with zoom (and perspective) so zooming out shrinks the dots
  // instead of leaving them large and overlapping into a blurry blob.
  const z = state.plotZoom;
  // points: magenta if farther than threshold from nearest representative, else true color
  const baseR = Math.max(0.8, 2.4 * (W / 1400)) * z;
  const draw = cache.samplePts.map((p) => {
    const P = proj(p.x, p.y, p.z);
    return { sx: P.x, sy: P.y, depth: P.depth, f: P.f, p };
  }).sort((a, b) => a.depth - b.depth);
  draw.forEach((d) => {
    const out = d.p.nd > threshold;
    ctx.beginPath();
    ctx.arc(d.sx, d.sy, Math.max(0.5, (out ? baseR * 1.5 : baseR) * d.f), 0, 7);
    ctx.fillStyle = out ? "#ff35ff" : `rgb(${d.p.r},${d.p.g},${d.p.b})`;
    ctx.globalAlpha = out ? 0.95 : 0.62;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // threshold spheres (wireframe great circles) + representative nodes
  const rNorm = threshold / 127.5;
  const nodeR = Math.max(1.5, 7 * (W / 1400) * z);
  const sorted = cache.repPts.map((c) => ({ c, depth: proj(c.x, c.y, c.z).depth })).sort((a, b) => a.depth - b.depth);
  sorted.forEach(({ c }) => {
    const col = `rgb(${c.r},${c.g},${c.b})`;
    drawWireSphere(ctx, proj, c.x, c.y, c.z, rNorm, col);
    const P = proj(c.x, c.y, c.z);
    ctx.beginPath();
    ctx.arc(P.x, P.y, Math.max(1.5, nodeR * P.f), 0, 7);
    ctx.fillStyle = col; ctx.globalAlpha = 1; ctx.fill();
    ctx.lineWidth = Math.max(1, 2.5 * Math.min(1.5, z)); ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawWireSphere(ctx, proj, cx, cy, cz, r, color) {
  if (r <= 0) return;
  const SEG = 30;
  // three great circles, one in each coordinate plane
  const circles = [
    (t) => [cx + r * Math.cos(t), cy + r * Math.sin(t), cz],
    (t) => [cx + r * Math.cos(t), cy, cz + r * Math.sin(t)],
    (t) => [cx, cy + r * Math.cos(t), cz + r * Math.sin(t)],
  ];
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  for (const f of circles) {
    ctx.beginPath();
    for (let i = 0; i <= SEG; i += 1) {
      const t = (i / SEG) * Math.PI * 2;
      const p = f(t);
      const P = proj(p[0], p[1], p[2]);
      if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ============================ step4 export (batch) ============================ */

function renderStep4() {
  const dones = doneVideos();
  const sel = dones.filter((v) => v.save);
  dom.selCountText.textContent = `${sel.length} / ${dones.length} 件 選択中`;
  renderStep4List();
  // Keep the export button available after a save so the user can re-export
  // (e.g. change the format or which videos are selected, then save again).
  dom.exportBtn.hidden = state.exporting;
  dom.exportBtn.textContent = state.exported
    ? `⬇ もう一度書き出す（${sel.length} 件）`
    : `⬇ 選択した ${sel.length} 件を書き出す`;
  dom.exportBtn.classList.toggle("disabled", sel.length === 0);
  dom.exportingBox.hidden = !state.exporting;
  dom.exportedBox.hidden = !state.exported;
  if (state.exported) {
    const okCount = dones.filter((v) => v.exportDone).length;
    dom.exportedText.textContent = state.exportDirName
      ? `${okCount} 件を「${state.exportDirName}」フォルダに保存しました（形式や対象を変えて、もう一度書き出せます）`
      : `${okCount} 件をダウンロードフォルダに保存しました（形式や対象を変えて、もう一度書き出せます）`;
  }
}

function renderStep4List() {
  const dones = doneVideos();
  dom.step4List.innerHTML = dones.map((v) => {
    const pct = Math.round(v.exportProgress || 0);
    const okDone = v.exportDone && (v.savedToDir || v.exportUrl);
    let statusText, statusCls = "";
    if (state.exported) {
      statusText = v.save ? (okDone ? (v.savedToDir ? "✓ フォルダに保存" : "✓ 完了") : "失敗") : "対象外";
      statusCls = v.save && okDone ? "done" : (v.save ? "" : "off");
    } else if (state.exporting) {
      statusText = v.save ? pct + "%" : "対象外"; statusCls = v.save ? "" : "off";
    } else {
      statusText = v.save ? "保存する" : "保存しない"; statusCls = v.save ? "" : "off";
    }
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
  if (v) { v.save = !v.save; state.exported = false; renderStep4(); }
}

function setAllSave(on) {
  if (state.exporting) return;
  doneVideos().forEach((v) => { v.save = on; });
  state.exported = false;
  renderStep4();
}

/* ---------- format helpers ---------- */
function formatById(id) {
  return EXPORT_FORMATS.find((f) => f.id === id) || EXPORT_FORMATS.find((f) => f.id === "webm-fast");
}

function initFormatSelect() {
  dom.formatSelect.innerHTML = EXPORT_FORMATS.map((f) => `<option value="${f.id}">${esc(f.label)}</option>`).join("");
  dom.formatSelect.value = state.exportFormat;
  syncFormatDesc();
}

function syncFormatDesc() {
  const f = formatById(state.exportFormat);
  dom.fmtDesc.textContent = f.desc + (f.via === "ffmpeg" ? "（ffmpegで変換するため時間がかかります）" : "");
  dom.fmtInfo.setAttribute("data-tip", EXPORT_FORMATS.map((x) => `■ ${x.label}\n${x.desc}`).join("\n\n"));
}

async function exportSelected() {
  const sel = doneVideos().filter((v) => v.save);
  if (!sel.length) { showToast("info", "保存する動画を選んでください"); return; }
  const fmt = formatById(state.exportFormat);
  if (fmt.via === "mediarecorder" && !supportsRecording()) {
    showToast("error", "このブラウザは WebM 書き出しに対応していません。別の形式をお試しください。");
    return;
  }

  // Ask for a save folder up front (must run within the click gesture, before any await).
  // If the user cancels (or the folder is blocked by the browser), STOP — do not download.
  // Downloading happens only when "保存先フォルダを選ぶ" is OFF (or unsupported).
  const usePicker = state.useFolderPicker && !!window.showDirectoryPicker;
  let dirHandle = null;
  if (usePicker) {
    try {
      dirHandle = await window.showDirectoryPicker({ id: "palette-reducer", mode: "readwrite" });
    } catch (err) {
      showToast("info", "保存先フォルダを選ばなかったので、書き出しを中止しました。ダウンロードフォルダに保存したいときは「保存先フォルダを選ぶ」をオフにしてください。");
      return;
    }
  }
  state.exportDir = dirHandle;
  state.exportDirName = dirHandle ? dirHandle.name : "";

  state.exporting = true;
  state.exported = false;
  state.cancelled = false;
  dom.stopExportBtn.disabled = false;
  stopPlay();
  sel.forEach((v) => {
    v.exportProgress = 0; v.exportDone = false; v.savedToDir = false; v.exportBlob = null;
    if (v.exportUrl) { URL.revokeObjectURL(v.exportUrl); v.exportUrl = null; }
  });
  render();

  for (const v of sel) {
    if (state.cancelled) break;
    try {
      if (fmt.via === "mediarecorder") await exportViaMediaRecorder(v, fmt);
      else await exportViaFFmpeg(v, fmt);
      if (state.cancelled) break;
      if (dirHandle) {
        const fh = await dirHandle.getFileHandle(v.exportName, { create: true });
        const writable = await fh.createWritable();
        await writable.write(v.exportBlob);
        await writable.close();
        v.savedToDir = true;
      } else {
        v.exportUrl = URL.createObjectURL(v.exportBlob);
        triggerDownload(v); // download mode: save to the browser's download folder right away
      }
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
  const okCount = sel.filter((v) => v.exportDone).length;
  if (!okCount) { showToast("error", "書き出しに失敗しました。別の形式をお試しください。"); return; }
  if (dirHandle) showToast("success", `${okCount}件を「${state.exportDirName}」フォルダに保存しました`);
  else showToast("success", `${okCount}件をダウンロードフォルダに保存しました（保存先はブラウザの設定によります）`);
}

// Cancel an in-progress export (including the slow ffmpeg encode of the current video).
function stopExport() {
  if (!state.exporting) return;
  state.cancelled = true;
  dom.stopExportBtn.disabled = true;
  if (state.activeRecorder && state.activeRecorder.state !== "inactive") {
    try { state.activeRecorder.stop(); } catch (e) { /* ignore */ }
  }
  // ffmpeg.exec can't be flag-interrupted mid-encode, so tear down the worker to abort it.
  if (state.ffmpeg) {
    try { state.ffmpeg.terminate(); } catch (e) { /* ignore */ }
    state.ffmpeg = null;
    state.ffmpegLoaded = false;
  }
  try { dom.workVideo.pause(); } catch (e) { /* ignore */ }
}

// Download mode: programmatically save to the browser's download folder.
function triggerDownload(v) {
  if (!v.exportUrl) return;
  const a = document.createElement("a");
  a.href = v.exportUrl;
  a.download = v.exportName || makeOutputName(v.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Fast path: browser MediaRecorder → WebM.
async function exportViaMediaRecorder(v, fmt) {
  resetWorkVideo();
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  await ensureMetadata(dom.workVideo);
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, v.analysis.settings.previewShortSide);
  dom.exportCanvas.width = width;
  dom.exportCanvas.height = height;
  const ctx = dom.exportCanvas.getContext("2d", { willReadFrequently: true });
  const stream = dom.exportCanvas.captureStream(EXPORT_FPS);
  const mimeType = chooseRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.activeRecorder = recorder;
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  dom.workVideo.muted = true;
  dom.workVideo.currentTime = 0;
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
  v.exportBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
  v.exportName = makeOutputName(v.name, fmt.ext);
  v.exportSize = v.exportBlob.size;
}

// Quality path: render reduced frames to PNGs and encode with ffmpeg.wasm (lossless / ProRes / etc).
async function exportViaFFmpeg(v, fmt) {
  const ffmpeg = await getFFmpeg();
  resetWorkVideo();
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  await ensureMetadata(dom.workVideo);
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, v.analysis.settings.previewShortSide);
  dom.exportCanvas.width = width;
  dom.exportCanvas.height = height;
  const ctx = dom.exportCanvas.getContext("2d", { willReadFrequently: true });
  const dur = dom.workVideo.duration || 1;
  const total = Math.max(1, Math.min(3600, Math.round(dur * EXPORT_FPS)));
  const reps = v.analysis.representatives;
  const th = v.confirmThreshold;
  const names = [];
  for (let i = 0; i < total; i += 1) {
    if (state.cancelled) break;
    await seekVideo(dom.workVideo, Math.min(dur - 0.001, Math.max(0.001, i / EXPORT_FPS)));
    ctx.drawImage(dom.workVideo, 0, 0, width, height);
    const img = ctx.getImageData(0, 0, width, height);
    processPixels(img.data, reps, th, v.processedCache, false);
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise((res) => dom.exportCanvas.toBlob(res, "image/png"));
    const name = `f${String(i).padStart(5, "0")}.png`;
    await ffmpeg.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
    names.push(name);
    v.exportProgress = (i / total) * 80;
    updateExport(v);
  }
  const cleanup = async () => { for (const n of names) await deleteFFmpegFile(ffmpeg, n); };
  if (state.cancelled) { await cleanup(); return; }
  const outName = "out." + fmt.ext;
  v.exportProgress = 82; updateExport(v);
  let code;
  try {
    code = await ffmpeg.exec(["-y", "-framerate", String(EXPORT_FPS), "-i", "f%05d.png", ...fmt.args, outName]);
  } catch (e) {
    await cleanup();
    throw e;
  }
  if (code !== 0) { await cleanup(); await deleteFFmpegFile(ffmpeg, outName); throw new Error(`encode failed (${code})`); }
  const data = await ffmpeg.readFile(outName);
  v.exportBlob = new Blob([data.buffer], { type: fmt.mime });
  v.exportName = makeOutputName(v.name, fmt.ext);
  v.exportSize = v.exportBlob.size;
  await cleanup();
  await deleteFFmpegFile(ffmpeg, outName);
  v.exportProgress = 99; updateExport(v);
}

function updateExport(v) {
  const row = document.getElementById("save-" + v.id);
  if (!row) return;
  const bar = row.querySelector(".bar > i");
  if (bar) bar.style.width = Math.round(v.exportProgress) + "%";
  const st = row.querySelector(".save-status");
  if (st && v.save) st.textContent = Math.round(v.exportProgress) + "%";
}

// "最初に戻る" — full reset back to the very first step (clears loaded videos so the
// 4-step rail returns to its initial state: only step 1 active, the rest 未着手).
function restart() {
  stopPlay();
  stopPlot();
  cancelAdvancedPreview();
  state.videos.forEach(releaseVideo);
  state.videos = [];
  state.activeIdx = 0;
  state.step = 1;
  state.exported = false;
  state.exporting = false;
  state.exportDir = null;
  state.exportDirName = "";
  state.preset = "recommend";
  state.advanced = false;
  state.detailsOpen = false;
  state.thresholdMode = "auto";
  state.vals = { ...DEFAULT_VALS };
  state.plotCache = null;
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
  const dur = Math.max(0, video.duration - 0.001);
  let target = Math.min(time, dur);
  // Seeking to exactly 0 from 0 fires no "seeked" event (no position change),
  // so a fresh video never decodes a frame. Nudge to a small epsilon near the start.
  if (target < 0.03 && dur > 0.03) target = 0.03;
  await seekVideo(video, target);
  const { width, height } = scaledSize(video.videoWidth, video.videoHeight, shortSide);
  const canvas = createWorkCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create frame canvas");
  ctx.drawImage(video, 0, 0, width, height);
  return { width, height, imageData: ctx.getImageData(0, 0, width, height) };
}

function createWorkCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
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
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return waitForVideoFrame(video);
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error(`Timed out while seeking video to ${formatNumber(time, 3)}s`)); }, 30000);
    const onSeeked = () => { cleanup(); waitForVideoFrame(video).then(resolve); };
    const onError = () => { cleanup(); reject(new Error("Video seek failed")); };
    const cleanup = () => { window.clearTimeout(timeout); video.removeEventListener("seeked", onSeeked); video.removeEventListener("error", onError); };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    try {
      video.currentTime = time;
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function waitForVideoFrame(video) {
  return new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback === "function") {
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        resolve();
      }, 250);
      video.requestVideoFrameCallback(() => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve();
      });
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(resolve));
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
  const src = createWorkCanvas(imageData.width, imageData.height);
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

function makeOutputName(inputName, ext) {
  const base = inputName.replace(/\.[^.]+$/, "") || "palette-reduced";
  return `${base}-reduced.${ext || formatById(state.exportFormat).ext}`;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

init();
