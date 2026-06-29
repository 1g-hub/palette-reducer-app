"use strict";

const APP_VERSION = "20260623-68";

const $ = (id) => document.getElementById(id);
const dom = {
  // header / rail
  modeSwitch: $("modeSwitch"),
  rail: $("rail"),
  // steps
  step1: $("step1"), step2: $("step2"), analyzing: $("analyzing"), step3: $("step3"), step4: $("step4"), step5: $("step5"),
  toStep5Btn: $("toStep5Btn"), backToStep4: $("backToStep4"), mergeNoScene: $("mergeNoScene"),
  mergeSceneL: $("mergeSceneL"), mergeSceneR: $("mergeSceneR"), mergeGroupList: $("mergeGroupList"),
  mergeModeBtn: $("mergeModeBtn"), mergeRegionBtn: $("mergeRegionBtn"), mergeModeHint: $("mergeModeHint"), mergeActionRow: $("mergeActionRow"), mergeDoBtn: $("mergeDoBtn"), mergeClearSelBtn: $("mergeClearSelBtn"),
  mergeCanvasL: $("mergeCanvasL"), mergeCanvasR: $("mergeCanvasR"), mergeLoupeL: $("mergeLoupeL"), mergeLoupeR: $("mergeLoupeR"),
  mergeProgressL: $("mergeProgressL"), mergeProgressR: $("mergeProgressR"),
  mergeCancelL: $("mergeCancelL"), mergeCancelR: $("mergeCancelR"),
  mergePlayL: $("mergePlayL"), mergePlayR: $("mergePlayR"), mergeBackL: $("mergeBackL"), mergeBackR: $("mergeBackR"),
  mergeFwdL: $("mergeFwdL"), mergeFwdR: $("mergeFwdR"), mergeSeekL: $("mergeSeekL"), mergeSeekR: $("mergeSeekR"),
  mergeRateL: $("mergeRateL"), mergeRateR: $("mergeRateR"), mergeTimeL: $("mergeTimeL"), mergeTimeR: $("mergeTimeR"),
  mergeChipsL: $("mergeChipsL"), mergeChipsR: $("mergeChipsR"),
  mergePanel: $("mergePanel"), mergeTargets: $("mergeTargets"), mergeConfirmBtn: $("mergeConfirmBtn"), mergeCancelBtn: $("mergeCancelBtn"),
  cmpPlot1: $("cmpPlot1"), cmpPlot2: $("cmpPlot2"), cmpPlot3: $("cmpPlot3"), cmpCol3: $("cmpCol3"),
  // step1
  dropzone: $("dropzone"), fileInput: $("fileInput"),
  step1Added: $("step1Added"), addedCount: $("addedCount"), clearAllBtn: $("clearAllBtn"),
  step1List: $("step1List"), toStep2Btn: $("toStep2Btn"),
  // step2
  backToStep1: $("backToStep1"), step2Desc: $("step2Desc"),
  analyzeBtn: $("analyzeBtn"), analyzeBtnLabel: $("analyzeBtnLabel"),
  advancedToggle: $("advancedToggle"), advancedCaret: $("advancedCaret"), advancedBody: $("advancedBody"),
  resetAdvancedBtn: $("resetAdvancedBtn"),
  advPrevTabs: $("advPrevTabs"), advPrevName: $("advPrevName"), advPrevStatus: $("advPrevStatus"),
  cvPrevOrig: $("cvPrevOrig"), cvPrevReduced: $("cvPrevReduced"),
  chkAnaFull: $("chkAnaFull"), chkPrevFull: $("chkPrevFull"),
  // analyzing
  analyzingDesc: $("analyzingDesc"), analyzingList: $("analyzingList"),
  scenePreviewBox: $("scenePreviewBox"), scenePreviewTitle: $("scenePreviewTitle"), scenePreviewList: $("scenePreviewList"),
  scenePreviewActions: $("scenePreviewActions"), scenePreviewConfirm: $("scenePreviewConfirm"), scenePreviewBack: $("scenePreviewBack"),
  elapsedText: $("elapsedText"), stopAnalyzeBtn: $("stopAnalyzeBtn"),
  reassure: $("reassure"), transcodeNote: $("transcodeNote"), transcodeText: $("transcodeText"),
  // step3
  backToStep2: $("backToStep2"), playBtn: $("playBtn"), previewRateSelect: $("previewRateSelect"),
  step3Tabs: $("step3Tabs"), sceneTabs: $("sceneTabs"), activeName: $("activeName"),
  cvOrig: $("cvOrig"), cvReduced: $("cvReduced"), cvMask: $("cvMask"),
  previewSeek: $("previewSeek"), previewTime: $("previewTime"), cutMarkers: $("cutMarkers"),
  previewLargeBtn: $("previewLargeBtn"), frameBackBtn: $("frameBackBtn"), frameFwdBtn: $("frameFwdBtn"),
  vConfirm: $("vConfirm"), sConfirm: $("sConfirm"), resetConfirm: $("resetConfirm"), snapMarker: $("snapMarker"),
  confMinus: $("confMinus"), confPlus: $("confPlus"),
  kMinus: $("kMinus"), kValue: $("kValue"), kPlus: $("kPlus"), kRange: $("kRange"), sK: $("sK"),
  paletteCount: $("paletteCount"), palette: $("palette"), reducedLoupe: $("reducedLoupe"), cvPlot: $("cvPlot"), plotWrap: $("plotWrap"),
  plotZoomIn: $("plotZoomIn"), plotZoomOut: $("plotZoomOut"), plotReset: $("plotReset"), plotFull: $("plotFull"),
  detailsToggle: $("detailsToggle"), detailsCaret: $("detailsCaret"), detailsBody: $("detailsBody"),
  metrics: $("metrics"), ktableBody: $("ktableBody"), toStep4Btn: $("toStep4Btn"),
  // step4
  backToStep3: $("backToStep3"), selCountText: $("selCountText"),
  selectAllBtn: $("selectAllBtn"), deselectAllBtn: $("deselectAllBtn"), step4List: $("step4List"),
  formatSelect: $("formatSelect"), fmtInfo: $("fmtInfo"), fmtDesc: $("fmtDesc"),
  exportModeSeg: $("exportModeSeg"), exportModeDesc: $("exportModeDesc"),
  folderPickRow: $("folderPickRow"), useFolderPicker: $("useFolderPicker"), folderHint: $("folderHint"),
  exportBtn: $("exportBtn"), exportingBox: $("exportingBox"), exportingText: $("exportingText"), stopExportBtn: $("stopExportBtn"),
  exportedBox: $("exportedBox"), exportedText: $("exportedText"), restartBtn: $("restartBtn"),
  // toast / work
  toast: $("toast"),
  workVideo: $("workVideo"), exportCanvas: $("exportCanvas"),
  // sliders
  sAna: $("sAna"), sPrev: $("sPrev"), sMaxc: $("sMaxc"), sMindist: $("sMindist"),
  sMink: $("sMink"), sMaxk: $("sMaxk"),
  vAna: $("vAna"), vPrev: $("vPrev"), vMaxc: $("vMaxc"), vMindist: $("vMindist"),
  vMink: $("vMink"), vMaxk: $("vMaxk"),
  // scene-cut detection sliders (STEP2, scene mode)
  sceneDetectGroup: $("sceneDetectGroup"),
  cutModeSeg: $("cutModeSeg"), targetScenesField: $("targetScenesField"),
  sCutSens: $("sCutSens"), vCutSens: $("vCutSens"), sTargetScenes: $("sTargetScenes"), vTargetScenes: $("vTargetScenes"),
  sSubshot: $("sSubshot"), vSubshot: $("vSubshot"), sDetectStride: $("sDetectStride"), vDetectStride: $("vDetectStride"),
  sMinShot: $("sMinShot"), vMinShot: $("vMinShot"),
};

const NATIVE_RES = 100000; // sentinel → scaledSize keeps native resolution
const SCENE_REVIEW_SHORT_SIDE = 1080; // extract review frames near input resolution
const EXPORT_FPS = 24; // frame rate used when re-encoding via ffmpeg.wasm
const EXPORT_KEYFRAME_INTERVAL = EXPORT_FPS * 5;
const EXPORT_ENCODER_FLUSH_QUEUE = 64;
const EXPORT_PROGRESS_STEP = 6;
const EXPORT_MODE_DESCS = {
  safe: "低速ですが、WebCodecsで1フレームずつ正確に時刻を付けて書き出します。1フレームも飛ばしたくない場合はこちら。",
  fast: "再生しながら各フレームを取り込み、WebCodecsで実時間に近い速度で書き出します。壁時計フリーズは起きません（極端に重い場面でごく一部のフレームが間引かれることがあります）。",
};

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
  { id: "webm-fast", label: "WebM（標準・速い）", ext: "webm", mime: "video/webm", via: "webcodecs", enc: "libvpx",
    args: ["-c:v", "libvpx", "-b:v", "2M", ...VF_FULL("yuv420p"), ...FULLRANGE_709],
    desc: "WebCodecsで書き出します（完全＝1フレームずつ正確／高速＝再生しながら取り込み）。ffmpegの読み込みが不要で、画質は標準的です。" },
  { id: "mp4-low", label: "MP4 低ビットレート（小さい）", ext: "mp4", mime: "video/mp4", via: "ffmpeg", enc: "libx264",
    args: ["-c:v", "libx264", "-b:v", "800k", ...VF_FULL("yuv420p"), ...FULLRANGE_709, "-movflags", "+faststart"],
    desc: "容量を小さく抑えたいとき向け。画質は落ちます。共有・アップロードに。" },
  { id: "webm-low", label: "WebM 低ビットレート（小さい）", ext: "webm", mime: "video/webm", via: "ffmpeg", enc: "libvpx-vp9",
    args: ["-c:v", "libvpx-vp9", "-b:v", "500k", ...VF_FULL("yuv420p"), ...FULLRANGE_709],
    desc: "WebMで容量を抑えたいとき向け。画質は落ちます。" },
];
const DEFAULT_VALS = { ana: 540, prev: 360, anaFull: true, prevFull: true, maxc: 1200, mindist: 12, mink: 4, maxk: 40, fixed: 60, margin: 5, targetScenes: 8, subshotSec: 0, cutSensitivity: 0.18, detectStride: 3, minShotSec: 1.0 };

// 高品質(ICM): when enabled, recoloring (preview + export) uses icm.js's label-field optimization +
// detail protection instead of nearest-color. Global (not per-scene); read at every recolor site.
const ICM_DEFAULTS = { enabled: false, beta: 2400, edgeSigma: 30, icmIters: 10, labelSmooth: 1, detailMode: "edgedark", darkLine: 14, edgeThresh: 110, hfThresh: 12, recompose: "detail" };

const state = {
  step: 1,
  wholeVideo: true, // true = whole-video (single palette, no scene split); false = scene-split mode
  sceneCutMode: "auto",
  sceneReview: null,
  icm: { ...ICM_DEFAULTS },
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
  exportMode: "safe",
  previewRate: 1,
  useFolderPicker: true,
  playing: false,
  loop: false,
  previewLayout: "row",
  previewZoom: 1,
  previewPopup: null,
  cancelled: false,
  vals: { ...DEFAULT_VALS },
  activeWorker: null,
  currentReject: null,
  activeEncoder: null,
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
  dom.modeSwitch.addEventListener("click", onModeClick);
  dom.clearAllBtn.addEventListener("click", clearVideos);
  dom.step1List.addEventListener("click", onListClick);
  dom.toStep2Btn.addEventListener("click", () => goStep(2));

  dom.backToStep1.addEventListener("click", () => goStep(1));
  dom.analyzeBtn.addEventListener("click", analyzeAll);
  dom.advancedToggle.addEventListener("click", () => { state.advanced = !state.advanced; syncAdvanced(); if (state.advanced) scheduleAdvancedPreview(); });
  dom.resetAdvancedBtn.addEventListener("click", resetAdvanced);
  dom.advPrevTabs.addEventListener("click", onAdvPrevTabClick);
  bindSlider(dom.sAna, dom.vAna, "ana");
  bindSlider(dom.sPrev, dom.vPrev, "prev");
  bindSlider(dom.sMaxc, dom.vMaxc, "maxc");
  bindSlider(dom.sMindist, dom.vMindist, "mindist");
  bindSlider(dom.sMink, dom.vMink, "mink");
  bindSlider(dom.sMaxk, dom.vMaxk, "maxk");
  bindSlider(dom.sCutSens, dom.vCutSens, "cutSensitivity");
  bindSlider(dom.sTargetScenes, dom.vTargetScenes, "targetScenes");
  bindSlider(dom.sSubshot, dom.vSubshot, "subshotSec");
  bindSlider(dom.sDetectStride, dom.vDetectStride, "detectStride");
  bindSlider(dom.sMinShot, dom.vMinShot, "minShotSec");

  dom.stopAnalyzeBtn.addEventListener("click", stopAnalyze);
  if (dom.cutModeSeg) dom.cutModeSeg.addEventListener("click", onCutModeClick);
  if (dom.scenePreviewList) dom.scenePreviewList.addEventListener("click", onScenePreviewClick);
  if (dom.scenePreviewConfirm) dom.scenePreviewConfirm.addEventListener("click", confirmSceneReview);
  if (dom.scenePreviewBack) dom.scenePreviewBack.addEventListener("click", stopAnalyze); // ← 戻る: シーン分割前(STEP2)へ

  dom.chkAnaFull.addEventListener("change", () => { state.vals.anaFull = dom.chkAnaFull.checked; syncSliders(); markCustomPreset(); scheduleAdvancedPreview(); });
  dom.chkPrevFull.addEventListener("change", () => { state.vals.prevFull = dom.chkPrevFull.checked; syncSliders(); markCustomPreset(); });

  dom.backToStep2.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(2); });
  dom.playBtn.addEventListener("click", () => togglePlay(true)); // 「再生」= ループ再生（最後まで→先頭へ繰り返し）
  dom.frameBackBtn.addEventListener("click", () => stepPreviewFrame(-1));
  dom.frameFwdBtn.addEventListener("click", () => stepPreviewFrame(1));
  dom.previewLargeBtn.addEventListener("click", openPreviewPopup);
  dom.previewRateSelect.addEventListener("change", () => {
    state.previewRate = Number(dom.previewRateSelect.value) || 1;
    applyPreviewRate();
  });
  dom.previewSeek.addEventListener("input", onPreviewSeekInput);
  dom.step3Tabs.addEventListener("click", onTabClick);
  dom.sceneTabs.addEventListener("click", onSceneTabClick);
  dom.plotZoomIn.addEventListener("click", () => zoomPlot(1.25));
  dom.plotZoomOut.addEventListener("click", () => zoomPlot(0.8));
  dom.plotReset.addEventListener("click", resetPlotView);
  dom.plotFull.addEventListener("click", togglePlotFullscreen);
  dom.cvPlot.addEventListener("wheel", onPlotWheel, { passive: false });
  document.addEventListener("fullscreenchange", () => requestPlotDraw());
  dom.sConfirm.addEventListener("input", (e) => { recordUndo("thr", true); setConfirmThreshold(+e.target.value, true); });
  dom.confMinus.addEventListener("click", () => { recordUndo("thr", false); changeConfirmThreshold(-1); });
  dom.confPlus.addEventListener("click", () => { recordUndo("thr", false); changeConfirmThreshold(1); });
  dom.resetConfirm.addEventListener("click", resetConfirmParams);
  dom.palette.addEventListener("click", onPaletteClick);
  document.addEventListener("keydown", onUndoKey); // STEP3: Ctrl+Z 戻す / Ctrl+Shift+Z・Ctrl+Y やり直し
  dom.cvReduced.addEventListener("mousemove", (e) => reducedLoupeMove(e.clientX, e.clientY));
  dom.cvReduced.addEventListener("mouseleave", () => { dom.reducedLoupe.hidden = true; });
  dom.cvReduced.addEventListener("click", (e) => reducedClickOff(e.clientX, e.clientY));
  dom.detailsToggle.addEventListener("click", () => { state.detailsOpen = !state.detailsOpen; syncDetails(); });
  dom.toStep4Btn.addEventListener("click", () => { stopPlay(); stopPlot(); goStep(4); });

  dom.backToStep3.addEventListener("click", () => goStep(3));
  dom.toStep5Btn.addEventListener("click", () => goStep(5));
  dom.backToStep4.addEventListener("click", () => goStep(4));
  dom.mergeSceneL.addEventListener("change", (e) => { const v = activeVideo(); if (!v) return; if (regionBusy(v, "L")) { e.target.value = String(v.mergeSceneL || 0); return; } v.mergeSceneL = Number(e.target.value); renderMergeGroups(v); setupMergePlayer("L"); });
  dom.mergeSceneR.addEventListener("change", (e) => { const v = activeVideo(); if (!v) return; if (regionBusy(v, "R")) { e.target.value = String(v.mergeSceneR || 0); return; } v.mergeSceneR = Number(e.target.value); renderMergeGroups(v); setupMergePlayer("R"); });
  dom.mergePlayL.addEventListener("click", () => mpTogglePlay("L"));
  dom.mergePlayR.addEventListener("click", () => mpTogglePlay("R"));
  dom.mergeBackL.addEventListener("click", () => mpStep("L", -1));
  dom.mergeFwdL.addEventListener("click", () => mpStep("L", 1));
  dom.mergeBackR.addEventListener("click", () => mpStep("R", -1));
  dom.mergeFwdR.addEventListener("click", () => mpStep("R", 1));
  dom.mergeSeekL.addEventListener("input", (e) => mpSeek("L", Number(e.target.value)));
  dom.mergeSeekR.addEventListener("input", (e) => mpSeek("R", Number(e.target.value)));
  dom.mergeRateL.addEventListener("change", (e) => { const mp = mergePlayers.L; const vb = activeVideo(); if (vb && regionBusy(vb, "L")) return; if (mp) { mp.rate = Number(e.target.value) || 1; try { mp.video.playbackRate = mp.rate; } catch (e2) { /* ignore */ } } });
  dom.mergeRateR.addEventListener("change", (e) => { const mp = mergePlayers.R; const vb = activeVideo(); if (vb && regionBusy(vb, "R")) return; if (mp) { mp.rate = Number(e.target.value) || 1; try { mp.video.playbackRate = mp.rate; } catch (e2) { /* ignore */ } } });
  dom.mergeModeBtn.addEventListener("click", toggleMergeMode);
  dom.mergeRegionBtn.addEventListener("click", toggleRegionMode);
  if (dom.mergeCancelL) dom.mergeCancelL.addEventListener("click", () => cancelRegionBuild("L"));
  if (dom.mergeCancelR) dom.mergeCancelR.addEventListener("click", () => cancelRegionBuild("R"));
  dom.mergeClearSelBtn.addEventListener("click", clearMergeSelection);
  dom.mergeCanvasL.addEventListener("click", (e) => mergePickAt("L", e.clientX, e.clientY));
  dom.mergeCanvasR.addEventListener("click", (e) => mergePickAt("R", e.clientX, e.clientY));
  dom.mergeCanvasL.addEventListener("mousemove", (e) => mergeLoupeMove("L", e.clientX, e.clientY));
  dom.mergeCanvasR.addEventListener("mousemove", (e) => mergeLoupeMove("R", e.clientX, e.clientY));
  dom.mergeCanvasL.addEventListener("mouseleave", () => { dom.mergeLoupeL.hidden = true; });
  dom.mergeCanvasR.addEventListener("mouseleave", () => { dom.mergeLoupeR.hidden = true; });
  dom.mergeChipsL.addEventListener("click", onMergeChipClick);
  dom.mergeChipsR.addEventListener("click", onMergeChipClick);
  dom.mergeDoBtn.addEventListener("click", openMergePanel);
  dom.mergeConfirmBtn.addEventListener("click", confirmMerge);
  dom.mergeCancelBtn.addEventListener("click", cancelMergePanel);
  dom.mergeTargets.addEventListener("click", onTargetClick);
  dom.mergeGroupList.addEventListener("click", onMergeGroupDel);
  dom.selectAllBtn.addEventListener("click", () => setAllSave(true));
  dom.deselectAllBtn.addEventListener("click", () => setAllSave(false));
  dom.step4List.addEventListener("click", onSaveListClick);
  dom.formatSelect.addEventListener("change", () => {
    state.exportFormat = dom.formatSelect.value;
    syncFormatDesc();
    if (state.step === 5 && !state.exporting) { state.exported = false; renderStep5(); }
  });
  dom.exportModeSeg.addEventListener("click", onExportModeClick);
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
  dom.sK.addEventListener("input", (e) => setK(Number(e.target.value)));

  attachPlot();
  attachTooltip();
  render();

  if (window.location.protocol === "file:") {
    showToast("error", "HTTPサーバー（GitHub Pages等）で開いてください。file:// では解析が動きません。");
  }
}

function bindSlider(slider, label, key) {
  if (!slider || !label) return;
  slider.addEventListener("input", () => {
    state.vals[key] = Number(slider.value);
    if (key === "ana" || key === "prev") label.textContent = slider.value + "px";
    else label.textContent = slider.value;
    markCustomPreset();
    scheduleAdvancedPreview();
  });
}

// Presets were removed from STEP2; kept as a no-op so existing slider/checkbox handlers stay unchanged.
function markCustomPreset() {}

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
    progress: 0, detProgress: 0, palProgress: 0,
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
  v._regionFrameCache = null; // free the per-scene reduced-frame cache (can be large)
}

const hasVideos = () => state.videos.length > 0;
const analyzedAny = () => state.videos.some((v) => v.status === "done");
const doneVideos = () => state.videos.filter((v) => v.status === "done");
const activeVideo = () => state.videos[state.activeIdx];

/* ============================ navigation / render ============================ */

function syncModeUI() {
  if (!dom.modeSwitch) return;
  dom.modeSwitch.querySelectorAll("[data-mode]").forEach((b) => {
    const on = (b.dataset.mode === "whole") === !!state.wholeVideo;
    b.classList.toggle("active", on);
  });
}
// Region builds are tracked PER SIDE (L / R) so one player can load a scene while the OTHER stays
// fully interactive (play / scene-select / frame-step) — and even run its own region build in
// parallel. `v._regionBusy`/`v._regionBuildGen` are {L,R} maps.
function regionBusy(v, side) { return !!(v && v._regionBusy && v._regionBusy[side]); }
function anyRegionBusy(v) { return !!(v && v._regionBusy && (v._regionBusy.L || v._regionBusy.R)); }
function setRegionBusy(v, side, on) { if (!v) return; v._regionBusy = v._regionBusy || { L: false, R: false }; v._regionBusy[side] = on; }
// Abort the in-flight region build on `side` (or BOTH when side is omitted): bump that side's build
// generation (the running build sees the mismatch at its next yield/capture checkpoint and bails
// without touching state) and free its busy flag + overlay. Per-side so cancelling / leaving one
// player never kills a build still running on the OTHER player.
function abortRegionBuild(v, side) {
  if (!v) return;
  v._regionBuildGen = v._regionBuildGen || { L: 0, R: 0 };
  v._regionBusy = v._regionBusy || { L: false, R: false };
  for (const s of (side ? [side] : ["L", "R"])) {
    v._regionBuildGen[s] = (v._regionBuildGen[s] || 0) + 1;
    v._regionBusy[s] = false;
    hideMergeProgress(s); // drop that side's progress overlay at once
  }
}
// User-facing cancel (the キャンセル button on a side's loading overlay) for that side's in-flight pick.
function cancelRegionBuild(side) {
  const v = activeVideo();
  if (!v || !regionBusy(v, side)) return;
  abortRegionBuild(v, side);
  flashMergeHint("🧩 領域の取得をキャンセルしました");
  syncMergeModeUI(v);
}
// Drop ALL STEP4 integration state for v. Confirmed merges + region masks are tied to a specific
// analysis (palette + reduction resolution + scene layout); whenever that analysis is rebuilt
// (re-analyze) or its meaning changes (whole↔scene toggle), the old merges/regions are stale and
// would paint off-palette colors at stale positions/resolutions, so they must be cleared.
function invalidateMergeState(v) {
  if (!v) return;
  abortRegionBuild(v);
  v.merges = []; v.mergeSel = []; v.mergeMode = false; v.regionMode = false;
  v._regionFrameCache = null; v._mergePending = null; v._mergePanelOpen = false;
  v.mergeSceneL = null; v.mergeSceneR = null; // let renderStep4 re-apply the L/R defaults for the new scene count
}
function onModeClick(e) {
  const btn = e.target.closest("[data-mode]"); if (!btn || state.analyzing) return;
  const whole = btn.dataset.mode === "whole";
  if (whole === state.wholeVideo) return;
  state.wholeVideo = whole;
  // Mode changes how STEP2 analyzes (single combined palette vs per-scene). Any completed
  // analysis + its merges/region selections are tied to the old mode → invalidate and re-analyze.
  const hadWork = state.videos.some((v) => v.status === "done") || state.step > 2;
  state.videos.forEach((v) => {
    if (v.status === "done") { v.status = "pending"; v.progress = 0; v.detProgress = 0; v.palProgress = 0; }
    invalidateMergeState(v);
  });
  stopMergePlayers();
  syncModeUI();
  if (hadWork && hasVideos()) goStep(2); else render();
}

function goStep(n) {
  clearPaletteHistory(); // undo history is scoped to one STEP3 session for one video
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
  if (n === 4) {
    const v = activeVideo();
    if (v) savePaletteState(v); // ensure per-scene palettes reflect STEP3 edits
    state.videos.forEach((x) => { if (x !== v) x._regionFrameCache = null; }); // keep only the active video's region cache
    setupMergePlayer("L");
    setupMergePlayer("R");
    try { dom.workVideo.pause(); } catch (e) { /* ignore */ } // idle in STEP4; pause it (full decoder release via load() fires a media error, not worth the low gain)
  } else {
    abortRegionBuild(activeVideo()); // leaving STEP4 mid-build: stop it now so _regionBusy can't linger
    stopMergePlayers();
  }
}

function render() {
  syncModeUI();
  show(dom.step1, state.step === 1);
  show(dom.step2, state.step === 2 && !state.analyzing);
  show(dom.analyzing, state.analyzing);
  show(dom.step3, state.step === 3 && !state.analyzing);
  show(dom.step4, state.step === 4);
  show(dom.step5, state.step === 5);

  renderRail();

  if (state.step === 1) renderStep1();
  if (state.step === 2 && !state.analyzing) renderStep2();
  if (state.analyzing) renderAnalyzingList();
  if (state.step === 3 && !state.analyzing) renderStep3Dynamic();
  if (state.step === 4) renderStep4();
  if (state.step === 5) renderStep5();
}

function show(el, on) { el.hidden = !on; }

function renderRail() {
  const an = state.analyzing;
  const done = analyzedAny();
  const s1 = hasVideos() ? "done" : "active";
  const s2 = an ? "progress" : done ? "done" : (state.step === 2 ? "active" : hasVideos() ? "ready" : "todo");
  const s3 = (done && state.step >= 4) ? "done" : (state.step === 3 ? "active" : done ? "ready" : "todo");
  const s4 = (state.step > 4) ? "done" : (state.step === 4 ? "active" : done ? "ready" : "todo");
  const s5 = state.exported ? "done" : state.exporting ? "progress" : (state.step === 5 ? "active" : done ? "ready" : "todo");
  const states = { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5 };
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
  dom.step2Desc.textContent = "細かく調整したいときは「詳細設定」を開いてください。";
  dom.analyzeBtnLabel.textContent = "色を分析する";
  syncModeUI();
  syncSliders();
  syncAdvanced();
  if (state.advanced) scheduleAdvancedPreview();
}

function onCutModeClick(e) {
  const btn = e.target.closest("[data-cut-mode]");
  if (!btn) return;
  state.sceneCutMode = btn.dataset.cutMode === "fixed" ? "fixed" : "auto";
  syncCutMode();
  markCustomPreset();
}

function syncSliders() {
  if (!Number.isFinite(state.vals.targetScenes) || state.vals.targetScenes < 2) state.vals.targetScenes = 8;
  const map = [
    [dom.sMaxc, dom.vMaxc, "maxc"], [dom.sMindist, dom.vMindist, "mindist"],
    [dom.sMink, dom.vMink, "mink"], [dom.sMaxk, dom.vMaxk, "maxk"],
    [dom.sCutSens, dom.vCutSens, "cutSensitivity"], [dom.sTargetScenes, dom.vTargetScenes, "targetScenes"],
    [dom.sSubshot, dom.vSubshot, "subshotSec"], [dom.sDetectStride, dom.vDetectStride, "detectStride"],
    [dom.sMinShot, dom.vMinShot, "minShotSec"],
  ];
  map.forEach(([s, l, k]) => { if (!s || !l) return; s.value = state.vals[k]; l.textContent = state.vals[k]; });
  // resolution fields (slider + "入力と同じ" checkbox)
  dom.chkAnaFull.checked = state.vals.anaFull;
  dom.sAna.disabled = state.vals.anaFull;
  dom.sAna.value = state.vals.ana;
  dom.vAna.textContent = state.vals.anaFull ? "入力と同じ" : state.vals.ana + "px";
  dom.chkPrevFull.checked = state.vals.prevFull;
  dom.sPrev.disabled = state.vals.prevFull;
  dom.sPrev.value = state.vals.prev;
  dom.vPrev.textContent = state.vals.prevFull ? "入力と同じ" : state.vals.prev + "px";
  syncCutMode();
}

function syncCutMode() {
  // The whole scene-detection group is only meaningful in scene mode (whole-video skips cut detection).
  if (dom.sceneDetectGroup) dom.sceneDetectGroup.hidden = state.wholeVideo;
  if (dom.cutModeSeg) {
    dom.cutModeSeg.querySelectorAll("[data-cut-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.cutMode === state.sceneCutMode);
    });
  }
  if (dom.targetScenesField) dom.targetScenesField.hidden = state.sceneCutMode !== "fixed";
}

function syncAdvanced() {
  dom.advancedBody.hidden = !state.advanced;
  dom.advancedCaret.textContent = state.advanced ? "閉じる ▲" : "開く ▼";
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
    reduceFrame(reduced.data, result.representatives, result.threshold, new Map(), reduced.width, reduced.height, {});
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
    // scene-cut detection (HSV 2-pass), used by detectSceneCuts in scene mode
    targetSceneCount: state.sceneCutMode === "fixed" ? Math.max(2, v.targetScenes || 2) : 0,
    subshotSec: v.subshotSec,
    cutSensitivity: v.cutSensitivity,
    detectStride: v.detectStride,
    minShotSec: v.minShotSec,
  };
}

/* ===================== per-scene palettes (scene-aware mode) =====================
   In scene mode each detected scene gets its OWN palette, clustered from that scene's first & last
   frames. Cuts are found by HSV-histogram detection (detectSceneCuts). Each palette keeps its own
   activeK / confirmThreshold / caches; `v.*` always holds the CURRENTLY-PREVIEWED scene's state,
   swapped as the preview/playback time crosses a cut, so the existing UI/render code keeps working
   unchanged. Videos with no detected cut keep the single-palette path. */

// Scene cut detection (HSV-histogram, 2-pass): coarse-sample the video by HSV histogram, flag big jumps,
// then DENSELY (1 frame at a time) scan ONLY those candidate windows to pin the exact cut frame. Returns
// cut times (s). Ported from Structure Lab's detectShots. Controls (settings): cutSensitivity (lower = more
// sensitive), targetSceneCount (>1 = pick exactly that many scenes), subshotSec (split long shots),
// detectStride (coarse sample cadence), minShotSec (min spacing between cuts).
async function detectSceneCuts(v, settings) {
  const dur = dom.workVideo.duration;
  if (!Number.isFinite(dur) || dur < 1.0 || typeof ICM === "undefined") return [];
  const side = 144; // low resolution: fast + robust
  const minShot = Math.max(0.2, settings.minShotSec || 1.0);
  let fps = 30; try { fps = (await ensureFps(v)) || 30; } catch (e) { /* fall back to 30 */ }
  const frameDt = 1 / Math.max(1, fps); // used for min spacing; dense refine scans exact frame indices
  // Coarse pass only LOCATES the window each cut lives in (sparse = fast); the dense fine pass then scans
  // that window 1 frame at a time for the exact cut, so the coarse cadence can be ~0.6s without losing
  // precision (a cut closer than minShotSec would be merged anyway). detectStride scales it (smaller =
  // denser/more thorough); the dur/120 floor caps the coarse budget (~120 samples) on long videos while
  // still spanning the WHOLE clip.
  const coarseDt = Math.max(0.3, (settings.detectStride || 3) * 0.2, dur / 120);
  const nSamples = Math.max(8, Math.min(121, Math.floor(dur / coarseDt) + 1));
  const times = [], hists = [], dist = [];
  let prev = null;
  for (let s = 0; s < nSamples; s += 1) {
    throwIfCancelled();
    const t = Math.min(dur, s * coarseDt);
    let hist;
    try { hist = await grabCutHistAt(dom.workVideo, t, side); } catch (e) { continue; }
    times.push(t); hists.push(hist);
    dist.push(prev ? ICM.histIntersectionDistance(prev, hist) : 0);
    prev = hist;
    if ((times.length % 8) === 0) updateDet(v, 28 + (s / nSamples) * 64);
  }
  if (times.length < 3) return [];
  const jumps = dist.slice(1);
  // Robust outlier threshold (median + k*MAD) instead of mean+4*std: cuts are large outliers that
  // inflate mean AND std, which can push the threshold ABOVE the very jumps it should catch (especially
  // with sparse sampling, where a few cuts dominate the stats). median/MAD reflect the TYPICAL non-cut
  // distance, so real cuts stand out cleanly. cutSensitivity is the floor.
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  const med = median(jumps);
  const mad = median(jumps.map((d) => Math.abs(d - med)));
  const sens = Math.max(0.02, settings.cutSensitivity || 0.18);
  // median + k*MAD adapts to motion noise, but MUST be CAPPED below the max possible distance (1.0): with
  // moderate motion (median ~0.25, mad ~0.2) an uncapped 6*MAD => threshold 1.46, so NO jump (max 1.0) ever
  // exceeds it and every cut is missed. Cap at 0.82 (real cuts are ~0.8-1.0) and use a gentler 3*MAD.
  const threshold = Math.min(0.82, Math.max(sens, med + 3 * mad));
  // Coarse window i means a cut lies in (times[i-1], times[i]].
  let windowIdx;
  if (settings.targetSceneCount > 1) {
    const rows = [];
    for (let i = 1; i < dist.length; i += 1) { const b = times[i]; if (b > minShot && b < dur - minShot) rows.push({ i, b, d: dist[i] }); }
    rows.sort((p, q) => q.d - p.d);
    const chosen = [];
    for (const r of rows) { if (chosen.every((c) => Math.abs(c.b - r.b) >= minShot)) { chosen.push(r); if (chosen.length >= settings.targetSceneCount - 1) break; } }
    windowIdx = chosen.map((c) => c.i).sort((a, b) => a - b);
  } else {
    windowIdx = [];
    for (let i = 1; i < dist.length; i += 1) if (dist[i] >= threshold && times[i] > minShot && times[i] < dur - minShot) windowIdx.push(i);
  }
  // Fine pass: scan each candidate window 1 frame at a time -> exact cut frame.
  let cuts = [];
  for (let w = 0; w < windowIdx.length; w += 1) {
    throwIfCancelled();
    const i = windowIdx[w];
    updateDet(v, 92 + (w / Math.max(1, windowIdx.length)) * 8);
    const exact = await refineCutDense(times[i - 1], times[i], fps, side);
    if (exact != null) cuts.push(exact);
  }
  cuts = [...new Set(cuts.map((t) => Math.round(t * fps)))].map((f) => f / fps).sort((a, b) => a - b);
  const merged = [];
  for (const c of cuts) if (!merged.length || c - merged[merged.length - 1] >= minShot) merged.push(c);
  // Optional sub-shot split: subdivide long spans (AI morphs / long cut-less takes).
  if (settings.subshotSec > 0) {
    const sub = Math.max(minShot, settings.subshotSec);
    const bounds = [0, ...merged, dur];
    const extra = [];
    for (let i = 0; i < bounds.length - 1; i += 1) {
      const span = bounds[i + 1] - bounds[i];
      if (span <= sub * 1.35) continue;
      for (let t = bounds[i] + sub; t < bounds[i + 1] - 1e-3; t += sub) extra.push(Math.round(t * 1000) / 1000);
    }
    if (extra.length) return [...merged, ...extra].sort((a, b) => a - b);
  }
  return merged;
}

// Dense 1-frame scan of (aT, bT]: re-decode EVERY frame in the window and return the time of the frame
// whose HSV histogram differs MOST from the immediately-previous frame — that frame IS the cut. More robust
// than a binary search (no monotonicity assumption, handles motion/multi-change windows). `refHist` (the
// coarse frame at aT) seeds "previous" so a cut at the very start of the window is caught too.
async function refineCutDense(aT, bT, fps, side) {
  const dur = dom.workVideo.duration || bT;
  const startFrame = Math.max(1, Math.floor(aT * fps + 1e-6) + 1);
  const endFrame = Math.max(startFrame, Math.min(Math.ceil(bT * fps - 1e-6), Math.ceil(dur * fps - 1e-6)));
  let prev = null;
  let bestFrame = endFrame, bestD = -1;
  try { prev = await grabCutHistAt(dom.workVideo, frameCenterTime(startFrame - 1, fps, dur), side); } catch (e) { prev = null; }
  for (let frame = startFrame; frame <= endFrame; frame += 1) {
    throwIfCancelled();
    const tt = frameCenterTime(frame, fps, dur);
    let hist;
    try { hist = await grabCutHistAt(dom.workVideo, tt, side); } catch (e) { break; }
    if (prev) { const d = ICM.histIntersectionDistance(prev, hist); if (d > bestD) { bestD = d; bestFrame = frame; } }
    prev = hist;
  }
  return bestFrame / fps;
}

async function grabCutHistAt(video, time, shortSide) {
  await ensureMetadata(video);
  const dur = Math.max(0, video.duration - 0.001);
  let target = Math.min(time, dur);
  if (target <= 0.0005 && dur > 0.03) target = 0.001;
  await seekVideo(video, target, true); // wait for the presented frame: stale frames -> wrong cut times -> wrong scene boundaries
  const { width, height } = scaledSize(video.videoWidth, video.videoHeight, shortSide);
  const key = `${width}x${height}`;
  if (!grabCutHistAt._store || grabCutHistAt._store.key !== key) {
    const canvas = createWorkCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create cut-detection canvas");
    grabCutHistAt._store = { key, canvas, ctx, width, height };
  }
  const store = grabCutHistAt._store;
  store.ctx.drawImage(video, 0, 0, store.width, store.height);
  return ICM.hsvHist(store.ctx.getImageData(0, 0, store.width, store.height));
}

// Build [{start,end,paletteId}] from cut times. Each scene gets its OWN palette ("s<i>"),
// derived from that scene's first & last frames.
function buildScenes(cuts, dur) {
  const bounds = [0, ...[...cuts].sort((a, b) => a - b), dur];
  const scenes = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    scenes.push({ start: bounds[i], end: bounds[i + 1], paletteId: "s" + i });
  }
  return scenes;
}

// The clustering is hierarchical (agglomerative), so each K snapshot is the previous one with ONE
// cluster split in two — but every snapshot is independently re-sorted by weight, so the palette
// reshuffles when K changes. Re-order each snapshot so the prior K's colors keep their positions
// and the newly-split color is APPENDED at the end. (Reduction is nearest-color, so order doesn't
// change the output — this is purely for an intuitive, append-only palette.)
function applyStableOrder(analysis) {
  const snaps = analysis && analysis.snapshotsByK;
  const ks = ((analysis && analysis.availableK) || []).slice().sort((a, b) => a - b);
  if (!snaps || ks.length < 2) return;
  let prev = snaps[ks[0]] && snaps[ks[0]].representatives;
  if (!prev) return;
  for (let ki = 1; ki < ks.length; ki += 1) {
    const cur = snaps[ks[ki]] && snaps[ks[ki]].representatives;
    if (!cur) continue;
    const claimed = new Array(cur.length).fill(false);
    const ordered = [];
    for (const p of prev) { // each prior-position color keeps its slot via its nearest current rep
      let best = -1, bd = Infinity;
      for (let j = 0; j < cur.length; j += 1) {
        if (claimed[j]) continue;
        const dr = cur[j][0] - p[0], dg = cur[j][1] - p[1], db = cur[j][2] - p[2], d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) { claimed[best] = true; ordered.push(cur[best]); }
    }
    for (let j = 0; j < cur.length; j += 1) if (!claimed[j]) ordered.push(cur[j]); // new (split) colors appended
    snaps[ks[ki]].representatives = ordered;
    prev = ordered;
  }
  if (snaps[analysis.selectedK]) analysis.representatives = snaps[analysis.selectedK].representatives;
}
function makePaletteState(analysis) {
  // The reduced domain uses pure magenta (255,0,255) as the "new color" sentinel. If k-means ever
  // produces a representative that IS pure magenta, nudge it 1 level (across ALL K snapshots) so a
  // real magenta palette color stays distinguishable (otherwise it'd read as "new color").
  const nudge = (reps) => { if (reps) for (const c of reps) { if (c[0] === 255 && c[1] === 0 && c[2] === 255) c[0] = 254; } };
  if (analysis) {
    if (analysis.snapshotsByK) for (const k of Object.keys(analysis.snapshotsByK)) nudge(analysis.snapshotsByK[k].representatives);
    nudge(analysis.representatives);
    applyStableOrder(analysis); // existing colors keep their slot; new colors append at the end as K grows
  }
  return { analysis, activeK: analysis.selectedK, confirmThreshold: Math.round(analysis.threshold), processedCache: new Map(), maskCache: new Map(), disabledKeys: new Set() };
}
// Representatives actually used for quantization = all reps minus the OFF (disabled) ones. Pixels
// that mapped to a disabled rep now map to the nearest ENABLED rep (processPixels does this for
// free once the rep is removed from the list). Never returns empty (can't turn every color off).
function repsEnabled(reps, disabled) {
  if (!disabled || !disabled.size || !reps) return reps;
  const out = reps.filter((c) => !disabled.has(packedRGB(c)));
  return out.length ? out : reps;
}

function paletteIdAtTime(v, t) {
  if (!v.sceneMode || !v.scenes) return v.curPaletteId || "only";
  for (const s of v.scenes) if (t >= s.start && t < s.end) return s.paletteId;
  return v.scenes[v.scenes.length - 1].paletteId;
}

function savePaletteState(v) {
  if (!v.palettes || !v.curPaletteId || !v.palettes[v.curPaletteId]) return;
  const st = v.palettes[v.curPaletteId];
  st.analysis = v.analysis; st.activeK = v.activeK; st.confirmThreshold = v.confirmThreshold;
  st.processedCache = v.processedCache; st.maskCache = v.maskCache; st.disabledKeys = v.disabledKeys || new Set();
}

function loadPaletteState(v, id) {
  const st = v.palettes[id];
  v.analysis = st.analysis; v.activeK = st.activeK; v.confirmThreshold = st.confirmThreshold;
  v.processedCache = st.processedCache; v.maskCache = st.maskCache; v.curPaletteId = id;
  v.disabledKeys = st.disabledKeys || (st.disabledKeys = new Set());
}

// Reds the palette for the given time; if it differs from the loaded one, swap and
// re-render the STEP3 controls. Returns true if the scene changed.
function syncSceneForTime(v, t) {
  if (!v.sceneMode) return false;
  const id = paletteIdAtTime(v, t);
  if (id === v.curPaletteId) return false;
  savePaletteState(v);
  loadPaletteState(v, id);
  dom.sConfirm.max = Math.max(150, (v.confirmThreshold || 0) + 8);
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  syncThresholdDockControls(v.confirmThreshold);
  updateConfStepperBounds(v.confirmThreshold);
  renderKControl(v); renderPalette(v); renderMetrics(v); renderKTable(v);
  state.plotCache = null; updateSnapMarker(v); requestPlotDraw();
  return true;
}

// Palette (reps/threshold/cache) to use at a given time — used by export per frame.
function paletteStateAtTime(v, t) {
  if (v.sceneMode) { const st = v.palettes[paletteIdAtTime(v, t)]; return { reps: repsEnabled(st.analysis.representatives, st.disabledKeys), th: st.confirmThreshold, cache: st.processedCache }; }
  return { reps: repsEnabled(v.analysis.representatives, v.disabledKeys), th: v.confirmThreshold, cache: v.processedCache };
}
// Export palette for the output frame whose CONTENT sits at decoded time `at`. Assign by FRAME INDEX,
// not raw time: the decoded frame is floor(at*fps), and each scene owns the integer frame range
// [round(start*fps), round(end*fps)). Integer compares are exact — immune to the sub-frame float
// wobble (and fps-grid drift) that otherwise made a frame at a cut pick the NEIGHBOUR scene's palette
// for one frame. (A correct fps is required because the <video> API exposes only TIME, never a frame
// number — see ensureFps, which measures the true rate instead of rounding 23.976/24.4→24.) Falls
// back to plain time lookup when fps/scenes are unavailable.
function paletteStateForFrame(v, at, fps) {
  if (v.sceneMode && fps > 0 && v.scenes && v.scenes.length) {
    const f = Math.floor(at * fps + 1e-6); // source frame index this decoded time lands in
    let sc = v.scenes[v.scenes.length - 1];
    for (const s of v.scenes) { if (f >= Math.round(s.start * fps) && f < Math.round(s.end * fps)) { sc = s; break; } }
    const st = v.palettes[sc.paletteId];
    return { reps: repsEnabled(st.analysis.representatives, st.disabledKeys), th: st.confirmThreshold, cache: st.processedCache };
  }
  return paletteStateAtTime(v, at);
}

/* ============================ analysis (batch) ============================ */

async function analyzeAll() {
  if (!hasVideos() || state.analyzing) return;
  cancelAdvancedPreview();
  state.analyzing = true;
  state.cancelled = false;
  state.exported = false;
  state.step = 2;
  state.videos.forEach((v) => { v.status = "pending"; v.progress = 0; v.detProgress = 0; v.palProgress = 0; v.error = null; v.awaitingSceneReview = false; v.showSceneFrameReview = false; v.sceneFramePreview = []; invalidateMergeState(v); }); // re-analysis rebuilds the palette → old merges/regions are stale
  render();
  startElapsedTimer();
  const settings = readSettings();

  for (const v of state.videos) {
    if (state.cancelled) break;
    v.status = "analyzing";
    v.progress = 0; v.detProgress = 0; v.palProgress = 0;
    initSceneFramePreview(v);
    renderAnalyzingList();
    try {
      await prepareVideoElement(v);
      throwIfCancelled();
      updateDet(v, 8);
      const first = await extractFrame(dom.workVideo, 0, settings.analysisShortSide);
      throwIfCancelled();
      v.thumb = makeThumb(first.imageData);
      v.videoWidth = dom.workVideo.videoWidth;
      v.videoHeight = dom.workVideo.videoHeight;
      v.duration = dom.workVideo.duration;
      v.dimsText = `${v.videoWidth}×${v.videoHeight}`;
      v.durText = formatDuration(v.duration);
      updateDet(v, 18);
      const lastTime = Math.max(0, dom.workVideo.duration - 1 / 30);
      const last = await extractFrame(dom.workVideo, lastTime, settings.analysisShortSide);
      throwIfCancelled();
      updateDet(v, 28);
      // Whole-video mode: skip cut detection entirely -> single combined palette, no scenes.
      // Scene mode: find scene cuts (seeks around; first/last frames already captured above).
      const cuts = state.wholeVideo ? [] : await detectSceneCuts(v, settings);
      updateDet(v, 100); // cut-detection phase complete (instant in whole-video mode)
      throwIfCancelled();
      if (cuts.length === 0) {
        // No scene change -> single combined palette (original behavior).
        const result = await runAnalysisWorker(first.imageData, last.imageData, settings, (frac) => updatePal(v, Math.max(0, Math.min(1, frac)) * 100));
        updatePal(v, 100);
        throwIfCancelled();
        v.sceneMode = false;
        v.cuts = [];
        v.scenes = [{ start: 0, end: v.duration || 1, paletteId: "only" }];
        v.palettes = { only: makePaletteState({ ...result, settings }) };
        loadPaletteState(v, "only");
      } else {
        // Scene change -> EACH scene gets its own palette, clustered from THAT scene's first & last frames.
        v.sceneMode = true;
        v.cuts = cuts;
        v.scenes = buildScenes(cuts, v.duration || 1);
        v.palettes = {};
        const sceneFps = await ensureFps(v);
        prepareSceneFramePreview(v, sceneFps);
        await populateSceneReviewFrames(v);
        throwIfCancelled();
        await waitForSceneReview(v);
        throwIfCancelled();
        const nS = v.scenes.length;
        for (let i = 0; i < nS; i += 1) {
          throwIfCancelled();
          const sc = v.scenes[i];
          const item = v.sceneFramePreview[i];
          const fT = frameCenterTime(item.firstFrame, item.fps, v.duration || 0);
          const lT = frameCenterTime(item.lastFrame, item.fps, v.duration || 0);
          updateSceneFramePreview(v, i, { status: "分析中", done: false, firstTime: fT, lastTime: lT });
          const fImg = await extractFrame(dom.workVideo, fT, settings.analysisShortSide);
          throwIfCancelled();
          const lImg = await extractFrame(dom.workVideo, lT, settings.analysisShortSide);
          throwIfCancelled();
          const base = (i / nS) * 100, next = ((i + 1) / nS) * 100;
          const res = await runAnalysisWorker(fImg.imageData, lImg.imageData, settings, (frac) => updatePal(v, base + Math.max(0, Math.min(1, frac)) * (next - base)));
          updatePal(v, next);
          throwIfCancelled();
          v.palettes[sc.paletteId] = makePaletteState({ ...res, settings });
          updateSceneFramePreview(v, i, { status: "完了", done: true });
        }
        loadPaletteState(v, paletteIdAtTime(v, initialPreviewTime(dom.workVideo)));
      }
      v.activeScene = 0;
      v.status = "done";
      v.progress = 100; v.detProgress = 100; v.palProgress = 100;
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
  if (state.sceneReview) {
    const review = state.sceneReview;
    state.sceneReview = null;
    if (review.video) {
      review.video.awaitingSceneReview = false;
      review.video.showSceneFrameReview = false;
      renderSceneFramePreview(review.video);
    }
    review.reject(new Error("Stopped"));
  }
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
    const det = Math.round(v.detProgress || 0), pal = Math.round(v.palProgress || 0);
    let statusText = "処理中…", statusCls = "";
    if (v.status === "done") { statusText = "✓ 完了"; statusCls = "done"; }
    else if (v.status === "error") { statusText = "失敗"; statusCls = "error"; }
    else if (v.awaitingSceneReview) { statusText = "確認待ち"; }
    else if (v.status === "pending") { statusText = "待機中"; }
    const barCls = v.status === "done" ? "done" : "";
    const phase = (label, which, pct) => `
            <div class="proc-phase">
              <span class="proc-phase-label">${label}</span>
              <div class="bar bar-${which}"><i class="${barCls}" style="width:${pct}%"></i></div>
              <span class="proc-phase-pct ${which}">${pct}%</span>
            </div>`;
    return `
      <div class="proc-row" id="proc-${v.id}">
        ${thumbHtml(v, "proc-thumb")}
        <div class="proc-body">
          <div class="proc-top">
            <span class="proc-name">${esc(v.name)}${v.error ? " — " + esc(v.error) : ""}</span>
            <span class="proc-status ${statusCls}">${statusText}</span>
          </div>
          ${phase("カット検出", "det", det)}
          ${phase("パレット分析", "pal", pal)}
        </div>
      </div>`;
  }).join("");
}

function initSceneFramePreview(v) {
  if (!v) return;
  v.sceneFramePreview = [];
  renderSceneFramePreview(v);
}

function prepareSceneFramePreview(v, fps) {
  if (!v || !v.scenes || !v.scenes.length) return;
  v.showSceneFrameReview = true;
  v.sceneFramePreview = v.scenes.map((sc, index) => ({
    ...sceneFrameDefaults(sc, index, fps, v.duration || 0),
    status: "準備中",
    done: false,
    busy: false,
    firstThumb: "",
    lastThumb: "",
  }));
  renderSceneFramePreview(v);
}

function sceneFrameDefaults(sc, index, fps, duration) {
  const maxFrame = Math.max(0, Math.ceil(Math.max(0, duration) * fps - 1e-6) - 1);
  const minFrame = Math.max(0, Math.min(maxFrame, Math.ceil(sc.start * fps - 1e-6)));
  const maxSceneFrame = Math.max(minFrame, Math.min(maxFrame, Math.ceil(sc.end * fps - 1e-6) - 1));
  return {
    index,
    fps,
    start: sc.start,
    end: sc.end,
    minFrame,
    maxFrame: maxSceneFrame,
    firstFrame: minFrame,
    lastFrame: maxSceneFrame,
    firstTime: frameCenterTime(minFrame, fps, duration),
    lastTime: frameCenterTime(maxSceneFrame, fps, duration),
  };
}

function updateSceneFramePreview(v, index, patch) {
  if (!v || !v.sceneFramePreview || !v.sceneFramePreview[index]) return;
  Object.assign(v.sceneFramePreview[index], patch);
  renderSceneFramePreview(v);
}

function renderSceneFramePreview(v) {
  if (!dom.scenePreviewBox || !dom.scenePreviewList) return;
  const items = (v && v.sceneFramePreview) || [];
  const visible = !!(v && v.showSceneFrameReview && items.length);
  if (!visible) {
    dom.scenePreviewBox.hidden = true;
    dom.scenePreviewList.innerHTML = "";
    if (dom.scenePreviewActions) dom.scenePreviewActions.hidden = true;
    dom.scenePreviewBox.classList.remove("review-active");
    return;
  }
  dom.scenePreviewBox.hidden = false;
  dom.scenePreviewBox.classList.add("review-active");
  if (dom.scenePreviewTitle) dom.scenePreviewTitle.textContent = `${v.name}：パレット分析に使う ${items.length} シーン`;
  // Use the source video's real aspect so the whole frame shows without cropping or letterboxing.
  const ar = (v.videoWidth > 0 && v.videoHeight > 0) ? `${v.videoWidth} / ${v.videoHeight}` : "16 / 9";
  dom.scenePreviewList.innerHTML = items.map((item, i) => `
    <div class="scene-preview-card">
      <div class="scene-preview-meta">
        <span class="scene-preview-no">シーン ${item.index + 1}</span>
        <span class="scene-preview-cuts">
          <span class="cut-chip ${item.index === 0 ? "edge" : ""}">${item.index === 0 ? "先頭" : "カット" + item.index}</span>
          <span class="cut-arrow">→</span>
          <span class="cut-chip ${item.index === items.length - 1 ? "edge" : ""}">${item.index === items.length - 1 ? "末尾" : "カット" + (item.index + 1)}</span>
        </span>
        <span class="scene-preview-range">${formatSceneRange(item.start, item.end)} ・ frames ${item.minFrame}-${item.maxFrame}</span>
        <span class="scene-preview-status ${item.done ? "done" : ""}">${esc(item.status || "")}</span>
      </div>
      <div class="scene-preview-frames">
        ${sceneFramePanelHtml(items, i, "first", "IN", ar)}
        ${sceneFramePanelHtml(items, i, "last", "OUT", ar)}
      </div>
    </div>`).join("");
  if (dom.scenePreviewActions) dom.scenePreviewActions.hidden = !state.sceneReview || state.sceneReview.videoId !== v.id;
}

// IN/OUT are scene boundary frames. Internal cuts are SHARED between adjacent scenes: moving a
// scene's OUT also moves the next scene's IN (and vice-versa) — the cut itself moves. The very
// first IN (先頭) and the very last OUT (末尾) are the clip ends and stay fixed (both buttons off).
function sceneFramePanelHtml(items, i, role, label, ar) {
  const item = items[i];
  const last = items.length - 1;
  const src = role === "first" ? item.firstThumb : item.lastThumb;
  const time = role === "first" ? item.firstTime : item.lastTime;
  const frame = role === "first" ? item.firstFrame : item.lastFrame;
  let canPrev = false, canNext = false;
  if (role === "first" && i > 0) {
    const prev = items[i - 1], cut = item.firstFrame - 1; // cut between scene i-1 and i
    canPrev = (cut - 1) >= prev.firstFrame;       // move cut earlier: scene i-1 keeps ≥1 frame
    canNext = (cut + 1) <= (item.lastFrame - 1);  // move cut later:  scene i keeps ≥1 frame
  } else if (role === "last" && i < last) {
    const nxt = items[i + 1], cut = item.lastFrame; // cut between scene i and i+1
    canPrev = (cut - 1) >= item.firstFrame;       // move cut earlier: scene i keeps ≥1 frame
    canNext = (cut + 1) <= (nxt.lastFrame - 1);   // move cut later:  scene i+1 keeps ≥1 frame
  }
  return `
    <div class="scene-preview-panel">
      <div class="scene-preview-panel-head"><span>${label}</span><span>frame ${frame}</span></div>
      ${sceneFrameHtml(src, label, time, ar)}
      <div class="scene-frame-controls">
        <button type="button" data-scene-frame="${item.index}" data-role="${role}" data-delta="-1" ${item.busy || !canPrev ? "disabled" : ""}>← 1コマ</button>
        <button type="button" data-scene-frame="${item.index}" data-role="${role}" data-delta="1" ${item.busy || !canNext ? "disabled" : ""}>1コマ →</button>
      </div>
    </div>`;
}

function sceneFrameHtml(src, label, time, ar) {
  const body = src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<div class="scene-preview-empty">準備中</div>`;
  const style = ar ? ` style="aspect-ratio:${ar}"` : "";
  return `<div class="scene-preview-frame"${style}>${body}<span>${label} ${formatSceneTime(time)}</span></div>`;
}

function formatSceneRange(start, end) {
  return `${formatSceneTime(start)}-${formatSceneTime(end)}`;
}

function formatSceneTime(sec) {
  if (!Number.isFinite(sec)) return "--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.floor((sec - Math.floor(sec)) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
}

function frameCenterTime(frame, fps, duration) {
  const safeFps = Math.max(1, fps || 30);
  const t = (Math.max(0, frame) + 0.5) / safeFps;
  return Math.max(0, Math.min(Math.max(0, duration || t) - 0.001, t));
}

async function populateSceneReviewFrames(v) {
  if (!v || !v.sceneFramePreview) return;
  for (let i = 0; i < v.sceneFramePreview.length; i += 1) {
    throwIfCancelled();
    await refreshSceneReviewFrame(v, i, "first");
    throwIfCancelled();
    await refreshSceneReviewFrame(v, i, "last");
    updateSceneFramePreview(v, i, { status: "確認待ち", done: false });
  }
}

async function refreshSceneReviewFrame(v, index, role) {
  const item = v.sceneFramePreview && v.sceneFramePreview[index];
  if (!item) return;
  const frame = role === "first" ? item.firstFrame : item.lastFrame;
  const time = frameCenterTime(frame, item.fps, v.duration || 0);
  const img = await extractFrame(dom.workVideo, time, SCENE_REVIEW_SHORT_SIDE);
  const patch = role === "first"
    ? { firstThumb: makeSceneReviewThumb(img.imageData), firstTime: time }
    : { lastThumb: makeSceneReviewThumb(img.imageData), lastTime: time };
  updateSceneFramePreview(v, index, patch);
}

async function onScenePreviewClick(e) {
  const btn = e.target.closest("[data-scene-frame]");
  if (!btn || !state.sceneReview) return;
  const v = state.sceneReview.video;
  if (!v) return;
  const index = Number(btn.dataset.sceneFrame);
  const role = btn.dataset.role === "last" ? "last" : "first";
  const delta = Number(btn.dataset.delta) || 0;
  // A scene's IN is the cut on its left (index-1); its OUT is the cut on its right (index).
  await moveCut(v, role === "first" ? index - 1 : index, delta);
}

// Boundary time of the cut after frame `cutFrame` (= start of frame cutFrame+1). Frame centers are
// (f+0.5)/fps, so frames ≤ cutFrame fall in the earlier scene and frames ≥ cutFrame+1 in the later.
function boundaryTimeForCut(cutFrame, fps, duration) {
  const safeFps = Math.max(1, fps || 30);
  const t = (cutFrame + 1) / safeFps;
  const dur = Math.max(0.001, duration || t);
  return Math.max(0.0005, Math.min(dur - 0.0005, t));
}

// Move the cut between scene k and scene k+1 by `delta` frames. OUT_k and IN_{k+1} stay linked (the
// shared cut moves), both thumbnails are re-extracted, and the new boundary is written into
// v.scenes / v.cuts so the final reduction's per-time palette assignment follows the adjusted cut.
async function moveCut(v, k, delta) {
  const items = v && v.sceneFramePreview;
  if (!items || k < 0 || k + 1 >= items.length) return; // clip edges (先頭IN / 末尾OUT) have no cut
  const a = items[k], b = items[k + 1];
  if (!a || !b || a.busy || b.busy) return;
  const lo = a.firstFrame;        // scene k must keep ≥1 frame
  const hi = b.lastFrame - 1;     // scene k+1 must keep ≥1 frame
  const cur = a.lastFrame;        // current cut frame (== b.firstFrame - 1)
  const next = Math.max(lo, Math.min(hi, cur + delta));
  if (next === cur) return;
  const bt = boundaryTimeForCut(next, a.fps, v.duration || 0);
  Object.assign(a, { lastFrame: next, maxFrame: next, end: bt, busy: true, status: "更新中" });
  Object.assign(b, { firstFrame: next + 1, minFrame: next + 1, start: bt, busy: true, status: "更新中" });
  if (v.scenes && v.scenes[k]) v.scenes[k].end = bt;
  if (v.scenes && v.scenes[k + 1]) v.scenes[k + 1].start = bt;
  if (v.scenes) v.cuts = v.scenes.slice(1).map((s) => s.start); // keep the metrics cut list in sync
  renderSceneFramePreview(v);
  try {
    await refreshSceneReviewFrame(v, k, "last");
    await refreshSceneReviewFrame(v, k + 1, "first");
    updateSceneFramePreview(v, k, { busy: false, status: "確認待ち" });
    updateSceneFramePreview(v, k + 1, { busy: false, status: "確認待ち" });
  } catch (error) {
    updateSceneFramePreview(v, k, { busy: false, status: "取得失敗" });
    updateSceneFramePreview(v, k + 1, { busy: false, status: "取得失敗" });
  }
}

function waitForSceneReview(v) {
  if (!dom.scenePreviewConfirm) return Promise.resolve();
  return new Promise((resolve, reject) => {
    v.showSceneFrameReview = true;
    v.awaitingSceneReview = true;
    state.sceneReview = { videoId: v.id, video: v, resolve, reject };
    renderAnalyzingList();
    renderSceneFramePreview(v);
  });
}

function confirmSceneReview() {
  if (!state.sceneReview) return;
  const review = state.sceneReview;
  state.sceneReview = null;
  review.video.awaitingSceneReview = false;
  review.video.showSceneFrameReview = false;
  if (dom.scenePreviewActions) dom.scenePreviewActions.hidden = true;
  renderAnalyzingList();
  renderSceneFramePreview(review.video);
  review.resolve();
}

// Two-phase analyze progress: カット検出 (det) and パレット分析 (pal). Each updates its own bar in place
// (no full re-render) for smooth updates.
function updateDet(v, pct) { v.detProgress = pct; paintPhase(v, "det", pct); }
function updatePal(v, pct) { v.palProgress = pct; paintPhase(v, "pal", pct); }
function paintPhase(v, which, pct) {
  const row = document.getElementById("proc-" + v.id);
  if (!row) return;
  const bar = row.querySelector(".bar-" + which + " > i");
  if (bar) bar.style.width = Math.round(pct) + "%";
  const lab = row.querySelector(".proc-phase-pct." + which);
  if (lab) lab.textContent = Math.round(pct) + "%";
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
  syncPreviewPopupTitle();
  renderSceneTabs(v);
  syncPopupSceneTabs();
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  syncThresholdDockControls(v.confirmThreshold);
  syncPreviewSeekControls();
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
  if (!ks.length) {
    dom.kValue.textContent = String(v.analysis ? v.analysis.representatives.length : "—");
    if (dom.sK) dom.sK.disabled = true;
    return;
  }
  const min = ks[0], max = ks[ks.length - 1];
  dom.kValue.textContent = String(v.activeK);
  dom.kRange.textContent = `（${min}〜${max}）`;
  dom.kMinus.disabled = v.activeK <= min;
  dom.kPlus.disabled = v.activeK >= max;
  if (dom.sK) { dom.sK.disabled = false; dom.sK.min = String(min); dom.sK.max = String(max); dom.sK.step = "1"; dom.sK.value = String(v.activeK); }
}
function nearestAvailableK(ks, val) {
  let best = ks[0], bd = Infinity;
  for (const k of ks) { const d = Math.abs(k - val); if (d < bd) { bd = d; best = k; } }
  return best;
}
// Carry an OFF selection across a K change: the new snapshot has different cluster centers, so we
// re-derive which NEW reps are OFF by labelling each new rep with its nearest OLD rep's on/off
// state. This keeps the same region of color space turned off even though the colors changed.
function remapDisabledKeys(oldReps, oldDisabled, newReps) {
  if (!oldDisabled || !oldDisabled.size || !oldReps || !oldReps.length) return new Set();
  const next = new Set();
  let weakest = null, weakestD = -1; // OFF new-rep with the largest nearest-old distance (weakest claim to be off)
  for (const nr of newReps) {
    let best = null, bd = Infinity;
    for (const orp of oldReps) {
      const dr = nr[0] - orp[0], dg = nr[1] - orp[1], db = nr[2] - orp[2], d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = orp; }
    }
    if (best && oldDisabled.has(packedRGB(best))) { const k = packedRGB(nr); next.add(k); if (bd > weakestD) { weakestD = bd; weakest = k; } }
  }
  // Never turn EVERY color off (mirror togglePaletteKey's ">=1 ON" invariant). Otherwise repsEnabled
  // would silently fall back to the full palette while the UI shows "0色" — output ≠ UI.
  if (newReps.length && next.size >= newReps.length && weakest != null) next.delete(weakest);
  return next;
}
// Apply an exact (available) K: swap to that snapshot's representatives, carrying the OFF selection
// forward (nearest-rep remap) so changing the color count does NOT silently re-enable OFF colors.
function applyKValue(nk, coalesce) {
  const v = activeVideo();
  if (!v || !v.analysis || !v.analysis.snapshotsByK || !v.analysis.snapshotsByK[nk]) return;
  if (nk === v.activeK) { renderKControl(v); return; }
  recordUndo("K", !!coalesce); // capture pre-change state for Ctrl+Z (slider drag coalesces; stepper does not)
  const oldReps = v.analysis.representatives, oldDisabled = v.disabledKeys;
  v.activeK = nk;
  v.analysis.representatives = v.analysis.snapshotsByK[nk].representatives;
  v.disabledKeys = remapDisabledKeys(oldReps, oldDisabled, v.analysis.representatives);
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
function setK(val) { // from the slider (any int) — snap to the nearest available K
  const v = activeVideo();
  if (!v || !v.analysis || !v.analysis.availableK) return;
  const nk = nearestAvailableK(v.analysis.availableK, val);
  if (dom.sK) dom.sK.value = String(nk);
  applyKValue(nk, true); // slider drag → coalesce into one undo step
}
function changeK(delta) { // from the −/＋ steppers
  const v = activeVideo();
  if (!v || !v.analysis || !v.analysis.availableK) return;
  const ks = v.analysis.availableK;
  let i = ks.indexOf(v.activeK);
  if (i < 0) i = ks.indexOf(v.analysis.selectedK);
  i = Math.max(0, Math.min(ks.length - 1, i + delta));
  applyKValue(ks[i], false); // discrete stepper → its own undo step
}

// Restore the active video's threshold and representative count to the auto-determined originals.
function resetConfirmParams() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  recordUndo("reset", false); // the reset itself is undoable
  v.activeK = v.analysis.selectedK;
  if (v.analysis.snapshotsByK[v.activeK]) {
    v.analysis.representatives = v.analysis.snapshotsByK[v.activeK].representatives;
  }
  v.confirmThreshold = Math.round(v.analysis.threshold);
  v.disabledKeys = new Set(); // back to "all colors on"
  v.processedCache = new Map();
  v.maskCache = new Map();
  state.plotCache = null;
  updateSnapMarker(v);
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  syncThresholdDockControls(v.confirmThreshold);
  renderKControl(v);
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
  if (!state.playing) drawActiveFrame();
  requestPlotDraw();
  showToast("info", "しきい値と代表色の数を自動の値に戻しました");
}

/* ---- STEP3 undo/redo: 代表色の数・OFF・しきい値の変更を Ctrl+Z で戻す / Ctrl+Shift+Z (Ctrl+Y) でやり直す ---- */
const step3Undo = [], step3Redo = [];
let undoLastTime = 0, undoLastGroup = "", restoringPalette = false;
function capturePaletteSnapshot() {
  const v = activeVideo(); if (!v || !v.analysis) return null;
  return { activeIdx: state.activeIdx, paletteId: v.curPaletteId, activeK: v.activeK, confirmThreshold: v.confirmThreshold, disabled: Array.from(v.disabledKeys || []) };
}
function snapEq(a, b) {
  if (!a || !b) return false;
  if (a.activeIdx !== b.activeIdx || a.paletteId !== b.paletteId || a.activeK !== b.activeK || a.confirmThreshold !== b.confirmThreshold || a.disabled.length !== b.disabled.length) return false;
  const s = new Set(b.disabled); for (const k of a.disabled) if (!s.has(k)) return false; return true;
}
function clearPaletteHistory() { step3Undo.length = 0; step3Redo.length = 0; undoLastTime = 0; undoLastGroup = ""; }
// Record the CURRENT (pre-change) state before a palette edit. coalesce=true merges a continuous
// slider drag into one undo step; identical states are skipped.
function recordUndo(group, coalesce) {
  if (restoringPalette) return;
  const snap = capturePaletteSnapshot(); if (!snap) return;
  const top = step3Undo[step3Undo.length - 1];
  if (snapEq(top, snap)) { step3Redo.length = 0; return; }
  const now = Date.now();
  if (coalesce && top && undoLastGroup === group && (now - undoLastTime) < 700) { undoLastTime = now; step3Redo.length = 0; return; }
  step3Undo.push(snap); if (step3Undo.length > 200) step3Undo.shift();
  step3Redo.length = 0; undoLastTime = now; undoLastGroup = group;
}
function restorePaletteSnapshot(snap) {
  if (!snap) return;
  restoringPalette = true;
  try {
    if (state.activeIdx !== snap.activeIdx && state.videos[snap.activeIdx]) { state.activeIdx = snap.activeIdx; renderStep3Dynamic(); }
    const v = activeVideo(); if (!v || !v.analysis) return;
    if (v.sceneMode && v.curPaletteId !== snap.paletteId && v.palettes && v.palettes[snap.paletteId]) { savePaletteState(v); loadPaletteState(v, snap.paletteId); }
    if (v.analysis.snapshotsByK && v.analysis.snapshotsByK[snap.activeK]) { v.activeK = snap.activeK; v.analysis.representatives = v.analysis.snapshotsByK[snap.activeK].representatives; }
    v.confirmThreshold = snap.confirmThreshold;
    v.disabledKeys = new Set(snap.disabled);
    v.processedCache = new Map(); v.maskCache = new Map(); state.plotCache = null;
    savePaletteState(v);
    updateSnapMarker(v);
    dom.sConfirm.value = v.confirmThreshold; dom.vConfirm.textContent = v.confirmThreshold;
    syncThresholdDockControls(v.confirmThreshold);
    renderKControl(v); renderPalette(v); renderMetrics(v); renderKTable(v);
    if (!state.playing) drawActiveFrame();
    requestPlotDraw();
  } finally { restoringPalette = false; }
}
function undoPalette() {
  if (!step3Undo.length) { showToast("info", "これ以上戻せません"); return; }
  const cur = capturePaletteSnapshot(); if (cur) step3Redo.push(cur);
  restorePaletteSnapshot(step3Undo.pop());
  undoLastTime = 0; undoLastGroup = "";
  showToast("info", "↩ 元に戻しました");
}
function redoPalette() {
  if (!step3Redo.length) { showToast("info", "やり直す操作がありません"); return; }
  const cur = capturePaletteSnapshot(); if (cur) step3Undo.push(cur);
  restorePaletteSnapshot(step3Redo.pop());
  undoLastTime = 0; undoLastGroup = "";
  showToast("info", "↪ やり直しました");
}
function onUndoKey(e) {
  if (state.step !== 3 || !(e.ctrlKey || e.metaKey)) return;
  const k = (e.key || "").toLowerCase();
  if (k === "z" && !e.shiftKey) { e.preventDefault(); undoPalette(); }
  else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redoPalette(); }
}
function onTabClick(e) {
  const btn = e.target.closest("[data-idx]");
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  if (idx === state.activeIdx) return;
  stopPlay();
  state.activeIdx = idx;
  clearPaletteHistory(); // undo history is per active video
  renderStep3Dynamic();
  loadActiveIntoPreview();
  requestPlotDraw();
}

/* --------- scene tabs (one tab per cut; each scoped to its scene) --------- */
// The active scene is per-video (v.activeScene). Preview seek/play/frame-step are scoped
// to the scene's [start,end); threshold / K / palette / 3D plot all reflect that scene.
function sceneRange(v, duration) {
  if (v && v.sceneMode && v.scenes && v.scenes[v.activeScene || 0]) {
    const s = v.scenes[v.activeScene || 0];
    return { start: s.start, end: Math.min(s.end, duration || s.end) };
  }
  return { start: 0, end: duration || 0 };
}

function previewStartTime(v) {
  if (v && v.sceneMode && v.scenes && v.scenes[v.activeScene || 0]) {
    const s = v.scenes[v.activeScene || 0];
    return Math.min(Math.max(0, s.end - 1e-3), s.start + Math.min(0.05, (s.end - s.start) / 3));
  }
  return initialPreviewTime(dom.workVideo);
}

function renderSceneTabs(v) {
  if (!dom.sceneTabs) return;
  if (!v || !v.sceneMode || !v.scenes || v.scenes.length < 2) { dom.sceneTabs.hidden = true; dom.sceneTabs.innerHTML = ""; return; }
  if (!(v.activeScene >= 0 && v.activeScene < v.scenes.length)) v.activeScene = 0;
  dom.sceneTabs.hidden = false;
  dom.sceneTabs.innerHTML = v.scenes.map((s, i) => {
    const cls = i === v.activeScene ? "scene-tab active" : "scene-tab";
    return `<button class="${cls}" data-scene="${i}" type="button"><span class="scene-name">シーン${i + 1}</span><span class="scene-time">${formatClock(s.start)}–${formatClock(s.end)}</span></button>`;
  }).join("");
}

function onSceneTabClick(e) {
  const btn = e.target.closest("[data-scene]");
  if (!btn) return;
  selectScene(Number(btn.dataset.scene));
}

function selectScene(idx) {
  const v = activeVideo();
  if (!v || !v.sceneMode || !v.scenes || !v.scenes[idx] || idx === v.activeScene) return;
  stopPlay();
  savePaletteState(v);
  v.activeScene = idx;
  loadPaletteState(v, v.scenes[idx].paletteId);
  dom.sConfirm.max = Math.max(150, (v.confirmThreshold || 0) + 8);
  dom.sConfirm.value = v.confirmThreshold;
  dom.vConfirm.textContent = v.confirmThreshold;
  syncThresholdDockControls(v.confirmThreshold);
  updateConfStepperBounds(v.confirmThreshold);
  renderSceneTabs(v);
  syncPopupSceneTabs();
  renderKControl(v);
  renderPalette(v);
  renderMetrics(v);
  renderKTable(v);
  state.plotCache = null;
  setPreviewTime(previewStartTime(v));
  requestPlotDraw();
}

function renderPalette(v) {
  const reps = v.analysis.representatives;
  const disabled = v.disabledKeys || new Set();
  const offN = reps.reduce((s, c) => s + (disabled.has(packedRGB(c)) ? 1 : 0), 0);
  dom.paletteCount.textContent = (reps.length - offN) + "色" + (offN ? `（OFF ${offN}）` : "");
  dom.palette.innerHTML = reps.map((rgb, i) => {
    const hex = rgbToHex(rgb);
    const key = packedRGB(rgb);
    const off = disabled.has(key);
    return `<button class="swatch${off ? " off" : ""}" data-rep="${key}" type="button" title="${off ? "クリックでON（この色を使う）" : "クリックでOFF（最も近い別の色に振り替え）"}" aria-pressed="${off ? "true" : "false"}">
      <span class="swatch-chip" style="background:${hex}"></span>
      <span class="swatch-txt"><span class="swatch-idx">${i + 1}.</span><span class="swatch-hex">${hex}</span></span>
    </button>`;
  }).join("");
}

// Toggle a representative (by packed RGB) ON/OFF. OFF excludes it from quantization → its pixels
// fall to the nearest kept color (preview, reduced映像, 3D plot, export, STEP4 all reflect it).
function togglePaletteKey(v, key) {
  if (!v || !v.analysis) return;
  v.disabledKeys = v.disabledKeys || new Set();
  if (v.disabledKeys.has(key)) {
    recordUndo("off", false); // capture pre-change for Ctrl+Z
    v.disabledKeys.delete(key); // ON: use this color again
  } else {
    const enabled = v.analysis.representatives.reduce((s, c) => s + (v.disabledKeys.has(packedRGB(c)) ? 0 : 1), 0);
    if (enabled <= 1) { showToast("info", "最後の1色はOFFにできません"); return; }
    recordUndo("off", false);
    v.disabledKeys.add(key); // OFF: its pixels go to the nearest remaining color
  }
  v.processedCache = new Map(); // mapping changed -> rebuild reduction caches
  v.maskCache = new Map();
  savePaletteState(v);          // persist OFF set + fresh caches (export/STEP4 read the palette state)
  state.plotCache = null;
  renderPalette(v);
  if (!state.playing) drawActiveFrame();
  requestPlotDraw();
}
function onPaletteClick(e) {
  const btn = e.target.closest("[data-rep]"); if (!btn) return;
  const v = activeVideo(); if (!v) return;
  togglePaletteKey(v, Number(btn.dataset.rep));
}
// Hover loupe over the reduced-preview canvas (STEP3), mirroring STEP4's pick loupe.
function reducedLoupeMove(clientX, clientY) {
  const loupe = dom.reducedLoupe;
  const v = activeVideo();
  if (!v || !v.analysis || !dom.cvReduced.width) { loupe.hidden = true; return; }
  const rect = dom.cvReduced.getBoundingClientRect();
  if (!rect.width || !rect.height) { loupe.hidden = true; return; }
  const fx = (clientX - rect.left) / rect.width, fy = (clientY - rect.top) / rect.height;
  if (fx < 0 || fy < 0 || fx > 1 || fy > 1) { loupe.hidden = true; return; }
  if (state.reducedFrameDirty || !state.reducedLoupeUrl) { state.reducedLoupeUrl = dom.cvReduced.toDataURL(); state.reducedFrameDirty = false; }
  const cw = dom.cvReduced.width, chh = dom.cvReduced.height;
  const LSIZE = 104, ZOOM = 8, bgW = rect.width * ZOOM, bgH = rect.height * ZOOM;
  const px = Math.min(cw - 1, Math.max(0, Math.floor(fx * cw))), py = Math.min(chh - 1, Math.max(0, Math.floor(fy * chh)));
  const sfx = (px + 0.5) / cw, sfy = (py + 0.5) / chh; // snap to pixel center; marker = one source pixel
  loupe.style.setProperty("--loupe-cell", `${bgW / cw}px`);
  loupe.style.backgroundImage = `url(${state.reducedLoupeUrl})`;
  loupe.style.backgroundSize = `${bgW}px ${bgH}px`;
  loupe.style.backgroundPosition = `${LSIZE / 2 - sfx * bgW}px ${LSIZE / 2 - sfy * bgH}px`;
  const wrap = dom.cvReduced.parentElement, wrect = wrap.getBoundingClientRect();
  let lx = clientX - wrect.left + 18; if (lx + LSIZE > wrect.width) lx = clientX - wrect.left - LSIZE - 18;
  let ly = clientY - wrect.top - LSIZE - 18; if (ly < 0) ly = clientY - wrect.top + 18;
  loupe.style.left = `${Math.max(0, lx)}px`; loupe.style.top = `${Math.max(0, ly)}px`;
  loupe.hidden = false;
}
// Click the reduced映像 to turn the clicked representative OFF (STEP3).
function reducedClickOff(clientX, clientY) {
  const v = activeVideo();
  if (!v || !v.analysis || !dom.cvReduced.width) return;
  const rect = dom.cvReduced.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const fx = (clientX - rect.left) / rect.width, fy = (clientY - rect.top) / rect.height;
  if (fx < 0 || fy < 0 || fx > 1 || fy > 1) return;
  const px = Math.min(dom.cvReduced.width - 1, Math.max(0, Math.floor(fx * dom.cvReduced.width)));
  const py = Math.min(dom.cvReduced.height - 1, Math.max(0, Math.floor(fy * dom.cvReduced.height)));
  const d = dom.cvReduced.getContext("2d", { willReadFrequently: true }).getImageData(px, py, 1, 1).data;
  if (d[0] === 255 && d[1] === 0 && d[2] === 255) { showToast("info", "ここは『新しい色』のためOFFにできません"); return; }
  const key = (d[0] << 16) | (d[1] << 8) | d[2];
  if (!v.analysis.representatives.some((c) => packedRGB(c) === key)) { showToast("info", "この色は統合後の色です。パレットから操作してください"); return; }
  togglePaletteKey(v, key); // displayed color is an enabled rep -> this turns it OFF
}

function renderMetrics(v) {
  const a = v.analysis;
  const ti = a.thresholdInfo;
  const snap = a.snapshotsByK && a.snapshotsByK[v.activeK];
  const minDist = snap ? snap.minRepresentativeDistance : a.selectedMinRepresentativeDistance;
  const rows = [
    ["代表色の数", String(v.activeK || a.selectedK)],
    ["しきい値", String(v.confirmThreshold)],
    [a.colorBucketBits ? "色bucket数" : "元のユニーク色", a.uniqueColors.toLocaleString()],
    ["カバー率", formatNumber(a.candidateCoverage * 100, 1) + "%"],
    ["候補色数", a.candidateCount.toLocaleString()],
    ["代表色の最小距離", formatNumber(minDist, 1)],
    ["判定方法", ti.mode === "auto" ? "自動" : "手動"],
    ["分位点", ti.quantileDistance == null ? "—" : formatNumber(ti.quantileDistance, 1)],
  ];
  if (v.sceneMode) {
    rows.push(["シーン分割", `${v.scenes.length}シーン / カット ${v.cuts.map((c) => c.toFixed(2) + "s").join(", ")}`]);
    const si = v.scenes.findIndex((s) => s.paletteId === v.curPaletteId);
    rows.push(["表示中のシーン", `シーン${(si >= 0 ? si : 0) + 1}（最初・最後フレーム由来）`]);
  }
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
  applyPreviewRate();
  state.plotCache = null;
  dom.workVideo.preload = "auto";
  dom.workVideo.src = v.url;
  dom.workVideo.load();
  ensureMetadata(dom.workVideo)
    .then(() => {
      setPreviewCanvasSizes(v.analysis.settings.previewShortSide);
      // Seek into the active scene (small positive offset so a real frame decodes).
      return seekVideo(dom.workVideo, previewStartTime(v));
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
  syncThresholdDockControls(value);
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

// Left offset that aligns an overlay marker to the range thumb's CENTER. The thumb is
// 18px (radius 9px), and its center travels from 9px to (track-9px), so a fraction f maps
// to 9px + f*(100% - 18px) — NOT a raw f%. Shared by all seek-bar markers for consistency.
function thumbAlignedLeft(frac) {
  const f = Math.max(0, Math.min(1, Number(frac) || 0));
  return `calc(9px + ${f} * (100% - 18px))`;
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
  dom.snapMarker.style.left = thumbAlignedLeft(frac);
  dom.snapMarker.hidden = false;
  updateConfStepperBounds(v.confirmThreshold);
  syncThresholdDockControls(v.confirmThreshold);
}

function updateSnapMarker(v) {
  if (!v || !v.analysis) { dom.snapMarker.hidden = true; return; }
  positionSnapMarker(v, computeFrameNoMagenta(v));
}

function updateSnapMarkerFromImageData(v, data) {
  if (!v || !v.analysis) { dom.snapMarker.hidden = true; return; }
  positionSnapMarker(v, computeNoMagentaFromData(data, v.analysis.representatives));
}

function drawActiveFrame(timeOverride) {
  const v = activeVideo();
  if (!v || !v.analysis || !dom.cvOrig.width) return;
  // During playback, use the presented frame's exact mediaTime so the per-frame region
  // mask stays aligned with the moving image (currentTime can race ahead of the frame).
  const t = (timeOverride != null ? timeOverride : dom.workVideo.currentTime);
  if (v.sceneMode) {
    // STEP3 always previews the ACTIVE scene. Pin the PALETTE-selection time inside it: during
    // playback the presented frame's mediaTime can sit a hair before/after the cut (float jitter vs
    // the scene boundary), so paletteIdAtTime would load a NEIGHBOUR scene's palette for ONE frame
    // — a wrong-colors flash (+ palette-UI flicker) at the loop boundary. Frame-step/seek don't hit
    // this because they clamp currentTime in-scene. The unclamped `t` below still drives the source
    // draw, region masks and the snap marker.
    const r = sceneRange(v, dom.workVideo.duration || 0);
    syncSceneForTime(v, Math.max(r.start, Math.min(r.end - 1e-3, t)));
  }
  const reps = repsEnabled(v.analysis.representatives, v.disabledKeys); // OFF clusters excluded -> their pixels fall to the nearest kept color
  const th = v.confirmThreshold;
  const sCtx = dom.cvOrig.getContext("2d", { willReadFrequently: true });
  const pCtx = dom.cvReduced.getContext("2d", { willReadFrequently: true });
  const mCtx = dom.cvMask.getContext("2d", { willReadFrequently: true });
  sCtx.drawImage(dom.workVideo, 0, 0, dom.cvOrig.width, dom.cvOrig.height);
  const base = sCtx.getImageData(0, 0, dom.cvOrig.width, dom.cvOrig.height);
  const proc = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  reduceFrame(proc.data, reps, th, v.processedCache, proc.width, proc.height, {});
  applyFrameMerges(proc.data, proc.width, proc.height, v, t); // confirmed STEP4 merges (color + region)
  pCtx.putImageData(proc, 0, 0);
  state.reducedFrameDirty = true; // the hover loupe re-snapshots the reduced canvas on the next move
  const mask = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  reduceFrame(mask.data, reps, th, v.maskCache, mask.width, mask.height, { maskOnly: true });
  mCtx.putImageData(mask, 0, 0);
  updateSnapMarkerFromImageData(v, base.data);
  syncPreviewSeekControls();
  syncLargePreview();
}

function syncLargePreview() {
  syncPreviewPopupCanvases();
}

function copyPreviewCanvas(src, dst) {
  if (!src || !dst || !src.width || !src.height) return;
  if (dst.width !== src.width || dst.height !== src.height) {
    dst.width = src.width;
    dst.height = src.height;
  }
  const ctx = dst.getContext("2d");
  ctx.clearRect(0, 0, dst.width, dst.height);
  ctx.drawImage(src, 0, 0);
}

function setPreviewLayout(layout) {
  state.previewLayout = ["row", "stack", "column"].includes(layout) ? layout : "row";
  syncPreviewLayoutControls();
  syncPreviewPopupPresentation();
}

function syncPreviewLayoutControls() {
  const doc = getPreviewPopupDocument();
  if (doc) {
    const grid = doc.getElementById("popGrid");
    if (grid) grid.dataset.layout = state.previewLayout;
    doc.querySelectorAll("[data-preview-layout]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.previewLayout === state.previewLayout);
    });
  }
}

function changePreviewZoom(factor) {
  setPreviewZoom(state.previewZoom * factor);
}

function setPreviewZoom(value) {
  state.previewZoom = Math.max(0.35, Math.min(4, Number(value) || 1));
  syncPreviewPopupPresentation();
}

function applyPreviewFit(grid, body) {
  if (!grid || !body) return;
  const shape = previewLayoutShape(state.previewLayout);
  const aspect = dom.cvOrig.width && dom.cvOrig.height ? dom.cvOrig.width / dom.cvOrig.height : 16 / 9;
  const gap = 12;
  const labelH = 24;
  const bodyW = Math.max(260, body.clientWidth || 720);
  const bodyH = Math.max(220, body.clientHeight || 420);
  const fitW = (bodyW - gap * (shape.cols - 1)) / shape.cols;
  const fitH = Math.max(120, (bodyH - labelH * shape.rows - gap * (shape.rows - 1)) / shape.rows) * aspect;
  const base = Math.max(140, Math.min(900, Math.floor(Math.min(fitW, fitH))));
  grid.dataset.layout = state.previewLayout;
  grid.style.setProperty("--preview-tile-width", base + "px");
  grid.style.setProperty("--preview-zoom", formatNumber(state.previewZoom, 2));
}

function previewLayoutShape(layout) {
  if (layout === "column") return { cols: 1, rows: 3 };
  if (layout === "stack") return { cols: 2, rows: 2 };
  return { cols: 3, rows: 1 };
}

function syncPreviewSeekControls() {
  const duration = Number.isFinite(dom.workVideo.duration) ? dom.workVideo.duration : 0;
  const current = Number.isFinite(dom.workVideo.currentTime) ? dom.workVideo.currentTime : 0;
  const text = `${formatClock(current)} / ${formatClock(duration)}`;
  const av = activeVideo();
  const r = sceneRange(av, duration); // seek bar is scoped to the active scene in scene mode
  const frameTxt = (av && av.fps && duration > 0) ? ` ・ コマ ${Math.floor(current * av.fps + 1e-6) + 1}` : "";
  syncSeekElement(dom.previewSeek, r.start, r.end, current);
  dom.previewTime.textContent = text + frameTxt;
  renderCutMarkers(av, duration);
  const doc = getPreviewPopupDocument();
  if (doc) {
    syncSeekElement(doc.getElementById("popSeek"), r.start, r.end, current);
    const time = doc.getElementById("popTime");
    if (time) time.textContent = text + frameTxt;
  }
}

function syncSeekElement(el, min, max, current) {
  if (!el) return;
  const lo = Math.max(0, min || 0);
  const hi = Math.max(lo, max || 0);
  el.min = String(lo);
  el.max = String(hi);
  el.value = String(Math.max(lo, Math.min(hi, current)));
}

// Cuts are now shown as scene TABS (each tab's seek bar is scoped to one scene), so the
// in-bar cut ticks are no longer used.
function renderCutMarkers() {
  if (dom.cutMarkers) dom.cutMarkers.innerHTML = "";
}

function onPreviewSeekInput(e) {
  setPreviewTime(Number(e.target.value));
}

function setPreviewTime(time) {
  const duration = Number.isFinite(dom.workVideo.duration) ? dom.workVideo.duration : 0;
  const v = activeVideo();
  const r = sceneRange(v, duration);
  // In scene mode, never land on a cut boundary: seeking to the exact boundary time is ambiguous and
  // can decode the ADJACENT (previous) scene's frame. Clamp the lower bound half a frame INTO the
  // scene's first frame so step-back / seek-to-start always shows this scene's first frame.
  let lo = r.start, hi = r.end;
  if (v && v.sceneMode) {
    const halfFrame = 0.5 / (v.fps || 30);
    lo = r.start + halfFrame;
    hi = Math.max(lo, r.end - 1e-3);
  }
  const target = Math.max(lo, Math.min(hi, Number(time) || 0));
  try { dom.workVideo.currentTime = target; } catch (e) { return; }
  syncPreviewSeekControls();
  if (!state.playing) {
    waitForVideoFrame(dom.workVideo).then(() => {
      drawActiveFrame();
      syncPreviewSeekControls();
    }).catch(() => {});
  }
}

// Measure the source frame rate once per video via requestVideoFrameCallback (the browser
// exposes time only in seconds, not frames). Plays the OFFSCREEN work video briefly while
// muted — invisible, since the preview canvases only update on drawActiveFrame. Falls back
// to 30 fps if rVFC is unavailable. Cached on v.fps.
// Snap a measured frame rate to the nearest standard rate ONLY when very close (≈1.2%), so a hair of
// measurement noise on a clean source yields the exact rate while genuine non-standard CFR (e.g. 24.4)
// keeps its measured value. NEVER blanket-rounds to an integer — 23.976/29.97/59.94 must survive, else
// the fps-grid scene boundaries drift off the real frames and a cut frame gets the wrong scene's palette.
function snapFps(raw) {
  let fps = Math.max(1, Math.min(120, raw));
  let best = fps, bestErr = 0.012;
  for (const s of [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60]) { const e = Math.abs(fps - s) / s; if (e < bestErr) { bestErr = e; best = s; } }
  return best;
}
async function ensureFps(v) {
  if (v.fps) return v.fps;
  const vid = dom.workVideo;
  if (typeof vid.requestVideoFrameCallback !== "function") { v.fps = 30; return 30; }
  const t0 = vid.currentTime;
  const times = [];
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; try { vid.pause(); } catch (e) { /* ignore */ } resolve(); };
    const onF = (now, meta) => { times.push(meta.mediaTime); if (times.length >= 16) { finish(); return; } vid.requestVideoFrameCallback(onF); };
    vid.muted = true;
    vid.requestVideoFrameCallback(onF);
    vid.play().catch(finish);
    setTimeout(finish, 2500);
  });
  const deltas = [];
  for (let i = 1; i < times.length; i += 1) { const d = times[i] - times[i - 1]; if (d > 0.0008) deltas.push(d); }
  deltas.sort((a, b) => a - b);
  if (deltas.length) {
    // Median delta (robust to a stray slow / stuttered frame during the brief measurement playback).
    v.fps = snapFps(1 / deltas[Math.floor(deltas.length / 2)]);
  } else v.fps = 30;
  try { vid.currentTime = t0; } catch (e) { /* ignore */ }
  return v.fps;
}

// Step the preview by ±1 frame. Snaps to the frame grid (CFR assumption) and lands
// mid-frame so the exact frame decodes.
async function stepPreviewFrame(delta) {
  const v = activeVideo();
  if (!v || !v.analysis || !Number.isFinite(dom.workVideo.duration)) return;
  stopPlay();
  const base = dom.workVideo.currentTime; // capture BEFORE fps measurement moves the time
  const fps = await ensureFps(v);
  const frameDur = 1 / fps;
  const dur = dom.workVideo.duration || 0;
  const idx = Math.floor(base * fps + 1e-6);
  const target = Math.min(Math.max(0, dur - frameDur * 0.5), Math.max(0, (idx + delta + 0.5) * frameDur));
  setPreviewTime(target);
}

function formatClock(sec) {
  const safe = Math.max(0, Number(sec) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function syncThresholdDockControls(value) {
  const v = Math.round(Number(value) || 0);
  const doc = getPreviewPopupDocument();
  if (doc) {
    const range = doc.getElementById("popThreshold");
    const label = doc.getElementById("popThresholdVal");
    if (range) {
      range.min = dom.sConfirm.min;
      range.max = dom.sConfirm.max;
      range.value = String(v);
    }
    if (label) label.textContent = String(v);
  }
}

function openPreviewPopup() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  const popup = window.open("", "paletteReducerPreviewDock", "popup=yes,width=1280,height=860,resizable=yes,scrollbars=yes");
  if (!popup) {
    showToast("error", "別ウィンドウを開けませんでした。ブラウザのポップアップ設定を確認してください。");
    return;
  }
  state.previewPopup = popup;
  writePreviewPopup(popup);
  syncPreviewPopupTitle();
  syncPreviewPopupPresentation();
  syncPreviewSeekControls();
  syncThresholdDockControls(activeVideo() ? activeVideo().confirmThreshold : 0);
  syncPopupSceneTabs();
  syncPreviewPopupCanvases();
  try { popup.focus(); } catch (e) { /* ignore */ }
}

function writePreviewPopup(popup) {
  const doc = popup.document;
  doc.open();
  doc.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Palette Reducer Preview</title><style>
    :root{color-scheme:dark;--bg:#11141a;--panel:#1d222b;--line:#343b48;--text:#eef1f5;--muted:#a2aab8;--accent:#e68a2e}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
    .head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel)}
    .title{font-size:14px;font-weight:700}.name{font-size:12px;color:var(--muted);margin-top:2px;max-width:48vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .actions,.tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    button{background:#2a303b;border:1px solid #3d4552;color:var(--text);border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer}button.active{border-color:var(--accent);color:var(--accent);background:#241d16}
    .zoomBox{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:12px;font-weight:700}.zoomBox input{width:70px;background:#11141a;border:1px solid #3d4552;color:var(--text);border-radius:8px;padding:7px 8px;font:inherit;text-align:right}
    .controls{padding:10px 14px;border-bottom:1px solid var(--line);background:#171b22}.row{display:flex;align-items:center;gap:10px;margin-bottom:8px}.row:last-child{margin-bottom:0}
    .label{width:68px;font-size:12px;font-weight:700;color:var(--muted)}input[type=range]{flex:1;min-width:140px}.time{width:86px;text-align:right;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
    .body{height:calc(100vh - 139px);overflow:scroll;scrollbar-gutter:stable both-edges;scrollbar-width:auto;scrollbar-color:#596272 #171b22;padding:12px}
    .body::-webkit-scrollbar{width:14px;height:14px}.body::-webkit-scrollbar-track{background:#171b22}.body::-webkit-scrollbar-thumb{background:#596272;border:3px solid #171b22;border-radius:10px}
    .grid{display:grid;grid-template-columns:repeat(3,max-content);gap:12px;align-items:start;width:max-content;min-width:100%;justify-content:center;--preview-tile-width:420px;--preview-zoom:1}
    .grid[data-layout=stack]{grid-template-columns:repeat(2,max-content)}.grid[data-layout=stack] .cell:nth-child(3){grid-column:1 / 3;justify-self:center}
    .grid[data-layout=column]{grid-template-columns:max-content}.grid[data-layout=column] .cell:nth-child(3){grid-column:auto}
    .label2{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}.canvas{width:calc(var(--preview-tile-width) * var(--preview-zoom));height:auto;display:block;background:#222;border:1px solid var(--line);border-radius:8px}
    .scenetabs{display:flex;gap:6px;flex-wrap:wrap;flex:1}.scenetab{background:#2a303b;border:1px solid #3d4552;color:var(--muted);border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12px}.scenetab.active{border-color:var(--accent);color:var(--accent);background:#241d16}
  </style></head><body>
    <div class="head"><div><div class="title">プレビュー別ウィンドウ</div><div id="popName" class="name">—</div></div><div class="actions"><button id="popPlay">▶ 再生</button><button id="popClose">閉じる</button></div></div>
    <div class="controls">
      <div class="row"><span class="label">再生位置</span><input id="popSeek" type="range" min="0" max="0" step="0.01" value="0"><span id="popTime" class="time">0:00 / 0:00</span></div>
      <div class="row"><span class="label">しきい値</span><input id="popThreshold" type="range" min="0" max="150" step="1" value="47"><span id="popThresholdVal" class="time">47</span></div>
      <div class="row" id="popSceneRow" style="display:none"><span class="label">シーン</span><div id="popSceneTabs" class="scenetabs"></div></div>
      <div class="tools"><button data-preview-layout="row">横3</button><button data-preview-layout="stack">上2 下1</button><button data-preview-layout="column">縦3</button><button id="popZoomOut">縮小</button><label class="zoomBox">倍率 <input id="popZoomValue" type="number" min="35" max="400" step="5" value="100"><span>%</span></label><button id="popZoomReset">リセット</button><button id="popZoomIn">拡大</button></div>
    </div>
    <div id="popBody" class="body"><div id="popGrid" class="grid" data-layout="row">
      <div class="cell"><div class="label2">元の動画</div><canvas id="popOrig" class="canvas"></canvas></div>
      <div class="cell"><div class="label2">色を減らした映像</div><canvas id="popReduced" class="canvas"></canvas></div>
      <div class="cell"><div class="label2">はみ出し色マップ</div><canvas id="popMask" class="canvas"></canvas></div>
    </div></div>
  </body></html>`);
  doc.close();
  doc.getElementById("popPlay").addEventListener("click", () => togglePlay(true));
  doc.getElementById("popClose").addEventListener("click", () => popup.close());
  doc.getElementById("popSeek").addEventListener("input", onPreviewSeekInput);
  doc.getElementById("popThreshold").addEventListener("input", (e) => { recordUndo("thr", true); setConfirmThreshold(Number(e.target.value), false); });
  doc.getElementById("popSceneTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-scene]"); if (b) selectScene(Number(b.dataset.scene)); });
  doc.querySelectorAll("[data-preview-layout]").forEach((btn) => btn.addEventListener("click", () => setPreviewLayout(btn.dataset.previewLayout)));
  doc.getElementById("popZoomOut").addEventListener("click", () => changePreviewZoom(0.85));
  doc.getElementById("popZoomValue").addEventListener("change", (e) => setPreviewZoom(Number(e.target.value) / 100));
  doc.getElementById("popZoomValue").addEventListener("keydown", (e) => {
    if (e.key === "Enter") setPreviewZoom(Number(e.target.value) / 100);
  });
  doc.getElementById("popZoomReset").addEventListener("click", () => setPreviewZoom(1));
  doc.getElementById("popZoomIn").addEventListener("click", () => changePreviewZoom(1.18));
  popup.addEventListener("resize", syncPreviewPopupPresentation);
  popup.addEventListener("beforeunload", () => { if (state.previewPopup === popup) state.previewPopup = null; });
}

function getPreviewPopupDocument() {
  const popup = state.previewPopup;
  if (!popup || popup.closed) return null;
  try { return popup.document; } catch (e) { return null; }
}

function syncPreviewPopupTitle() {
  const doc = getPreviewPopupDocument();
  if (!doc) return;
  const v = activeVideo();
  const name = doc.getElementById("popName");
  if (name) name.textContent = v ? v.name : "—";
}

// Mirror the STEP3 scene tabs into the popup (shown only when the active video has cuts).
function syncPopupSceneTabs() {
  const doc = getPreviewPopupDocument();
  if (!doc) return;
  const row = doc.getElementById("popSceneRow");
  const tabs = doc.getElementById("popSceneTabs");
  if (!row || !tabs) return;
  const v = activeVideo();
  if (!v || !v.sceneMode || !v.scenes || v.scenes.length < 2) { row.style.display = "none"; tabs.innerHTML = ""; return; }
  row.style.display = "";
  tabs.innerHTML = v.scenes.map((s, i) => {
    const cls = i === v.activeScene ? "scenetab active" : "scenetab";
    return `<button class="${cls}" data-scene="${i}" type="button">シーン${i + 1} ${formatClock(s.start)}–${formatClock(s.end)}</button>`;
  }).join("");
}

function syncPreviewPopupPresentation() {
  const doc = getPreviewPopupDocument();
  if (!doc) return;
  syncPreviewLayoutControls();
  applyPreviewFit(doc.getElementById("popGrid"), doc.getElementById("popBody"));
  syncPreviewZoomControls();
}

function syncPreviewZoomControls() {
  const doc = getPreviewPopupDocument();
  if (!doc) return;
  const input = doc.getElementById("popZoomValue");
  if (input) input.value = String(Math.round(state.previewZoom * 100));
}

function syncPreviewPopupCanvases() {
  const doc = getPreviewPopupDocument();
  if (!doc) return;
  copyPreviewCanvas(dom.cvOrig, doc.getElementById("popOrig"));
  copyPreviewCanvas(dom.cvReduced, doc.getElementById("popReduced"));
  copyPreviewCanvas(dom.cvMask, doc.getElementById("popMask"));
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
  dom.workVideo.loop = loop && !v.sceneMode; // in scene mode the loop is handled per-scene in the tick
  dom.workVideo.muted = true;
  applyPreviewRate();
  const r0 = sceneRange(v, dom.workVideo.duration || 0);
  if (dom.workVideo.ended || dom.workVideo.currentTime < r0.start || dom.workVideo.currentTime >= r0.end - 1e-3) {
    try { dom.workVideo.currentTime = r0.start; } catch (e) { /* ignore */ }
  }
  updatePlayButtons();
  const gen = (state._playGen = (state._playGen || 0) + 1);
  try { await dom.workVideo.play(); } catch (err) { stopPlay(); return; }
  // Frame-accurate playback (rVFC): draw on each presented frame and apply the region mask at that
  // frame's exact mediaTime, so merged regions stay locked to the motion. In scene mode we loop
  // WITHIN the active scene and NEVER draw a frame outside [start,end) — so no adjacent-scene frame
  // bleeds in. The last scene ends at the clip end (no out-of-scene frame to trigger the per-frame
  // wrap), so its loop is driven by the `ended` event instead.
  const useRVFC = typeof dom.workVideo.requestVideoFrameCallback === "function";
  const alive = () => state.playing && state._playGen === gen;
  if (!alive()) return;
  const reReg = () => { if (!alive()) return; if (useRVFC) dom.workVideo.requestVideoFrameCallback(onFrame); else state.rafPreview = requestAnimationFrame(onFrame); };
  const sceneNow = () => { const c = activeVideo(); return (c && c.sceneMode) ? sceneRange(c, dom.workVideo.duration || 0) : null; };
  const loopBack = (r) => { try { dom.workVideo.currentTime = r.start; } catch (e) { /* ignore */ } if (dom.workVideo.paused) dom.workVideo.play().catch(() => {}); };
  function onFrame(now, meta) {
    if (!alive()) return;
    const t = meta ? meta.mediaTime : dom.workVideo.currentTime;
    const r = sceneNow();
    if (r) {
      if (t >= r.end - 1e-3) {                       // past the scene end → loop or stop; do NOT draw the out-of-scene frame
        if (state.loop) { loopBack(r); reReg(); return; }
        stopPlay(); return;
      }
      if (t < r.start - 1e-3) { reReg(); return; }   // stray frame before the scene start (post loop-seek) → skip
    } else if (dom.workVideo.ended && !state.loop) { stopPlay(); return; }
    drawActiveFrame(meta ? meta.mediaTime : undefined);
    reReg();
  }
  function onEnded() {
    if (!alive()) return;
    const r = sceneNow();
    if (state.loop && r) { loopBack(r); reReg(); }   // last scene reached the clip end → wrap back to its start
    else if (!state.loop) stopPlay();
  }
  if (state._previewEnded) dom.workVideo.removeEventListener("ended", state._previewEnded);
  state._previewEnded = onEnded;
  dom.workVideo.addEventListener("ended", onEnded);
  reReg();
}

function stopPlay() {
  state.playing = false;
  state.loop = false;
  state._playGen = (state._playGen || 0) + 1; // invalidate any pending rVFC / raf / ended callbacks
  dom.workVideo.loop = false;
  if (state._previewEnded) { dom.workVideo.removeEventListener("ended", state._previewEnded); state._previewEnded = null; }
  if (state.rafPreview) { cancelAnimationFrame(state.rafPreview); state.rafPreview = null; }
  if (!dom.workVideo.paused) dom.workVideo.pause();
  updatePlayButtons();
}

function applyPreviewRate() {
  if (dom.previewRateSelect) dom.previewRateSelect.value = String(state.previewRate || 1);
  try { dom.workVideo.playbackRate = state.previewRate || 1; } catch (e) { /* ignore */ }
}

function updatePlayButtons() {
  const doc = getPreviewPopupDocument();
  const label = state.playing ? "⏸ 停止" : "▶ 再生"; // 「再生」はループ再生。停止/再開のトグル。
  dom.playBtn.textContent = label;
  if (doc) { const p = doc.getElementById("popPlay"); if (p) p.textContent = label; }
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
    state.plotRot.yaw -= dx * 0.01;
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
  // OFF (disabled) clusters are excluded, so their centers/spheres vanish from the plot and each
  // sample's nearest-distance is measured to a KEPT center (matching the reduced image).
  const reps = repsEnabled(v.analysis.representatives, v.disabledKeys);
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
  return { idx: state.activeIdx, k: v.activeK, dis: (v.disabledKeys && v.disabledKeys.size) || 0, repPts, samplePts };
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

  const disN = (v.disabledKeys && v.disabledKeys.size) || 0;
  if (!state.plotCache || state.plotCache.idx !== state.activeIdx || state.plotCache.k !== v.activeK || state.plotCache.dis !== disN) {
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

/* ============================ step4 color integration ============================ */
// Phase 1: scaffold — scene selectors + merged-group list. Live dual players,
// integration-mode color picking, target selection and merge application come next.
function mergeSceneList(v) {
  return v.sceneMode && v.scenes ? v.scenes : [{ start: 0, end: v.duration || 0, paletteId: v.curPaletteId || "only" }];
}
function sceneLabel(s, i) {
  return `シーン${i + 1} ${formatClock(s.start)}–${formatClock(s.end)}`;
}
function renderStep4() {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  const scenes = mergeSceneList(v);
  const single = scenes.length <= 1; // whole-video mode (or a no-cut clip): one scene, both players = whole video
  dom.mergeNoScene.hidden = !single;
  dom.mergeNoScene.textContent = state.wholeVideo
    ? "全編通しモードです。左右に同じ動画を表示し、動画全体（1つのパレット）で色を統合します。左右は別々の位置にシークできます。"
    : "この動画にはカット（シーンの切り替わり）が無いため、1つのシーン内での色の統合のみ可能です。";
  dom.mergeSceneL.hidden = single; dom.mergeSceneR.hidden = single; // selector is pointless with one scene
  const opts = scenes.map((s, i) => `<option value="${i}">${sceneLabel(s, i)}</option>`).join("");
  if (dom.mergeSceneL.innerHTML !== opts) dom.mergeSceneL.innerHTML = opts;
  if (dom.mergeSceneR.innerHTML !== opts) dom.mergeSceneR.innerHTML = opts;
  if (v.mergeSceneL == null) v.mergeSceneL = 0;
  if (v.mergeSceneR == null) v.mergeSceneR = Math.min(1, scenes.length - 1);
  dom.mergeSceneL.value = String(v.mergeSceneL);
  dom.mergeSceneR.value = String(v.mergeSceneR);
  if (v.mergeMode == null) v.mergeMode = false;
  if (!v.mergeSel) v.mergeSel = [];
  if (!v.merges) v.merges = [];
  if (!v._mergePanelOpen) dom.mergePanel.hidden = true;
  syncMergeModeUI(v);
  renderMergeGroups(v);
}
function renderMergeGroups(v) {
  const groups = (v && v.merges) || [];
  if (!groups.length) { dom.mergeGroupList.innerHTML = `<p class="fmt-desc">まだ統合はありません。</p>`; return; }
  dom.mergeGroupList.innerHTML = groups.map((g, i) => {
    const sw = g.members.map((m) => `<span class="merge-chip-sw${m.kind === "region" ? " region" : ""}" style="background:${rgbToHex(m.color)}" title="${m.kind === "region" ? "領域のみ" : "色全体"}"></span>`).join("");
    const hasRegion = g.members.some((m) => m.kind === "region");
    return `<div class="merge-group">${sw} → <span class="merge-chip-sw" style="background:${rgbToHex(g.target)}"></span>${hasRegion ? ' <span class="region-tag">領域</span>' : ""} <button class="link-danger" data-merge-del="${i}" type="button">解除</button></div>`;
  }).join("");
}

/* ---- STEP4 dual scene players (phase 2): two independent video elements, each scoped
   to its scene's time range, rendered with that scene's reduced palette ---- */
const mergePlayers = { L: null, R: null };
// Highlight marker colors for integration mode: colors picked on the LEFT player
// are spotlit pink, RIGHT cyan, so a selection's scene-of-origin stays readable
// even when the same color is shown across both players. Distinct from the
// 0xff00ff "new color" marker used by processPixels.
const MERGE_MARK = { L: [255, 64, 148], R: [0, 198, 255] };
let _mergeHintTimer = null;
function mpRefs(side) {
  return side === "L"
    ? { canvas: dom.mergeCanvasL, play: dom.mergePlayL, seek: dom.mergeSeekL, rate: dom.mergeRateL, time: dom.mergeTimeL }
    : { canvas: dom.mergeCanvasR, play: dom.mergePlayR, seek: dom.mergeSeekR, rate: dom.mergeRateR, time: dom.mergeTimeR };
}
function mergeScenePalette(v, sceneIdx) {
  const scenes = mergeSceneList(v);
  const sc = scenes[Math.max(0, Math.min(scenes.length - 1, sceneIdx))] || scenes[0];
  const st = (v.palettes && v.palettes[sc.paletteId]) || null;
  return { scene: sc, reps: st ? st.analysis.representatives : v.analysis.representatives, threshold: st ? st.confirmThreshold : v.confirmThreshold };
}
function setupMergePlayer(side) {
  const v = activeVideo();
  if (!v || !v.analysis) return;
  const r = mpRefs(side);
  let mp = mergePlayers[side];
  if (!mp) {
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "auto";
    mp = mergePlayers[side] = { side, video, raf: null, playing: false, fps: 0, rate: 1, cache: new Map() };
  }
  mpStop(side);
  const sceneIdx = side === "L" ? (v.mergeSceneL || 0) : (v.mergeSceneR || 0);
  const pal = mergeScenePalette(v, sceneIdx);
  const palDisabled = (v.palettes[pal.scene.paletteId] || {}).disabledKeys; // STEP3 OFF clusters carry into STEP4's reduction
  const prev = mp.scene;
  const sameScene = !!prev && prev.paletteId === pal.scene.paletteId && prev.start === pal.scene.start && prev.end === pal.scene.end;
  mp.scene = pal.scene; mp.reps = repsEnabled(pal.reps, palDisabled); mp.threshold = pal.threshold; mp.cache = new Map();
  r.rate.value = String(mp.rate || 1);
  const srcChanged = mp.video.src !== v.url;
  if (srcChanged) { mp.video.src = v.url; mp.video.load(); }
  ensureMetadata(mp.video).then(() => {
    const sz = scaledSize(mp.video.videoWidth, mp.video.videoHeight, v.analysis.settings.previewShortSide);
    if (r.canvas.width !== sz.width || r.canvas.height !== sz.height) { r.canvas.width = sz.width; r.canvas.height = sz.height; }
    const t = mp.video.currentTime;
    // No-op re-entry (same scene, src unchanged, playhead already inside the scene): keep the decoded
    // frame and just redraw — skip the ~250ms seek/relatch. Same <video>, same floor index, no pixel change.
    if (sameScene && !srcChanged && t >= mp.scene.start && t < mp.scene.end) return null;
    return seekVideo(mp.video, Math.min(Math.max(0, mp.scene.end - 0.05), mp.scene.start + 0.04));
  }).then(() => mpDraw(side)).catch((e) => console.error(e));
}
function mpDraw(side, timeOverride) {
  const mp = mergePlayers[side]; if (!mp || !mp.scene) return;
  const r = mpRefs(side);
  if (!r.canvas.width) return;
  const ctx = r.canvas.getContext("2d", { willReadFrequently: true });
  try { ctx.drawImage(mp.video, 0, 0, r.canvas.width, r.canvas.height); } catch (e) { return; }
  const img = ctx.getImageData(0, 0, r.canvas.width, r.canvas.height);
  // During playback, the mask must be looked up by the PRESENTED frame's exact mediaTime
  // (passed in), not currentTime — otherwise the per-frame region mask lands a frame off
  // the moving object and appears to drift.
  const W = r.canvas.width, H = r.canvas.height, t = (timeOverride != null ? timeOverride : mp.video.currentTime) || 0;
  reduceFrame(img.data, mp.reps, mp.threshold, mp.cache, W, H, { flat: true });
  const v = activeVideo();
  // confirmed + previewed merges, applied in order so chained re-merges resolve fully
  if (v) applyFrameMerges(img.data, W, H, v, t, true);
  // Keep a clean reduced copy (post-merge, no highlight) on an offscreen canvas so
  // color picking and the hover loupe always read true representative colors.
  if (!mp.pickCanvas) mp.pickCanvas = document.createElement("canvas");
  if (mp.pickCanvas.width !== r.canvas.width || mp.pickCanvas.height !== r.canvas.height) {
    mp.pickCanvas.width = r.canvas.width; mp.pickCanvas.height = r.canvas.height;
    mp.pickCtx = mp.pickCanvas.getContext("2d", { willReadFrequently: true });
  }
  mp.pickCtx.putImageData(img, 0, 0);
  mp.frameDirty = true;
  if (v && v.mergeMode && !v._mergePanelOpen && v.mergeSel && v.mergeSel.length) applyMergeSpotlight(img.data, W, H, v.mergeSel, t);
  ctx.putImageData(img, 0, 0);
  mpSyncControls(side);
}
function mpSyncControls(side) {
  const mp = mergePlayers[side]; if (!mp || !mp.scene) return;
  const r = mpRefs(side);
  const cur = mp.video.currentTime || 0;
  r.seek.min = String(mp.scene.start);
  r.seek.max = String(Math.max(mp.scene.start, mp.scene.end));
  r.seek.value = String(Math.max(mp.scene.start, Math.min(mp.scene.end, cur)));
  const frame = mp.fps ? ` ・ コマ ${Math.floor(cur * mp.fps + 1e-6) + 1}` : "";
  r.time.textContent = `${formatClock(cur)} / ${formatClock(mp.scene.end)}${frame}`;
  r.play.textContent = mp.playing ? "⏸" : "▶";
}
function mpStop(side) {
  const mp = mergePlayers[side]; if (!mp) return;
  mp.playing = false;
  if (mp.raf) { cancelAnimationFrame(mp.raf); mp.raf = null; }
  try { if (mp.video && !mp.video.paused) mp.video.pause(); } catch (e) { /* ignore */ }
  mpSyncControls(side);
}
function mpTogglePlay(side) {
  const mp = mergePlayers[side]; if (!mp || !mp.scene) return;
  const vb = activeVideo(); if (vb && regionBusy(vb, side)) return; // don't fight THIS side's region capture for the video (the other side stays free)
  if (mp.playing) { mpStop(side); return; }
  mp.playing = true;
  try { mp.video.playbackRate = mp.rate || 1; } catch (e) { /* ignore */ }
  if (mp.video.currentTime < mp.scene.start || mp.video.currentTime >= mp.scene.end - 1e-3) {
    try { mp.video.currentTime = mp.scene.start; } catch (e) { /* ignore */ }
  }
  mpSyncControls(side);
  mp.video.play().catch(() => mpStop(side));
  // Frame-accurate playback: redraw on each PRESENTED frame and apply the region mask at
  // that frame's exact mediaTime, so the recolored region stays locked to the motion.
  const useRVFC = typeof mp.video.requestVideoFrameCallback === "function";
  const onFrame = (now, meta) => {
    if (!mp.playing || mp.video.paused) { mpStop(side); return; }
    const t = meta ? meta.mediaTime : mp.video.currentTime;
    if (t >= mp.scene.end - 1e-3) { try { mp.video.currentTime = mp.scene.start; } catch (e) { /* ignore */ } } // loop within scene
    mpDraw(side, meta ? meta.mediaTime : undefined);
    if (useRVFC) mp.video.requestVideoFrameCallback(onFrame);
    else mp.raf = requestAnimationFrame(onFrame);
  };
  if (useRVFC) mp.video.requestVideoFrameCallback(onFrame);
  else mp.raf = requestAnimationFrame(onFrame);
}
function mpSeek(side, t) {
  const mp = mergePlayers[side]; if (!mp || !mp.scene) return;
  const vb = activeVideo(); if (vb && regionBusy(vb, side)) return; // this side's region capture owns its video right now
  const target = Math.max(mp.scene.start, Math.min(Math.max(mp.scene.start, mp.scene.end - 1e-3), Number(t) || 0));
  try { mp.video.currentTime = target; } catch (e) { return; }
  if (!mp.playing) waitForVideoFrame(mp.video).then(() => mpDraw(side)).catch(() => {});
  else mpSyncControls(side);
}
async function mpEnsureFps(side) {
  const mp = mergePlayers[side]; if (!mp) return 30;
  if (mp.fps) return mp.fps;
  // fps is a property of the VIDEO, not the player — measure once and share across L/R so the region
  // cache sig (which rounds fps) is identical for both players → whole-video loads frames ONCE.
  const shared = activeVideo();
  if (shared && shared._mpFps) { mp.fps = shared._mpFps; return mp.fps; }
  const vid = mp.video;
  if (typeof vid.requestVideoFrameCallback !== "function") { mp.fps = 30; if (shared) shared._mpFps = 30; return 30; }
  const base = vid.currentTime; const times = [];
  await new Promise((res) => {
    let done = false; const fin = () => { if (done) return; done = true; try { vid.pause(); } catch (e) { /* ignore */ } res(); };
    const onF = (n, meta) => { times.push(meta.mediaTime); if (times.length >= 6) { fin(); return; } vid.requestVideoFrameCallback(onF); };
    vid.muted = true; vid.requestVideoFrameCallback(onF); vid.play().catch(fin); setTimeout(fin, 1500);
  });
  const d = []; for (let i = 1; i < times.length; i += 1) { const x = times[i] - times[i - 1]; if (x > 0.0008) d.push(x); }
  d.sort((a, b) => a - b);
  mp.fps = d.length ? snapFps(1 / d[Math.floor(d.length / 2)]) : 30; // no integer rounding — non-standard CFR (23.976/29.97/24.4) must survive so region-mask frame indices stay aligned
  if (shared) shared._mpFps = mp.fps; // share with the other player
  try { vid.currentTime = base; } catch (e) { /* ignore */ }
  return mp.fps;
}
async function mpStep(side, delta) {
  const mp = mergePlayers[side]; if (!mp || !mp.scene) return;
  const vb = activeVideo(); if (vb && regionBusy(vb, side)) return;
  mpStop(side);
  const base = mp.video.currentTime;
  const fps = await mpEnsureFps(side);
  const idx = Math.floor(base * fps + 1e-6);
  mpSeek(side, (idx + delta + 0.5) / fps);
}
function stopMergePlayers() { mpStop("L"); mpStop("R"); }

/* ---- STEP4 integration mode (phase 3): pick representative colors on the stopped
   reduced video, see them spotlit across both scenes, and collect a removable
   selection list. Selecting the merge target + applying comes in phase 4. ---- */
function setMergeHint(text) { dom.mergeModeHint.textContent = text; }
function flashMergeHint(text) {
  setMergeHint(text);
  if (_mergeHintTimer) clearTimeout(_mergeHintTimer);
  _mergeHintTimer = setTimeout(() => { const v = activeVideo(); if (v) syncMergeModeUI(v); }, 1900);
}
function applyMergeSpotlight(data, outW, outH, sel, timeSec) {
  const colorMark = new Map(); // whole-color selections
  const regions = [];          // region selections active at this frame (mask is authoritative)
  for (const s of sel) {
    const mk = MERGE_MARK[s.side] || MERGE_MARK.L;
    if (isRegionMember(s)) {
      const rg = s.region;
      if (timeSec < rg.scene.start - 1e-6 || timeSec >= rg.scene.end + 1e-6) continue;
      const mask = rg.masks.get(regionIndexAtTime(rg, timeSec));
      if (mask) regions.push({ mk, mask, mw: rg.w, mh: rg.h, skey: packedRGB(s.color) });
    } else {
      colorMark.set(packedRGB(s.color), mk);
    }
  }
  // Mark whole-color selections in place; leave everything else at FULL brightness (no dimming —
  // the user found the global darkening distracting; the bright mark color is enough to stand out).
  if (colorMark.size) for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    const m = colorMark.get(key);
    if (m) { data[i] = m[0]; data[i + 1] = m[1]; data[i + 2] = m[2]; }
  }
  // ...then paint each region's mask on top (purely by position).
  for (const rg of regions) {
    if (rg.mw === outW && rg.mh === outH) {
      rleMaskForEach(rg.mask, (x, y) => { const i = (y * outW + x) * 4; data[i] = rg.mk[0]; data[i + 1] = rg.mk[1]; data[i + 2] = rg.mk[2]; });
    } else { // transient highlight only (and this mismatch path is rare); a 1px box edge is cosmetic
      rleMaskForEach(rg.mask, (mx, my) => {
        const ox0 = Math.round(mx * outW / rg.mw), oy0 = Math.round(my * outH / rg.mh);
        const ox1 = Math.round((mx + 1) * outW / rg.mw), oy1 = Math.round((my + 1) * outH / rg.mh);
        for (let oy = oy0; oy < oy1 && oy < outH; oy += 1) for (let ox = ox0; ox < ox1 && ox < outW; ox += 1) { const i = (oy * outW + ox) * 4; data[i] = rg.mk[0]; data[i + 1] = rg.mk[1]; data[i + 2] = rg.mk[2]; }
      });
    }
  }
}
function toggleMergeMode() {
  const v = activeVideo(); if (!v) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; } // don't disturb the in-flight capture
  v.mergeMode = !v.mergeMode;
  if (v.mergeMode) { mpStop("L"); mpStop("R"); } // picking requires a still frame
  else closeMergePanel(v);
  syncMergeModeUI(v);
  ["L", "R"].forEach((s) => { const mp = mergePlayers[s]; if (mp && !mp.playing) mpDraw(s); });
}
// A merge needs at least two DIFFERENT color codes — selecting the same color (even via
// two swatches / two regions) has no valid target, so the merge action stays hidden.
function mergeHasDistinctColors(v) {
  const sel = (v && v.mergeSel) || [];
  const set = new Set();
  for (const s of sel) set.add(packedRGB(s.color));
  return set.size >= 2;
}
function syncMergeModeUI(v) {
  const on = !!(v && v.mergeMode);
  const region = on && !!(v && v.regionMode);
  dom.mergeModeBtn.textContent = on ? "🎯 統合モード：オン" : "🎯 統合モード：オフ";
  dom.mergeModeBtn.classList.toggle("active", on);
  dom.mergeRegionBtn.hidden = !on;
  dom.mergeRegionBtn.textContent = region ? "🧩 選択範囲：隣接領域だけ" : "🧩 選択範囲：色全体";
  dom.mergeRegionBtn.classList.toggle("active", region);
  dom.mergeCanvasL.classList.toggle("pickable", on);
  dom.mergeCanvasR.classList.toggle("pickable", on);
  if (!on) { dom.mergeLoupeL.hidden = true; dom.mergeLoupeR.hidden = true; }
  setMergeHint(!on
    ? "「統合モード」をオンにすると、プレビュー上の色をクリックして選べます"
    : region
      ? "動画を止めて、まとめたい部分をクリック（その色の“つながった領域”だけを前後フレームまで選びます）"
      : "動画を止めて、まとめたい色をクリック（左右どちらからでも・再クリックで解除）");
  renderMergeChips(v);
  dom.mergeActionRow.hidden = !(on && mergeHasDistinctColors(v));
}
function toggleRegionMode() {
  const v = activeVideo(); if (!v || !v.mergeMode) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; }
  v.regionMode = !v.regionMode;
  syncMergeModeUI(v);
}
function canvasPixelAt(side, clientX, clientY) {
  const r = mpRefs(side);
  const rect = r.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !r.canvas.width) return null;
  const fx = (clientX - rect.left) / rect.width, fy = (clientY - rect.top) / rect.height;
  if (fx < 0 || fy < 0 || fx > 1 || fy > 1) return null;
  const px = Math.min(r.canvas.width - 1, Math.max(0, Math.floor(fx * r.canvas.width)));
  const py = Math.min(r.canvas.height - 1, Math.max(0, Math.floor(fy * r.canvas.height)));
  return { px, py, fx, fy, rect };
}
function repIndexForColor(reps, d) {
  let repIndex = -1, bd = Infinity;
  for (let i = 0; i < reps.length; i += 1) {
    const dr = reps[i][0] - d[0], dg = reps[i][1] - d[1], db = reps[i][2] - d[2], ds = dr * dr + dg * dg + db * db;
    if (ds < bd) { bd = ds; repIndex = i; }
    if (ds === 0) break;
  }
  return repIndex;
}
function mergePickAt(side, clientX, clientY) {
  const v = activeVideo(); if (!v || !v.mergeMode) return;
  const mp = mergePlayers[side]; if (!mp || !mp.scene || !mp.pickCtx) return;
  if (mp.playing) { flashMergeHint("⏸ 再生を止めてからクリックしてください"); return; }
  if (regionBusy(v, side)) { flashMergeHint("いまこの側で領域を計算中です…"); return; } // the OTHER side can still pick/build in parallel
  const at = canvasPixelAt(side, clientX, clientY); if (!at) return;
  const d = mp.pickCtx.getImageData(at.px, at.py, 1, 1).data;
  if (d[0] === 255 && d[1] === 0 && d[2] === 255) { flashMergeHint("ここは『新しい色』のため統合の対象にできません"); return; }
  if (v.regionMode) { pickRegion(side, at.px, at.py); return; }
  const repIndex = repIndexForColor(mp.reps, d);
  if (repIndex < 0) return;
  toggleMergeSelection(v, side, mp.scene.paletteId, repIndex, mp.reps[repIndex].slice());
}
async function pickRegion(side, px, py) {
  const v = activeVideo(); const mp = mergePlayers[side];
  try {
    const region = await buildRegionSelection(side, px, py);
    if (!region) { if (v) syncMergeModeUI(v); return; } // not found -> no chip added (hint already shown)
    const repIndex = repIndexForColor(mp.reps, region.color);
    v.mergeSel = v.mergeSel || [];
    v.mergeSel.push({ id: (v._selSeq = (v._selSeq || 0) + 1), side, paletteId: region.paletteId, repIndex, color: region.color.slice(), kind: "region", region });
    refreshMergeSelection(v);
    flashMergeHint(`🧩 領域を選択しました（${region.frameCount} フレーム）`);
  } catch (e) { console.error(e); setRegionBusy(v, side, false); flashMergeHint("領域の計算に失敗しました"); }
  finally { hideMergeProgress(side); } // hide the progress overlay on every exit (capture + compute phases)
}
function toggleMergeSelection(v, side, paletteId, repIndex, color) {
  v.mergeSel = v.mergeSel || [];
  // toggle only matches an existing whole-color selection (region picks never dedupe)
  const idx = v.mergeSel.findIndex((s) => !isRegionMember(s) && s.side === side && s.paletteId === paletteId && s.repIndex === repIndex);
  if (idx >= 0) v.mergeSel.splice(idx, 1);
  else v.mergeSel.push({ id: (v._selSeq = (v._selSeq || 0) + 1), side, paletteId, repIndex, color, kind: "color" });
  refreshMergeSelection(v);
}
function refreshMergeSelection(v) {
  renderMergeChips(v);
  dom.mergeActionRow.hidden = !(v.mergeMode && mergeHasDistinctColors(v));
  ["L", "R"].forEach((s) => { const mp = mergePlayers[s]; if (mp && !mp.playing) mpDraw(s); });
}
function renderMergeChips(v) {
  const sel = (v && v.mergeSel) || [];
  for (const side of ["L", "R"]) {
    const el = side === "L" ? dom.mergeChipsL : dom.mergeChipsR;
    const items = sel.filter((s) => s.side === side);
    el.innerHTML = items.length
      ? items.map((s) => { const tag = isRegionMember(s) ? "▦ " : ""; const suf = isRegionMember(s) ? "（領域）" : ""; return `<button class="merge-chip${isRegionMember(s) ? " region" : ""}" data-mc-id="${s.id}" type="button" title="クリックで解除"><span class="merge-chip-sw" style="background:${rgbToHex(s.color)}"></span>${tag}${rgbToHex(s.color)}${suf} ✕</button>`; }).join("")
      : `<span class="fmt-desc">（なし）</span>`;
  }
}
function onMergeChipClick(e) {
  const btn = e.target.closest("[data-mc-id]"); if (!btn) return;
  const v = activeVideo(); if (!v) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; } // don't edit the selection the build will push into
  const s = (v.mergeSel || []).find((x) => String(x.id) === btn.dataset.mcId);
  if (!s) return;
  v.mergeSel = v.mergeSel.filter((x) => x !== s); // deselect immediately (no confirm)
  refreshMergeSelection(v);
}
function clearMergeSelection() {
  const v = activeVideo(); if (!v || !(v.mergeSel && v.mergeSel.length)) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; }
  if (!window.confirm("選択した色をすべて解除しますか？")) return;
  v.mergeSel = [];
  refreshMergeSelection(v);
}
function mergeLoupeMove(side, clientX, clientY) {
  const v = activeVideo();
  const mp = mergePlayers[side];
  const loupe = side === "L" ? dom.mergeLoupeL : dom.mergeLoupeR;
  if (!v || !v.mergeMode || !mp || !mp.pickCanvas || mp.playing) { loupe.hidden = true; return; }
  const at = canvasPixelAt(side, clientX, clientY); if (!at) { loupe.hidden = true; return; }
  if (mp.frameDirty || !mp.loupeUrl) { mp.loupeUrl = mp.pickCanvas.toDataURL(); mp.frameDirty = false; }
  const cw = mp.pickCanvas.width, chh = mp.pickCanvas.height;
  const LSIZE = 104, ZOOM = 8, bgW = at.rect.width * ZOOM, bgH = at.rect.height * ZOOM;
  // snap to the sampled pixel's CENTER and size the marker to exactly one source pixel (clear which color)
  const sfx = (at.px + 0.5) / cw, sfy = (at.py + 0.5) / chh;
  loupe.style.setProperty("--loupe-cell", `${bgW / cw}px`);
  loupe.style.backgroundImage = `url(${mp.loupeUrl})`;
  loupe.style.backgroundSize = `${bgW}px ${bgH}px`;
  loupe.style.backgroundPosition = `${LSIZE / 2 - sfx * bgW}px ${LSIZE / 2 - sfy * bgH}px`;
  const wrap = mpRefs(side).canvas.parentElement, wrect = wrap.getBoundingClientRect();
  let lx = clientX - wrect.left + 18; if (lx + LSIZE > wrect.width) lx = clientX - wrect.left - LSIZE - 18;
  let ly = clientY - wrect.top - LSIZE - 18; if (ly < 0) ly = clientY - wrect.top + 18;
  loupe.style.left = `${Math.max(0, lx)}px`; loupe.style.top = `${Math.max(0, ly)}px`;
  loupe.hidden = false;
  const d = mp.pickCtx.getImageData(at.px, at.py, 1, 1).data;
  const isNew = d[0] === 255 && d[1] === 0 && d[2] === 255;
  setMergeHint(isNew ? "🎨 新しい色（統合の対象外）" : `🎨 ${rgbToHex([d[0], d[1], d[2]])}（クリックで選択／再クリックで解除）`);
}

/* ---- STEP4 merge application (phase 4): build a color remap from confirmed merges,
   choose a merge target with live preview, and compare scene1 / after-merge / scene2
   palettes as side-by-side 3D scatter plots. ---- */
function packedRGB(c) { return (c[0] << 16) | (c[1] << 8) | c[2]; }
function sameColor(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
// A member is either {kind:"color", color} (whole representative color, applied as a
// global LUT) or {kind:"region", color, region} (only the tracked spatial region —
// see buildRegionSelection — applied per frame via a mask). The color LUT covers the
// fast common case; region members are an additive masked pass.
function isRegionMember(m) { return m && m.kind === "region" && m.region; }
// all merge groups active for a frame: confirmed + (player) previewed pending
function mergeGroupsFor(v, includePending) {
  const groups = [];
  if (v && v.merges) for (const g of v.merges) groups.push(g);
  if (includePending && v && v._mergePending && v._mergePending.target) groups.push(v._mergePending);
  return groups;
}
// Apply merges to a reduced frame. Groups run IN ORDER, each composing on the previous
// result — so re-merging an already-merged color carries EVERYTHING that became that
// color along with it (chained). A member is either a whole representative color or a
// tracked spatial region (masked per frame, nearest-scaled to the output size).
function applyFrameMerges(data, outW, outH, v, timeSec, includePending) {
  if (!v) return;
  const groups = mergeGroupsFor(v, !!includePending);
  if (!groups.length) return;
  for (const g of groups) {
    const T0 = g.target[0], T1 = g.target[1], T2 = g.target[2];
    const colorKeys = new Set();
    const regions = [];
    for (const m of (g.members || [])) {
      if (isRegionMember(m)) {
        const rg = m.region;
        if (timeSec < rg.scene.start - 1e-6 || timeSec >= rg.scene.end + 1e-6) continue;
        const mask = rg.masks.get(regionIndexAtTime(rg, timeSec));
        if (mask) regions.push({ mask, mw: rg.w, mh: rg.h, mkey: packedRGB(m.color) }); // mask is AUTHORITATIVE (built in this same reduction domain)
      } else {
        colorKeys.add(packedRGB(m.color));
      }
    }
    if (colorKeys.size) {
      for (let i = 0; i < data.length; i += 4) { const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]; if (colorKeys.has(key)) { data[i] = T0; data[i + 1] = T1; data[i + 2] = T2; } }
    }
    for (const rg of regions) {
      if (rg.mw === outW && rg.mh === outH) {
        rleMaskForEach(rg.mask, (x, y) => { const i = (y * outW + x) * 4; data[i] = T0; data[i + 1] = T1; data[i + 2] = T2; });
      } else { // region built at a different resolution (e.g. preview res changed before apply): nearest-scale up
        const mk = rg.mkey; // gate the upscaled box on the seed color so the mask stays ⊆ isC (no blocky spill onto other colors)
        rleMaskForEach(rg.mask, (mx, my) => {
          const ox0 = Math.round(mx * outW / rg.mw), oy0 = Math.round(my * outH / rg.mh);
          const ox1 = Math.round((mx + 1) * outW / rg.mw), oy1 = Math.round((my + 1) * outH / rg.mh);
          for (let oy = oy0; oy < oy1 && oy < outH; oy += 1) for (let ox = ox0; ox < ox1 && ox < outW; ox += 1) { const i = (oy * outW + ox) * 4; if (((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) === mk) { data[i] = T0; data[i + 1] = T1; data[i + 2] = T2; } }
        });
      }
    }
  }
}
// final displayed color of a representative after all (ordered) color merges — for the 3D plot
function resolveMergedColor(c, groups) {
  let cur = c;
  for (const g of groups) for (const m of (g.members || [])) {
    if (!isRegionMember(m) && sameColor(m.color, cur)) { cur = g.target; break; }
  }
  return cur;
}
/* ---- spatiotemporal region flood fill (scene-scoped). Builds a per-frame mask of the
   connected same-color region seeded at the click, then walks frames forward/back,
   carrying any same-color component that overlaps the previous frame's mask by ≥1px. ---- */
function floodRegionBytes(isC, w, h, seeds) {
  const out = new Uint8Array(w * h);
  const stack = [];
  for (const s of seeds) if (isC[s] && !out[s]) { out[s] = 1; stack.push(s); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (isC[np] && !out[np]) { out[np] = 1; stack.push(np); }
    }
  }
  return out;
}
// Morphological dilation by L1 radius r (only expands set pixels) — used to GATE the next
// frame's flood seed (tolerate motion / re-acquire), never stored in the mask itself.
function dilateBytes(bytes, w, h, r, sa, sb) {
  if (r <= 0) return bytes;
  const len = bytes.length;
  // Ping-pong two scratch buffers (reused across iterations AND frames when the caller supplies
  // them) instead of allocating r fresh n-byte slices per call. Identical output (set-only expand).
  const a = sa || new Uint8Array(len), b = sb || new Uint8Array(len);
  let cur = bytes;
  for (let it = 0; it < r; it += 1) {
    const out = (it & 1) ? b : a;
    out.set(cur);
    for (let p = 0; p < len; p += 1) {
      if (!cur[p]) continue;
      const x = p % w;
      if (x > 0) out[p - 1] = 1;
      if (x < w - 1) out[p + 1] = 1;
      if (p >= w) out[p - w] = 1;
      if (p < len - w) out[p + w] = 1;
    }
    cur = out;
  }
  return cur;
}
// Among the same-color (isC) connected components reachable from `seeds`, return the SINGLE one
// with the most pixels inside `gate` (the dilated prev mask). This is the region's true
// continuation; an unrelated same-color blob that merely clips the gate scores low and is dropped,
// so it never gets flooded into the mask. Each component is flooded once (visited guard).
function bestOverlapComponent(isC, w, h, seeds, gate) {
  const n = w * h;
  const visited = new Uint8Array(n);
  let best = null, bestScore = -1;
  for (const s of seeds) {
    if (visited[s] || !isC[s]) continue;
    const comp = floodRegionBytes(isC, w, h, [s]);
    let score = 0;
    for (let p = 0; p < n; p += 1) if (comp[p]) { visited[p] = 1; if (gate[p]) score += 1; }
    if (score > bestScore) { bestScore = score; best = comp; }
  }
  return best;
}
function toBitset(bytes, n) {
  const bs = new Uint8Array((n + 7) >> 3);
  for (let p = 0; p < n; p += 1) if (bytes[p]) bs[p >> 3] |= (1 << (p & 7));
  return bs;
}
const REGION_CAPTURE_RATE = 1; // 1x presents (nearly) every frame; the seek pass fills any gaps
// Map a time to a frame index — FLOOR + clamp. The frame DISPLAYED/decoded at currentTime t is
// the one whose interval [k/fps,(k+1)/fps) contains t, i.e. floor(t*fps). Using floor (not round)
// makes the capture key, live playback (presented mediaTime), the paused/clicked seed frame, and
// the seek-based export ALL resolve to the same decoded frame — fixing the export 1-frame offset
// and the frame-step/slider seed off-by-one.
function regionFrameIndex(fps, t, fStart, fEnd) {
  return Math.max(fStart, Math.min(fEnd, Math.floor(t * fps + 1e-6)));
}
// Map an apply time to the captured frame index for region rg. With per-frame capture PTS this
// finds the frame actually being displayed at t (largest captured time <= t) — exact for variable
// frame rate. For constant fps (times[i] = (fStart+i)/fps) it reduces to the same floor() as
// regionFrameIndex, so it never changes constant-fps behaviour.
function regionIndexAtTime(rg, t) {
  const times = rg.times;
  if (!times || !times.length) return regionFrameIndex(rg.fps, t, rg.fStart, rg.fEnd);
  let lo = 0, hi = times.length - 1, ans = 0;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (times[mid] <= t + 1e-6) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return rg.fStart + ans;
}
// run-length codec for cached index maps (reduced frames are flat -> compresses ~100x)
function rleEncodeIdx(idx, n) {
  const vals = [], cnts = []; let p = 0;
  while (p < n) { const val = idx[p]; let q = p + 1; while (q < n && idx[q] === val) q += 1; vals.push(val); cnts.push(q - p); p = q; }
  return { v: Uint8Array.from(vals), c: Uint32Array.from(cnts), bytes: vals.length * 5 };
}
function rleDecodeIdx(enc, n) {
  const idx = new Uint8Array(n); let p = 0;
  for (let r = 0; r < enc.v.length; r += 1) { const c = enc.c[r]; idx.fill(enc.v[r], p, p + c); p += c; }
  return idx;
}
// per-row run-length mask (a tracked region is localized -> tiny, even at native res)
function rleEncodeMask(bytes, w, h) {
  let y0 = h, y1 = -1, pop = 0; const rows = new Array(h);
  for (let y = 0; y < h; y += 1) {
    const base = y * w; let runs = null, x = 0;
    while (x < w) {
      if (bytes[base + x]) { const s = x; x += 1; while (x < w && bytes[base + x]) x += 1; (runs || (runs = [])).push(s, x); pop += x - s; }
      else x += 1;
    }
    rows[y] = runs ? Int32Array.from(runs) : null;
    if (runs) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { w, h, y0, y1, rows, pop };
}
function rleMaskPop(rle) { return rle ? rle.pop : 0; }
function rleMaskForEach(rle, cb) {
  if (!rle || rle.y1 < rle.y0) return;
  for (let y = rle.y0; y <= rle.y1; y += 1) { const runs = rle.rows[y]; if (!runs) continue; for (let i = 0; i < runs.length; i += 2) for (let x = runs[i]; x < runs[i + 1]; x += 1) cb(x, y); }
}
function isCBytes(data, n, color) {
  const a = new Uint8Array(n);
  for (let i = 0, p = 0; p < n; i += 4, p += 1) if (data[i] === color[0] && data[i + 1] === color[1] && data[i + 2] === color[2]) a[p] = 1;
  return a;
}
// Decode the scene ONCE at the OUTPUT (preview/apply/export) resolution, with the SAME
// smoothing the players/export use, so the mask domain IS the apply domain. Two passes:
// a 1x playback (fast), then a seek-fill for any frames the decoder coalesced (gap-free,
// deterministic). Stores RLE-compressed reduced index maps (reused across picks).
async function captureSceneFrames(mp, scene, fps, w, h, reps, threshold, onProgress, abortCheck) {
  const off = document.createElement("canvas"); off.width = w; off.height = h;
  const octx = off.getContext("2d", { willReadFrequently: true });
  octx.imageSmoothingEnabled = true; // MATCH mpDraw / export drawImage (browser default = smoothed)
  const fStart = Math.floor(scene.start * fps), fEnd = Math.floor((scene.end - 1e-3) * fps);
  const total = fEnd - fStart + 1, n = w * h;
  // The palette-index map uses 255 as the "new color" sentinel; bail if a palette is that large
  // (never happens with the K slider today, but avoids a silent index/sentinel collision).
  if (reps.length >= 255) return { fps, w, h, fStart, fEnd, reps, frames: new Map(), aborted: "tooManyColors" };
  const repIndex = new Map();
  for (let i = 0; i < reps.length; i += 1) repIndex.set(packedRGB(reps[i]), i);
  const NEW = 255;
  const frames = new Map();
  const times = new Float64Array(Math.max(1, total)); // capture PTS per frame (index fi-fStart); used for VFR-correct apply mapping
  for (let i = 0; i < total; i += 1) times[i] = (fStart + i) / fps; // default = grid PTS (constant-fps correct)
  const BUDGET = 640 * 1024 * 1024; // hard cap on transient cache bytes -> never OOM the tab
  let bytes = 0, aborted = false, phase = "play"; // "play" = fast playback grab, "seek" = slow gap fill
  const ac = () => { if (!aborted && abortCheck && abortCheck()) aborted = "navigated"; return !!aborted; }; // navigated away / re-analyzed mid-capture -> stop the decode
  const grabInto = (fi, t) => {
    if (aborted || fi < fStart || fi > fEnd || frames.has(fi)) return;
    try { octx.drawImage(mp.video, 0, 0, w, h); } catch (e) { return; }
    const img = octx.getImageData(0, 0, w, h);
    reduceFrame(img.data, reps, threshold, mp.cache, w, h, { flat: true });
    const idx = new Uint8Array(n);
    for (let i = 0, p = 0; p < n; i += 4, p += 1) { const r = repIndex.get((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]); idx[p] = r === undefined ? NEW : r; }
    const enc = rleEncodeIdx(idx, n);
    frames.set(fi, enc); bytes += enc.bytes || 0;
    if (Number.isFinite(t)) times[fi - fStart] = t; // real presented PTS (rVFC) so the apply mapping is exact on VFR sources
    if (bytes > BUDGET) aborted = "tooBig"; // stop before exhausting memory (long/native/noisy scenes)
    onProgress(frames.size, total, phase);
  };
  // One playback pass: play the scene once and grab every PRESENTED frame (same <video>, same
  // drawImage, same floor index — identical bytes to the seek path, so the mask domain is unchanged).
  const playPass = () => new Promise((resolve) => {
    let finished = false;
    const finish = () => { if (finished) return; finished = true; try { mp.video.pause(); } catch (e) { /* ignore */ } window.clearTimeout(safety); resolve(); };
    const onFrame = (now, meta) => {
      if (finished || ac()) { finish(); return; }
      const t = meta ? meta.mediaTime : mp.video.currentTime;
      if (t >= scene.end - 1e-4) { finish(); return; }
      grabInto(regionFrameIndex(fps, t, fStart, fEnd), t);
      mp.video.requestVideoFrameCallback(onFrame);
    };
    const dur = Math.max(0.2, scene.end - scene.start);
    const safety = window.setTimeout(finish, (dur / REGION_CAPTURE_RATE) * 1000 + 8000);
    try { mp.video.muted = true; mp.video.playbackRate = REGION_CAPTURE_RATE; } catch (e) { /* ignore */ }
    mp.video.requestVideoFrameCallback(onFrame);
    mp.video.play().catch(finish);
  });
  // (1) Multi-pass playback — playback is far cheaper per frame than seeking. Replay the scene a few
  // times to pick up frames the decoder skipped, but stop early once a pass stops helping OR only a
  // few frames remain (a short seek-fill is then cheaper than another full playback pass). This
  // never does WORSE than the old single-pass + full seek-fill: a low-gap scene exits after pass 1.
  const MAXPASS = 4, SEEK_MS = 120, sceneMs = Math.max(200, (scene.end - scene.start) * 1000);
  if (typeof mp.video.requestVideoFrameCallback === "function") {
    for (let pass = 0; pass < MAXPASS && !ac(); pass += 1) {
      const before = frames.size;
      await seekVideo(mp.video, scene.start + 1e-3).catch(() => {});
      await playPass();
      const remaining = total - frames.size, added = frames.size - before;
      // Stop replaying once seek-filling the rest is CHEAPER than another playback pass (cost-based,
      // so multi-pass is never slower than the old single-pass+seek-fill), or a pass stops helping.
      if (remaining <= 0 || remaining * SEEK_MS <= sceneMs || added < Math.max(2, total * 0.04)) break;
    }
  }
  // (2) Seek-fill the stragglers (slow: one decode-seek per frame) — gap-free regardless of decoder coalescing.
  phase = "seek";
  onProgress(frames.size, total, phase);
  for (let fi = fStart; fi <= fEnd && !ac(); fi += 1) {
    if (frames.has(fi)) continue;
    await seekVideo(mp.video, Math.min(scene.end - 1e-3, (fi + 0.25) / fps)).catch(() => {});
    grabInto(fi, fi / fps); // gap fill: grid PTS (keeps constant-fps mapping identical to floor)
  }
  try { mp.video.playbackRate = mp.rate || 1; } catch (e) { /* ignore */ }
  return { fps, w, h, fStart, fEnd, reps, frames, times, bytes, aborted };
}
function reducedFromIndex(idx, reps, n) {
  const data = new Uint8ClampedArray(n * 4);
  for (let p = 0, i = 0; p < n; p += 1, i += 4) {
    const k = idx[p];
    if (k === 255) { data[i] = 255; data[i + 1] = 0; data[i + 2] = 255; }
    else { const c = reps[k]; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; }
    data[i + 3] = 255;
  }
  return data;
}
function repsSig(reps) { let h = reps.length; for (const c of reps) h = (Math.imul(h, 31) + packedRGB(c)) >>> 0; return h; }
// STEP4 captures region frames with FLAT ICM when 高品質 is ON, so the frame cache must invalidate when
// the ICM reduction (or its flat-relevant params) changes — flat mode ignores detail/recompose.
function icmFlatSig() { const i = state.icm; return i.enabled ? `icm:${i.beta},${i.edgeSigma},${i.icmIters},${i.labelSmooth}` : "near"; }
// Region frame caches are retained per scene to make re-picks instant, but a many-scene project
// could otherwise accumulate unbounded memory. Keep total retained bytes under a global cap,
// evicting the least-recently-used scene. Self-heals if _regionFrameCache was nulled elsewhere.
const REGION_CACHE_CAP = 1024 * 1024 * 1024; // ~1GB across all retained scenes
function regionCacheStore(v, key, entry) {
  v._regionFrameCache = v._regionFrameCache || {};
  v._regionFrameCache[key] = entry;
  let order = (v._regionCacheOrder || []).filter((k) => k !== key && v._regionFrameCache[k]);
  order.push(key); // most-recently-used last
  let total = order.reduce((s, k) => s + ((v._regionFrameCache[k] && v._regionFrameCache[k].bytes) || 0), 0);
  while (total > REGION_CACHE_CAP && order.length > 1) { // never evict the entry we just stored
    const old = order.shift();
    total -= (v._regionFrameCache[old] && v._regionFrameCache[old].bytes) || 0;
    delete v._regionFrameCache[old];
  }
  v._regionCacheOrder = order;
}
function regionCacheTouch(v, key) {
  if (!v._regionCacheOrder) return;
  const i = v._regionCacheOrder.indexOf(key);
  if (i >= 0) { v._regionCacheOrder.splice(i, 1); v._regionCacheOrder.push(key); }
}
// Circular progress overlay shown ON the frozen frame while a scene's frames load (region pick).
function mergeProgressEl(side) { return side === "L" ? dom.mergeProgressL : dom.mergeProgressR; }
function showMergeProgress(side) { const el = mergeProgressEl(side); if (!el) return; el.classList.remove("seeking", "computing"); el.style.setProperty("--p", 0); const t = el.querySelector(".merge-progress-pct"); if (t) t.textContent = "0%"; const l = el.querySelector(".merge-progress-label"); if (l) l.textContent = "🎞️ 映像を読み込み中…"; el.hidden = false; }
function updateMergeProgress(side, got, tot, phase) {
  const el = mergeProgressEl(side); if (!el) return;
  const p = tot > 0 ? Math.max(0, Math.min(100, Math.round((got / tot) * 100))) : 0;
  el.style.setProperty("--p", p);
  const t = el.querySelector(".merge-progress-pct"); if (t) t.textContent = p + "%";
  const seeking = phase === "seek", computing = phase === "compute";
  el.classList.toggle("seeking", seeking);   // slow gap-fill phase — warm ring
  el.classList.toggle("computing", computing); // region-compute phase — teal ring
  const l = el.querySelector(".merge-progress-label");
  if (l) l.textContent = computing ? "🧩 領域を計算中…" : seeking ? `🧩 細部を補完中… 残り${Math.max(0, tot - got)}` : "🎞️ 映像を読み込み中…";
}
function hideMergeProgress(side) { const el = mergeProgressEl(side); if (el) el.hidden = true; }
async function getSceneFrameCache(mp, scene, fps, w, h, reps, threshold, abortCheck, onProg) {
  const v = activeVideo();
  // Key by scene IDENTITY (time range), not just paletteId — distinct scenes can share a
  // palette (e.g. two "first" scenes) and must NOT reuse each other's frame range/cache.
  const key = `${scene.paletteId}@${scene.start.toFixed(3)}-${scene.end.toFixed(3)}`;
  const sig = `${key}|${threshold}|${repsSig(reps)}|${w}x${h}|${Math.round(fps)}|${icmFlatSig()}`;
  v._regionFrameCache = v._regionFrameCache || {};
  const hit = v._regionFrameCache[key];
  if (hit && hit.sig === sig) { regionCacheTouch(v, key); return hit; } // reuse: no decode (also a memoized "too big" marker -> instant hint, no re-decode)
  const cache = await captureSceneFrames(mp, scene, fps, w, h, reps, threshold,
    (got, tot, phase) => { setMergeHint(`${phase === "seek" ? "🧩 細部を補完中…" : "🎞️ 映像を読み込み中…"} ${got}/${tot}（このシーンは初回だけ）`); if (onProg) onProg(got, tot, phase); }, abortCheck);
  cache.sig = sig;
  if (!cache.aborted) regionCacheStore(v, key, cache);                          // complete cache: retain (LRU-bounded)
  else if (cache.aborted !== "navigated") regionCacheStore(v, key, { sig, aborted: cache.aborted, bytes: 0, frames: new Map(), fps, w, h, fStart: cache.fStart, fEnd: cache.fEnd, reps }); // memoize "too big / too many colors" so a repeat click is instant (no re-decode thrash)
  return cache;
}
// nearest pixel that is the seed color, spiraling out from (sx,sy) — robustness for edge clicks.
function nearestIsC(isCbytes, w, h, sx, sy, R) {
  if (isCbytes[sy * w + sx]) return sy * w + sx;
  for (let r = 1; r <= R; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // ring only
      const nx = sx + dx, ny = sy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (isCbytes[ny * w + nx]) return ny * w + nx;
    }
  }
  return sy * w + sx;
}
// Build a region selection ENTIRELY in the output (preview/apply) reduction domain: the
// mask is computed, seeded, and (later) applied at the SAME resolution and the SAME smoothed
// reduction the user sees — so the mask is authoritative and faithful (no cross-domain holes).
// Per-frame masks are stored RLE; the flood/propagation is chunked to keep the UI responsive.
async function buildRegionSelection(side, px, py) {
  const v = activeVideo(); const mp = mergePlayers[side];
  if (!v || !mp || !mp.scene || !mp.pickCtx) return null;
  const scene = mp.scene, reps = mp.reps, threshold = mp.threshold;
  const w = mp.pickCanvas.width, h = mp.pickCanvas.height, n = w * h; // 1:1 with display/apply/export
  const sx = Math.max(0, Math.min(w - 1, px | 0)), sy = Math.max(0, Math.min(h - 1, py | 0));
  const restoreT = mp.video.currentTime;
  setRegionBusy(v, side, true); // set BEFORE any await so a 2nd click on THIS side can't launch a concurrent build (the other side is independent)
  v._regionBuildGen = v._regionBuildGen || { L: 0, R: 0 };
  const myGen = (v._regionBuildGen[side] = (v._regionBuildGen[side] || 0) + 1); // this side's build identity; abortRegionBuild(v, side) bumps it
  const aborted = () => v._regionBuildGen[side] !== myGen;            // this side cancelled / navigated away / re-analyzed
  // Snapshot confirmed merges so a mid-build 統合/解除 (which mutates v.merges) cannot retro-change the
  // reduction the seed/walk is built against. Region paint is by mask position, so freezing here is safe.
  const vForReduce = { merges: (v.merges || []).slice() };
  showMergeProgress(side); // circular progress over the frozen frame (covers fps measure + capture; instant cache hit just flashes off)
  const fps = await mpEnsureFps(side);
  const cache = await getSceneFrameCache(mp, scene, fps, w, h, reps, threshold, aborted, (got, tot, phase) => updateMergeProgress(side, got, tot, phase));
  await seekVideo(mp.video, restoreT).catch(() => {}); // overlay stays up for the compute phase below; pickRegion's finally hides it
  if (aborted()) return null; // build was cancelled while capturing; _regionBusy already cleared by abortRegionBuild
  if (cache.aborted) {
    setRegionBusy(v, side, false);
    flashMergeHint(cache.aborted === "tooManyColors"
      ? "🧩 代表色が多すぎて領域選択は使えません"
      : "🧩 この動画は長い/高精細すぎて領域選択ができません（STEP2でプレビュー解像度を下げてください）");
    return null;
  }
  const { fStart, fEnd } = cache;
  setMergeHint("🧩 領域を計算中…");
  // isC bytes for a frame = decode cached index map -> RGB -> apply CONFIRMED merges -> == seedColor.
  // This is byte-identical to what the player draws, so the mask matches the screen exactly.
  // Memoize per-frame isC (keyed by fi — this build only ever asks for seedColor) so the close pass
  // reuses what the walk already decoded instead of re-decoding (rleDecode + reducedFromIndex 4n +
  // applyFrameMerges) again. Byte-identical (pure fn of fi); freed when the build returns; capped.
  const isCMemo = new Map(); let isCMemoBytes = 0; const ISC_MEMO_CAP = 96 * 1024 * 1024;
  const isCAt = (fi, color) => {
    const hit = isCMemo.get(fi); if (hit) return hit;
    const enc = cache.frames.get(fi); if (!enc) return null;
    const data = reducedFromIndex(rleDecodeIdx(enc, n), cache.reps, n);
    applyFrameMerges(data, w, h, vForReduce, fi / fps);
    const a = isCBytes(data, n, color);
    if (isCMemoBytes + n <= ISC_MEMO_CAP) { isCMemo.set(fi, a); isCMemoBytes += n; }
    return a;
  };
  const f0 = regionFrameIndex(fps, restoreT, fStart, fEnd);
  const seedEnc = cache.frames.get(f0);
  if (!seedEnc) { setRegionBusy(v, side, false); flashMergeHint("🧩 この場所では領域が見つかりませんでした"); return null; }
  const seedData = reducedFromIndex(rleDecodeIdx(seedEnc, n), cache.reps, n);
  applyFrameMerges(seedData, w, h, vForReduce, f0 / fps);
  const sq = (sy * w + sx) * 4;
  if (seedData[sq] === 255 && seedData[sq + 1] === 0 && seedData[sq + 2] === 255) { setRegionBusy(v, side, false); flashMergeHint("ここは『新しい色』のため領域を作れません"); return null; }
  const seedColor = [seedData[sq], seedData[sq + 1], seedData[sq + 2]];
  const seedIsC = isCBytes(seedData, n, seedColor);
  const seedMask = floodRegionBytes(seedIsC, w, h, [nearestIsC(seedIsC, w, h, sx, sy, 4)]);
  const masks = new Map();
  masks.set(f0, rleEncodeMask(seedMask, w, h));
  const DIL = Math.max(2, Math.round(Math.min(w, h) / 200)); // motion tolerance for the seed gate
  const dilA = new Uint8Array(n), dilB = new Uint8Array(n); // reused dilation scratch (no per-frame alloc)
  // Progress for the COMPUTE phase (forward+backward walk + temporal close) so this slower step also
  // shows a wait indicator over the frozen frame instead of an unchanging "領域を計算中…".
  const computeTotal = Math.max(1, 2 * (fEnd - fStart)); let computeDone = 0;
  updateMergeProgress(side, 0, computeTotal, "compute");
  const walk = async (step) => {
    let prev = seedMask, miss = 0, k = 0;
    for (let fi = f0 + step; fi >= fStart && fi <= fEnd; fi += step) {
      if (aborted()) return;
      computeDone += 1;
      const ic = isCAt(fi, seedColor);
      let cur = null;
      if (ic) {
        // Gate the seed to a DILATED copy of the prev mask so a region that moved (or briefly
        // vanished) re-links. dilate only expands set pixels, so the gate is inherently local to
        // prev's neighbourhood — a DISTANT same-color blob contributes no seed.
        const gate = dilateBytes(prev, w, h, Math.min(DIL * (miss + 1), DIL * 4), dilA, dilB);
        const seeds = [];
        for (let p = 0; p < n; p += 1) if (ic[p] && gate[p]) seeds.push(p);
        // Take ONLY the single connected component with the most overlap with the gate — never the
        // union of every gated component. This stops a nearby unrelated same-color blob (clipping the
        // gate by a few px) from being flooded in and, via prev=cur, sticking for the rest of the scene.
        if (seeds.length) cur = bestOverlapComponent(ic, w, h, seeds, gate);
      }
      if (!cur) { masks.set(fi, null); miss += 1; } // region absent this frame; keep scanning at max dilation so a long occlusion can still re-acquire (no permanent give-up)
      else { miss = 0; masks.set(fi, rleEncodeMask(cur, w, h)); prev = cur; }
      if ((++k & 7) === 0) { await new Promise((r) => setTimeout(r, 0)); updateMergeProgress(side, computeDone, computeTotal, "compute"); } // yield so the UI never freezes + advance the wait indicator
    }
  };
  await walk(1); if (aborted()) return null; await walk(-1); if (aborted()) return null;
  // Temporal close: fill any pixel present in BOTH neighbouring frames (smooths 1-frame
  // quantization flicker holes and bridges a single dropped/absent frame -> no blink).
  const decodeMaskBytes = (rle) => { const a = new Uint8Array(n); if (rle) rleMaskForEach(rle, (x, y) => { a[y * w + x] = 1; }); return a; };
  for (let fi = fStart + 1, kk = 0; fi <= fEnd - 1; fi += 1) {
    if (aborted()) return null;
    computeDone += 1;
    const pm = masks.get(fi - 1), nm = masks.get(fi + 1);
    if (!pm || !nm) continue;
    const bp = decodeMaskBytes(pm), bn = decodeMaskBytes(nm), bc = decodeMaskBytes(masks.get(fi));
    let hasCandidate = false;
    for (let p = 0; p < n; p += 1) if (!bc[p] && bp[p] && bn[p]) { hasCandidate = true; break; }
    if (!hasCandidate) continue; // no hole present in both neighbours -> skip the expensive full-frame isCAt decode
    const icf = isCAt(fi, seedColor); if (!icf) continue; // only ever fill pixels that ARE the seed color at THIS frame
    let changed = false;
    for (let p = 0; p < n; p += 1) if (!bc[p] && bp[p] && bn[p] && icf[p]) { bc[p] = 1; changed = true; } // mask stays ⊆ isC: never repaint a foreign object briefly occupying this spot
    if (changed) masks.set(fi, rleEncodeMask(bc, w, h));
    if ((++kk & 7) === 0) { await new Promise((r) => setTimeout(r, 0)); updateMergeProgress(side, computeDone, computeTotal, "compute"); }
  }
  if (aborted()) return null; // cancelled during the close pass
  setRegionBusy(v, side, false);
  if (rleMaskPop(masks.get(f0)) < 8) { flashMergeHint("🧩 この場所では領域が見つかりませんでした（別の場所をクリック）"); return null; }
  let frameCount = 0; for (const m of masks.values()) if (m && m.pop > 0) frameCount += 1;
  return { scene: { start: scene.start, end: scene.end }, fps, w, h, fStart, fEnd, masks, times: cache.times, color: seedColor, paletteId: scene.paletteId, frameCount };
}
function paletteReps(v, id) {
  const st = v.palettes && v.palettes[id];
  return (st && st.analysis.representatives) || v.analysis.representatives;
}
function afterMergeReps(v) {
  const ids = Object.keys(v.palettes || { only: 1 });
  const seen = new Set(), all = [];
  for (const id of ids) { const reps = paletteReps(v, id); for (const c of reps) { const k = packedRGB(c); if (!seen.has(k)) { seen.add(k); all.push(c); } } }
  const groups = mergeGroupsFor(v, true); // confirmed + previewed, resolved in order
  const oseen = new Set(), out = [];
  for (const c of all) { const cc = resolveMergedColor(c, groups); const k = packedRGB(cc); if (!oseen.has(k)) { oseen.add(k); out.push(cc); } }
  return out;
}
const cmpRot = { yaw: 0.6, pitch: -0.45 };
let _cmpBound = false;
function cmpProject(x, y, z, W, H) {
  const cyw = Math.cos(cmpRot.yaw), syw = Math.sin(cmpRot.yaw), cxp = Math.cos(cmpRot.pitch), sxp = Math.sin(cmpRot.pitch);
  let X = x * cyw - z * syw, Z = x * syw + z * cyw;
  let Y = y * cxp - Z * sxp; Z = y * sxp + Z * cxp;
  const dist = 3.6, f = dist / (dist - Z), scale = Math.min(W, H) * 0.4 * f;
  return { x: W / 2 + X * scale, y: H * 0.52 - Y * scale, depth: Z, f };
}
function drawCmpPlot(cv, reps, opts) {
  if (!cv) return;
  opts = opts || {};
  const rect = cv.getBoundingClientRect();
  const W = Math.max(2, Math.round((rect.width || 220) * 2)), H = Math.max(2, Math.round((rect.height || 190) * 2));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);
  const O = cmpProject(-1, -1, -1, W, H);
  [[1, -1, -1, "#ff5b50", "R"], [-1, 1, -1, "#5fd36a", "G"], [-1, -1, 1, "#5a9bff", "B"]].forEach((a) => {
    const Q = cmpProject(a[0], a[1], a[2], W, H);
    ctx.strokeStyle = a[3]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
    ctx.fillStyle = a[3]; ctx.font = "bold 15px sans-serif"; ctx.fillText(a[4], Q.x + 3, Q.y + 3);
  });
  const P = (c) => cmpProject(c[0] / 127.5 - 1, c[1] / 127.5 - 1, c[2] / 127.5 - 1, W, H);
  (opts.links || []).forEach(([from, to]) => {
    const A = P(from), B = P(to);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
  });
  const memberSet = new Set((opts.members || []).map(packedRGB));
  const targetKey = opts.target ? packedRGB(opts.target) : null;
  const arr = reps.map((c) => ({ c, P: P(c) })).sort((a, b) => a.P.depth - b.P.depth);
  arr.forEach(({ c, P: Q }) => {
    const key = packedRGB(c), isT = targetKey != null && key === targetKey, isM = memberSet.has(key);
    const rad = Math.max(2.5, (isT ? 10 : isM ? 8 : 5.5) * (W / 440) * Q.f);
    ctx.beginPath(); ctx.arc(Q.x, Q.y, rad, 0, 7);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.globalAlpha = 1; ctx.fill();
    ctx.lineWidth = isT ? 3 : isM ? 2.5 : 1.2;
    ctx.strokeStyle = isT ? "#ffd23f" : isM ? "#ffffff" : "rgba(255,255,255,.4)";
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}
function drawMergeCompare(v) {
  if (!v || !v.palettes) return;
  const sel = v.mergeSel || [];
  const members = v._mergePending ? v._mergePending.members.map((m) => m.color) : sel.map((s) => s.color);
  const target = v._mergePending ? v._mergePending.target : null;
  const links = (v._mergePending && target) ? v._mergePending.members.map((m) => [m.color, target]) : [];
  const has = !!v.sceneMode && v.scenes && v.scenes.length > 1;
  const titleOf = (cv, txt) => { const t = cv.closest(".cmp-col") && cv.closest(".cmp-col").querySelector(".cmp-title"); if (t) t.textContent = txt; };
  if (has) {
    const li = v.mergeSceneL || 0, ri = v.mergeSceneR || 0;
    const lid = (v.scenes[li] || v.scenes[0]).paletteId, rid = (v.scenes[ri] || v.scenes[v.scenes.length - 1]).paletteId;
    drawCmpPlot(dom.cmpPlot1, paletteReps(v, lid), { members, target });
    drawCmpPlot(dom.cmpPlot2, afterMergeReps(v), { target, links });
    dom.cmpCol3.hidden = false; drawCmpPlot(dom.cmpPlot3, paletteReps(v, rid), { members, target });
    titleOf(dom.cmpPlot1, `シーン${li + 1}`); titleOf(dom.cmpPlot3, `シーン${ri + 1}`);
  } else {
    drawCmpPlot(dom.cmpPlot1, paletteReps(v, v.curPaletteId || "only"), { members, target });
    drawCmpPlot(dom.cmpPlot2, afterMergeReps(v), { target, links });
    dom.cmpCol3.hidden = true;
    titleOf(dom.cmpPlot1, "パレット");
  }
}
function attachCmpDrag() {
  if (_cmpBound) return; _cmpBound = true;
  let drag = false, last = null, raf = 0;
  const scheduleRedraw = () => { // coalesce drag redraws to one per animation frame (was one per mousemove)
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const v = activeVideo(); if (v) drawMergeCompare(v); });
  };
  const down = (e) => { drag = true; last = { x: e.clientX, y: e.clientY }; e.preventDefault(); };
  const move = (e) => {
    if (!drag) return;
    cmpRot.yaw -= (e.clientX - last.x) * 0.01;
    cmpRot.pitch = Math.max(-1.4, Math.min(1.4, cmpRot.pitch + (e.clientY - last.y) * 0.01));
    last = { x: e.clientX, y: e.clientY };
    scheduleRedraw();
  };
  [dom.cmpPlot1, dom.cmpPlot2, dom.cmpPlot3].forEach((c) => { if (c) c.addEventListener("mousedown", down); });
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", () => { drag = false; });
}
function redrawMergeAll(v) {
  ["L", "R"].forEach((s) => { const mp = mergePlayers[s]; if (mp && !mp.playing) mpDraw(s); });
  if (v && v._mergePanelOpen) drawMergeCompare(v);
}
function renderMergeTargets(v) {
  const sel = v.mergeSel || [];
  const target = v._mergePending && v._mergePending.target;
  dom.mergeTargets.innerHTML = sel.map((s, i) => {
    const on = target && sameColor(s.color, target);
    return `<button class="merge-target ${on ? "on" : ""}" data-mt="${i}" type="button"><span class="merge-chip-sw" style="background:${rgbToHex(s.color)}"></span>${rgbToHex(s.color)}${on ? " ✓ まとめ先" : ""}</button>`;
  }).join("");
}
function memberFromSel(s) {
  return isRegionMember(s) ? { kind: "region", color: s.color.slice(), region: s.region } : { kind: "color", color: s.color.slice() };
}
function setPendingTarget(v, color) {
  v._mergePending = { target: color.slice(), members: (v.mergeSel || []).filter((s) => !sameColor(s.color, color)).map(memberFromSel) };
  renderMergeTargets(v);
  redrawMergeAll(v);
}
function openMergePanel() {
  const v = activeVideo(); if (!v || !mergeHasDistinctColors(v)) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; }
  v._mergePanelOpen = true;
  dom.mergePanel.hidden = false;
  attachCmpDrag();
  // Default target = the FIRST whole-color selection (unchanged for color→color merges). Only when
  // the first pick is a spatial region do we skip past it, so a region picked first stays a MEMBER
  // instead of becoming the target (which would silently drop the region the user wanted to recolor).
  const sel = v.mergeSel || [];
  let def = null;
  for (let i = 0; i < sel.length; i += 1) { if (!isRegionMember(sel[i])) { def = sel[i].color; break; } }
  setPendingTarget(v, def || sel[0].color);
  dom.mergePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function closeMergePanel(v) {
  if (v) { v._mergePanelOpen = false; v._mergePending = null; }
  dom.mergePanel.hidden = true;
}
function cancelMergePanel() {
  const v = activeVideo();
  closeMergePanel(v);
  if (v) redrawMergeAll(v);
}
function onTargetClick(e) {
  const btn = e.target.closest("[data-mt]"); if (!btn) return;
  const v = activeVideo(); if (!v) return;
  const s = (v.mergeSel || [])[Number(btn.dataset.mt)]; if (!s) return;
  setPendingTarget(v, s.color);
}
function confirmMerge() {
  const v = activeVideo(); if (!v || !v._mergePending || !v._mergePending.members.length) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; } // mutating v.merges mid-build would desync the mask
  const p = v._mergePending;
  v.merges = v.merges || [];
  v.merges.push({ id: (v._mergeSeq = (v._mergeSeq || 0) + 1), target: p.target.slice(), members: p.members.map((m) => (m.kind === "region" ? { kind: "region", color: m.color.slice(), region: m.region } : { kind: "color", color: m.color.slice() })) });
  v.mergeSel = [];
  closeMergePanel(v);
  syncMergeModeUI(v);     // clears chips, hides action row
  renderMergeGroups(v);   // shows the new merged group
  redrawMergeAll(v);      // players now show the merged result
}
function onMergeGroupDel(e) {
  const btn = e.target.closest("[data-merge-del]"); if (!btn) return;
  const v = activeVideo(); if (!v || !v.merges) return;
  if (anyRegionBusy(v)) { flashMergeHint("いま領域を計算中です…"); return; } // also: the confirm() dialog would block the build's yields
  if (!window.confirm("この統合を解除しますか？")) return;
  v.merges.splice(Number(btn.dataset.mergeDel), 1);
  renderMergeGroups(v);
  redrawMergeAll(v);
}

/* ============================ step5 export (batch) ============================ */

function renderStep5() {
  const dones = doneVideos();
  const sel = dones.filter((v) => v.save);
  dom.selCountText.textContent = `${sel.length} / ${dones.length} 件 選択中`;
  syncExportMode();
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
  if (state.exporting) {
    dom.exportingText.textContent = state.exportMode === "fast"
      ? "高速モードで書き出し中です… 旧録画方式のため、重い場面では停止・飛び・伸びが出る可能性があります。"
      : "完全書き出しモードで書き出し中です… 各フレームを確認しながら処理するため時間がかかります。";
  }
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
  if (v) { v.save = !v.save; state.exported = false; renderStep5(); }
}

function setAllSave(on) {
  if (state.exporting) return;
  doneVideos().forEach((v) => { v.save = on; });
  state.exported = false;
  renderStep5();
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

function onExportModeClick(e) {
  const btn = e.target.closest("[data-export-mode]");
  if (!btn || state.exporting) return;
  state.exportMode = btn.dataset.exportMode === "fast" ? "fast" : "safe";
  state.exported = false;
  syncExportMode();
  renderStep5();
}

function syncExportMode() {
  const f = formatById(state.exportFormat);
  dom.exportModeSeg.querySelectorAll("[data-export-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.exportMode === state.exportMode);
  });
  if (state.exportMode === "fast" && f.via !== "webcodecs") {
    dom.exportModeDesc.textContent = "この保存形式は高速書き出しに対応していないため、FFmpegでの書き出しになります。高速にしたい場合は「WebM（標準・速い）」を選んでください。";
  } else {
    dom.exportModeDesc.textContent = EXPORT_MODE_DESCS[state.exportMode] || EXPORT_MODE_DESCS.safe;
  }
}

async function exportSelected() {
  const sel = doneVideos().filter((v) => v.save);
  if (!sel.length) { showToast("info", "保存する動画を選んでください"); return; }
  const fmt = formatById(state.exportFormat);

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
  const usedNames = new Set();
  sel.forEach((v) => {
    v.exportProgress = 0; v.exportDone = false; v.savedToDir = false; v.exportBlob = null; v.exportTruncatedSec = 0;
    if (v.exportUrl) { URL.revokeObjectURL(v.exportUrl); v.exportUrl = null; }
    // Assign a batch-unique output name so two sources sharing a base name can't overwrite/collide.
    let nm = makeOutputName(v.name, fmt.ext);
    if (usedNames.has(nm)) { const dot = nm.lastIndexOf("."); const b = nm.slice(0, dot), e = nm.slice(dot); let i = 2; while (usedNames.has(`${b}-${i}${e}`)) i += 1; nm = `${b}-${i}${e}`; }
    usedNames.add(nm); v.exportName = nm;
  });
  render();

  for (const v of sel) {
    if (state.cancelled) break;
    if (v.sceneMode) savePaletteState(v); // flush current-scene edits so per-frame lookup is current
    try {
      if (fmt.via === "webcodecs" && supportsWebCodecs()) {
        if (state.exportMode === "fast") await exportViaPlaybackCapture(v, fmt);
        else await exportViaWebCodecs(v, fmt);
      } else {
        await exportViaFFmpeg(v, fmt);
      }
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
  const truncated = sel.filter((v) => v.exportTruncatedSec);
  if (truncated.length) showToast("error", `${truncated.length}件は長すぎるため約${truncated[0].exportTruncatedSec}秒で切り詰めました。全長で書き出すには「WebM 標準・速い」形式（上限なし）をお使いください。`);
  if (!okCount) { showToast("error", "書き出しに失敗しました。別の形式をお試しください。"); return; }
  if (dirHandle) showToast("success", `${okCount}件を「${state.exportDirName}」フォルダに保存しました`);
  else showToast("success", `${okCount}件をダウンロードフォルダに保存しました（保存先はブラウザの設定によります）`);
}

// Cancel an in-progress export (including the slow ffmpeg encode of the current video).
function stopExport() {
  if (!state.exporting) return;
  state.cancelled = true;
  dom.stopExportBtn.disabled = true;
  // Tear down an in-progress WebCodecs encoder (the export loop also checks
  // state.cancelled each frame, so it stops on its own within one frame).
  if (state.activeEncoder) {
    try { if (state.activeEncoder.state !== "closed") state.activeEncoder.close(); } catch (e) { /* ignore */ }
    state.activeEncoder = null;
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

// Fast path: play the source ONCE and capture each presented frame via
// requestVideoFrameCallback, encoding it with WebCodecs using the frame's REAL
// media timestamp (meta.mediaTime). No per-frame seeking, so it is roughly
// real-time while avoiding wall-clock freeze: because every encoded frame
// carries its true timestamp, a momentary slow
// recolor at worst thins a frame or two (mild judder), never holds/stretches a
// scene. (Trade-off vs the frame-exact seek path used by "完全書き出し": under
// sustained heavy load a few frames may be skipped, and capture pauses while the
// tab is in the background.)
async function exportViaPlaybackCapture(v, fmt) {
  // Without requestVideoFrameCallback, RAF-driven capture can key palette/region on a time that
  // leads the painted frame by ~1 frame (flip at cuts). Route those browsers to the deterministic
  // seek-based encoder, which keys on the actually-decoded frame.
  if (typeof dom.workVideo.requestVideoFrameCallback !== "function") return exportViaWebCodecs(v, fmt);
  // SCENE MODE: real-time playback capture can present a frame while rVFC's mediaTime still reports
  // the previous one, so at a cut scene-2's first frame gets reduced with scene-1's palette (verified
  // failing at some cut phases). The seek-based encoder is static per frame (mediaTime == painted
  // frame), so it's frame-exact at boundaries. Per-frame palette correctness > playback speed here.
  if (v.sceneMode && v.scenes && v.scenes.length > 1) return exportViaWebCodecs(v, fmt);
  const { Muxer, ArrayBufferTarget } = await import(`./vendor/webm-muxer/webm-muxer.js?v=${APP_VERSION}`);
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
  const reps = v.analysis.representatives;
  const th = v.confirmThreshold;
  await ensureFps(v); // source fps so paletteStateForFrame can snap the palette to the content frame's center

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "V_VP8", width, height, frameRate: EXPORT_FPS },
    firstTimestampBehavior: "offset",
  });
  let encError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch (e) { encError = e; } },
    error: (e) => { encError = e; },
  });
  const bitrate = Math.max(1500000, Math.round(width * height * EXPORT_FPS * 0.12));
  configureVideoEncoder(encoder, { codec: "vp8", width, height, bitrate, framerate: EXPORT_FPS });
  state.activeEncoder = encoder;

  dom.workVideo.muted = true;
  dom.workVideo.playbackRate = 1; // real-time so the element presents every frame (no source-side decimation)
  let frames = 0;
  let lastTsUs = -1;
  const useRVFC = typeof dom.workVideo.requestVideoFrameCallback === "function";

  const captureFrame = (mediaTimeSec) => {
    let tsUs = Math.round((Number.isFinite(mediaTimeSec) ? mediaTimeSec : dom.workVideo.currentTime) * 1e6);
    if (tsUs <= lastTsUs) tsUs = lastTsUs + 1; // timestamps must strictly increase
    lastTsUs = tsUs;
    ctx.drawImage(dom.workVideo, 0, 0, width, height);
    const img = ctx.getImageData(0, 0, width, height);
    const mt = Number.isFinite(mediaTimeSec) ? mediaTimeSec : dom.workVideo.currentTime;
    const pal = paletteStateForFrame(v, mt, v.fps);
    reduceFrame(img.data, pal.reps, pal.th, pal.cache, width, height, {});
    applyFrameMerges(img.data, width, height, v, mt); // confirmed STEP4 merges (color + region)
    ctx.putImageData(img, 0, 0);
    const frame = new VideoFrame(dom.exportCanvas, { timestamp: tsUs });
    encoder.encode(frame, { keyFrame: frames % EXPORT_KEYFRAME_INTERVAL === 0 });
    frame.close();
    frames += 1;
    if (frames % EXPORT_PROGRESS_STEP === 0) {
      v.exportProgress = Math.min(99, (dom.workVideo.currentTime / Math.max(0.001, dur)) * 100);
      updateExport(v);
    }
  };

  try {
    await new Promise((resolve, reject) => {
      let finished = false;
      const finish = (err) => {
        if (finished) return; finished = true;
        dom.workVideo.removeEventListener("ended", onEnded);
        dom.workVideo.removeEventListener("error", onErr);
        err ? reject(err) : resolve();
      };
      const onEnded = () => finish();
      const onErr = () => finish(new Error("playback error during export"));
      dom.workVideo.addEventListener("ended", onEnded, { once: true });
      dom.workVideo.addEventListener("error", onErr, { once: true });
      const onRVFC = (now, meta) => {
        if (state.cancelled || encError) { finish(); return; }
        try { captureFrame(meta ? meta.mediaTime : dom.workVideo.currentTime); } catch (e) { finish(e); return; }
        if (dom.workVideo.ended) { finish(); return; }
        dom.workVideo.requestVideoFrameCallback(onRVFC);
      };
      const onRAF = () => { // fallback for browsers without rVFC
        if (state.cancelled || encError) { finish(); return; }
        try { captureFrame(dom.workVideo.currentTime); } catch (e) { finish(e); return; }
        if (dom.workVideo.ended || dom.workVideo.paused) { finish(); return; }
        requestAnimationFrame(onRAF);
      };
      dom.workVideo.currentTime = 0;
      dom.workVideo.play().then(() => {
        if (useRVFC) dom.workVideo.requestVideoFrameCallback(onRVFC);
        else requestAnimationFrame(onRAF);
      }).catch((e) => finish(e));
    });
    if (!state.cancelled && !encError) await encoder.flush();
  } finally {
    try { if (encoder.state !== "closed") encoder.close(); } catch (e) { /* ignore */ }
    state.activeEncoder = null;
    try { dom.workVideo.pause(); } catch (e) { /* ignore */ }
  }
  if (state.cancelled) return;
  if (encError) throw (encError instanceof Error ? encError : new Error("WebCodecs encode failed"));
  if (!frames) throw new Error("no frames captured during playback");
  muxer.finalize();
  v.exportBlob = new Blob([muxer.target.buffer], { type: fmt.mime || "video/webm" });
  v.exportName = v.exportName || makeOutputName(v.name, fmt.ext); // keep the batch-unique name assigned by the dispatcher
  v.exportSize = v.exportBlob.size;
}

// Fast path: WebCodecs VideoEncoder → WebM (vendored webm-muxer). No ffmpeg load.
//
// HISTORY / WHY THIS LOOKS THE WAY IT DOES: this path used to play() the source
// in real time and let MediaRecorder record canvas.captureStream(24) on a
// WALL-CLOCK timeline. Any stall while a scene was being drawn — a heavy recolor
// on a scene change, a decode/buffer underrun, a GC pause, or requestAnimationFrame
// being throttled when the tab was backgrounded — made the recorder hold the last
// canvas frame, so that scene appeared FROZEN in the exported video (while the
// still-playing source advanced and that content was lost). MediaRecorder always
// timestamps by wall clock, so it can only ever trade "freeze" for "stretched
// duration" — it cannot produce a correct video when rendering is slower than
// real time.
//
// WebCodecs lets us stamp every frame with an EXPLICIT timestamp, so the output
// is correct no matter how long recoloring takes. We seek frame-by-frame
// (deterministic, like the ffmpeg path), recolor, and encode exactly one frame
// per output frame at timestamp i/24s. A slow frame only makes the export take
// longer; it can never freeze, drop, or stretch the result — and seeking works
// even in a backgrounded tab. Browsers without WebCodecs fall back to the
// deterministic ffmpeg path (see exportSelected / the format's `args`).
async function exportViaWebCodecs(v, fmt) {
  const { Muxer, ArrayBufferTarget } = await import(`./vendor/webm-muxer/webm-muxer.js?v=${APP_VERSION}`);
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
  const total = Math.max(1, Math.round(dur * EXPORT_FPS));
  const reps = v.analysis.representatives;
  const th = v.confirmThreshold;
  const usPerFrame = Math.round(1e6 / EXPORT_FPS);
  await ensureFps(v); // source fps so paletteStateForFrame can snap the palette to the content frame's center

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "V_VP8", width, height, frameRate: EXPORT_FPS },
    firstTimestampBehavior: "offset",
  });
  let encError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch (e) { encError = e; } },
    error: (e) => { encError = e; },
  });
  // Palette-reduced video is mostly flat color and compresses very well, so this
  // bitrate is generous in practice. Scales with resolution; floored for clarity.
  const bitrate = Math.max(1500000, Math.round(width * height * EXPORT_FPS * 0.12));
  configureVideoEncoder(encoder, { codec: "vp8", width, height, bitrate, framerate: EXPORT_FPS });
  state.activeEncoder = encoder;

  dom.workVideo.muted = true;
  try {
    for (let i = 0; i < total; i += 1) {
      if (state.cancelled || encError) break;
      // Frame-exact: pick the INTENDED source frame, seek to its CENTRE (never a frame EDGE), and key
      // the palette on that same frame index. An edge seek (i/EXPORT_FPS landing exactly on a frame
      // boundary — which happens at a cut whenever the cut frame falls on the 24fps grid, e.g. a cut
      // frame divisible by 5 for 30→24) decodes the neighbouring frame ambiguously, so scene-2's first
      // frame could be painted while the palette was keyed on scene-1 (or vice-versa). Centre-seeking +
      // keying on the same frame index makes drawn content and palette the SAME frame by construction.
      const sf = Math.max(0, Math.floor((i / EXPORT_FPS) * v.fps + 1e-6));
      const at = Math.min(dur - 1e-3, (sf + 0.5) / v.fps);
      await seekVideo(dom.workVideo, at);
      ctx.drawImage(dom.workVideo, 0, 0, width, height);
      const img = ctx.getImageData(0, 0, width, height);
      const pal = paletteStateForFrame(v, at, v.fps);
      reduceFrame(img.data, pal.reps, pal.th, pal.cache, width, height, {});
      applyFrameMerges(img.data, width, height, v, at); // confirmed STEP4 merges (color + region)
      ctx.putImageData(img, 0, 0);
      const frame = new VideoFrame(dom.exportCanvas, { timestamp: i * usPerFrame, duration: usPerFrame });
      encoder.encode(frame, { keyFrame: i % EXPORT_KEYFRAME_INTERVAL === 0 });
      frame.close();
      // Keep the encoder queue bounded so memory stays flat on long videos.
      if (encoder.encodeQueueSize > EXPORT_ENCODER_FLUSH_QUEUE) await encoder.flush();
      if (i % EXPORT_PROGRESS_STEP === 0 || i === total - 1) {
        v.exportProgress = Math.min(99, ((i + 1) / total) * 100);
        updateExport(v);
      }
    }
    if (!state.cancelled && !encError) await encoder.flush();
  } finally {
    try { if (encoder.state !== "closed") encoder.close(); } catch (e) { /* ignore */ }
    state.activeEncoder = null;
    try { dom.workVideo.pause(); } catch (e) { /* ignore */ }
  }
  if (state.cancelled) return;
  if (encError) throw (encError instanceof Error ? encError : new Error("WebCodecs encode failed"));
  muxer.finalize();
  v.exportBlob = new Blob([muxer.target.buffer], { type: fmt.mime || "video/webm" });
  v.exportName = v.exportName || makeOutputName(v.name, fmt.ext); // keep the batch-unique name assigned by the dispatcher
  v.exportSize = v.exportBlob.size;
}

function configureVideoEncoder(encoder, baseConfig) {
  encoder.configure(baseConfig);
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
  const full = Math.max(1, Math.round(dur * EXPORT_FPS));
  const CAP = 36000; // backstop (25 min @24fps) so a pathological duration can't exhaust ffmpeg.wasm MEMFS
  const total = Math.min(CAP, full);
  v.exportTruncatedSec = full > total ? Math.round(total / EXPORT_FPS) : 0; // surfaced loudly after the batch (never silent)
  const reps = v.analysis.representatives;
  const th = v.confirmThreshold;
  await ensureFps(v); // source fps so paletteStateForFrame can snap the palette to the content frame's center
  const names = [];
  for (let i = 0; i < total; i += 1) {
    if (state.cancelled) break;
    const sf = Math.max(0, Math.floor((i / EXPORT_FPS) * v.fps + 1e-6)); // intended source frame
    const at = Math.min(dur - 1e-3, (sf + 0.5) / v.fps); // seek to frame CENTRE + key palette on the same frame index (see exportViaWebCodecs) so drawn content and palette are the same frame
    await seekVideo(dom.workVideo, at);
    ctx.drawImage(dom.workVideo, 0, 0, width, height);
    const img = ctx.getImageData(0, 0, width, height);
    const pal = paletteStateForFrame(v, at, v.fps);
    reduceFrame(img.data, pal.reps, pal.th, pal.cache, width, height, {});
    applyFrameMerges(img.data, width, height, v, at); // confirmed STEP4 merges (color + region)
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
  v.exportName = v.exportName || makeOutputName(v.name, fmt.ext); // keep the batch-unique name assigned by the dispatcher
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
  state.exportMode = "safe";
  state.previewRate = 1;
  state.preset = "recommend";
  state.advanced = false;
  state.detailsOpen = false;
  state.thresholdMode = "auto";
  state.vals = { ...DEFAULT_VALS };
  state.icm = { ...ICM_DEFAULTS }; // clear the 高品質(ICM) preference on full restart too
  state.plotCache = null;
  applyPreviewRate();
  render();
}

/* ============================ engine (video / frames / ffmpeg) ============================ */

function resetWorkVideo() {
  dom.workVideo.pause();
  dom.workVideo.removeAttribute("src");
  dom.workVideo.load();
  try { dom.workVideo.playbackRate = state.previewRate || 1; } catch (e) { /* ignore */ }
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

async function extractFrame(video, time, shortSide, waitForFrame = true) {
  await ensureMetadata(video);
  const dur = Math.max(0, video.duration - 0.001);
  let target = Math.min(time, dur);
  // Seeking to exactly 0 from 0 fires no "seeked" event (no position change),
  // so a fresh video never decodes a frame. Nudge to a small epsilon near the start.
  if (target <= 0.0005 && dur > 0.03) target = 0.001;
  // waitForFrame=false (used by cut detection) resolves on "seeked" without the extra requestVideoFrame
  // compositor wait — the decoded frame is already drawable, and detection only needs a histogram. ~4x faster/seek.
  await seekVideo(video, target, waitForFrame);
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
  // Force EVEN dimensions: yuv420p encoders (H.264/VP9) reject odd width/height, and keeping a
  // single even size for preview, region mask, and export guarantees the mask applies 1:1.
  const ev = (x) => Math.max(2, 2 * Math.round((x * scale) / 2));
  return { width: ev(width), height: ev(height) };
}

function processPixels(data, representatives, threshold, cache, maskOnly) {
  const thresholdSq = threshold * threshold;
  for (let index = 0; index < data.length; index += 4) {
    const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
    let mapped = cache.get(key);
    if (mapped === undefined) {
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
      mapped = maskOnly
        ? (isNew ? 0xff00ff : 0)
        : (isNew ? 0xff00ff : ((best[0] << 16) | (best[1] << 8) | best[2]));
      cache.set(key, mapped);
    }
    data[index] = (mapped >> 16) & 255;
    data[index + 1] = (mapped >> 8) & 255;
    data[index + 2] = mapped & 255;
    data[index + 3] = 255;
  }
}

// Single recolor entry point. When 高品質(ICM) is OFF (or for the no-magenta mask metric), behaves
// exactly like the nearest-color processPixels. When ON, routes to icm.js's spatial label-field recolor.
// `flat:true` forces a pure rep field (no detail-recompose holes) so STEP4 region flood-fill / color
// merges still work; the magenta/out-of-threshold set is byte-identical to nearest either way.
function reduceFrame(data, reps, threshold, cache, w, h, opts) {
  const o = opts || {};
  if (o.maskOnly || !state.icm.enabled || !w || !h || typeof ICM === "undefined") {
    processPixels(data, reps, threshold, cache, !!o.maskOnly);
    return;
  }
  ICM.reduceFrameICM(data, reps, threshold, w, h, { ...state.icm, flat: !!o.flat }); // ignores `cache`
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

function seekVideo(video, time, waitForFrame = true) {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
    return waitForFrame ? waitForVideoFrame(video) : Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error(`Timed out while seeking video to ${formatNumber(time, 3)}s`)); }, 30000);
    const onSeeked = () => {
      cleanup();
      if (waitForFrame) waitForVideoFrame(video).then(resolve);
      else resolve();
    };
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

function supportsWebCodecs() {
  return typeof window.VideoEncoder === "function" && typeof window.VideoFrame === "function";
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
// Higher-resolution encode for the scene-review frames (shown large in the review panel). Keeps the
// extracted frame's resolution (capped) at higher JPEG quality, instead of the tiny 168px list thumb.
function makeSceneReviewThumb(imageData) {
  const maxW = 1920;
  const tw = Math.min(imageData.width, maxW);
  const th = Math.max(1, Math.round(tw * imageData.height / imageData.width));
  const out = document.createElement("canvas");
  out.width = tw; out.height = th;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  if (tw === imageData.width) {
    ctx.putImageData(imageData, 0, 0);
  } else {
    const src = createWorkCanvas(imageData.width, imageData.height);
    src.getContext("2d").putImageData(imageData, 0, 0);
    ctx.drawImage(src, 0, 0, tw, th);
  }
  return out.toDataURL("image/jpeg", 0.86);
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
