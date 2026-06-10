"use strict";

const APP_VERSION = "20260609-9";

const dom = {
  videoFile: document.getElementById("videoFile"),
  analysisShortSide: document.getElementById("analysisShortSide"),
  previewShortSide: document.getElementById("previewShortSide"),
  maxCandidates: document.getElementById("maxCandidates"),
  minRepDistance: document.getElementById("minRepDistance"),
  minClusters: document.getElementById("minClusters"),
  maxClusters: document.getElementById("maxClusters"),
  thresholdMode: document.getElementById("thresholdMode"),
  fixedThreshold: document.getElementById("fixedThreshold"),
  thresholdMargin: document.getElementById("thresholdMargin"),
  analyzeButton: document.getElementById("analyzeButton"),
  stopButton: document.getElementById("stopButton"),
  previewButton: document.getElementById("previewButton"),
  recordButton: document.getElementById("recordButton"),
  progressBar: document.getElementById("progressBar"),
  statusText: document.getElementById("statusText"),
  downloadLink: document.getElementById("downloadLink"),
  outputPanel: document.getElementById("outputPanel"),
  outputVideo: document.getElementById("outputVideo"),
  sourceCanvas: document.getElementById("sourceCanvas"),
  processedCanvas: document.getElementById("processedCanvas"),
  maskCanvas: document.getElementById("maskCanvas"),
  palette: document.getElementById("palette"),
  metrics: document.getElementById("metrics"),
  candidateTableBody: document.querySelector("#candidateTable tbody"),
  workVideo: document.getElementById("workVideo"),
};

const state = {
  objectUrl: null,
  originalFile: null,
  fileName: "",
  analysis: null,
  previewing: false,
  recording: false,
  processedCache: new Map(),
  maskCache: new Map(),
  fileInfo: "",
  downloadUrl: null,
  analysisTimer: null,
  analysisStartedAt: 0,
  lastWorkerMessageAt: 0,
  lastWorkerMessage: "",
  activeWorker: null,
  currentReject: null,
  activeRecorder: null,
  ffmpeg: null,
  ffmpegLoaded: false,
  transcoding: false,
  usedTranscodedSource: false,
  cancelled: false,
};

dom.videoFile.addEventListener("change", handleFileChange);
dom.analyzeButton.addEventListener("click", analyzeVideo);
dom.stopButton.addEventListener("click", stopAll);
dom.previewButton.addEventListener("click", togglePreview);
dom.recordButton.addEventListener("click", recordProcessedVideo);

function handleFileChange() {
  const file = dom.videoFile.files && dom.videoFile.files[0];
  if (!file) return;

  resetWorkVideo();
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }
  if (state.downloadUrl) {
    URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl = null;
  }
  resetOutputVideo();

  state.objectUrl = URL.createObjectURL(file);
  state.originalFile = file;
  state.fileName = file.name;
  state.fileInfo = `${file.name} (${file.type || "unknown type"}, ${formatBytes(file.size)})`;
  state.analysis = null;
  state.usedTranscodedSource = false;
  state.processedCache.clear();
  state.maskCache.clear();
  dom.downloadLink.hidden = true;
  dom.workVideo.preload = "metadata";
  dom.workVideo.src = state.objectUrl;
  dom.workVideo.load();
  dom.analyzeButton.disabled = false;
  dom.stopButton.disabled = true;
  dom.previewButton.disabled = true;
  dom.recordButton.disabled = true;
  clearCanvas(dom.sourceCanvas);
  clearCanvas(dom.processedCanvas);
  clearCanvas(dom.maskCanvas);
  dom.palette.innerHTML = "";
  dom.metrics.innerHTML = "";
  dom.candidateTableBody.innerHTML = "";
  setStatus(`Loaded: ${state.fileInfo}`);
}

function resetWorkVideo() {
  dom.workVideo.pause();
  dom.workVideo.removeAttribute("src");
  dom.workVideo.load();
}

function resetOutputVideo() {
  dom.outputVideo.pause();
  dom.outputVideo.removeAttribute("src");
  dom.outputVideo.load();
  dom.outputPanel.hidden = true;
}

function clearExportedVideo() {
  if (state.downloadUrl) {
    URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl = null;
  }
  dom.downloadLink.hidden = true;
  resetOutputVideo();
}

async function analyzeVideo() {
  if (!state.objectUrl) return;

  stopPreview();
  dom.analyzeButton.disabled = true;
  dom.previewButton.disabled = true;
  dom.recordButton.disabled = true;
  dom.stopButton.disabled = false;
  clearExportedVideo();
  state.cancelled = false;
  setProgress(0.02);
  setStatus("Reading video metadata");
  startAnalysisTimer("Reading video metadata");

  try {
    await ensureReadableVideo();
    throwIfCancelled();
    const settings = readSettings();
    setProgress(0.03);
    setTimedStatus("Extracting first frame");
    const firstFrame = await extractFrame(dom.workVideo, 0, settings.analysisShortSide);
    throwIfCancelled();
    setProgress(0.05);
    setTimedStatus("Extracting last frame");
    const lastTime = Math.max(0, dom.workVideo.duration - 1 / 30);
    const lastFrame = await extractFrame(dom.workVideo, lastTime, settings.analysisShortSide);
    throwIfCancelled();

    const result = await runAnalysisWorker(firstFrame.imageData, lastFrame.imageData, settings);
    throwIfCancelled();
    state.analysis = {
      ...result,
      settings,
      videoWidth: dom.workVideo.videoWidth,
      videoHeight: dom.workVideo.videoHeight,
      duration: dom.workVideo.duration,
    };
    state.processedCache.clear();
    state.maskCache.clear();

    renderPalette(result.representatives);
    renderMetrics(state.analysis);
    renderCandidateTable(result.rows, result.selectedK);
    setCanvasSizes(settings.previewShortSide);
    drawCurrentFrame();

    dom.previewButton.disabled = false;
    dom.recordButton.disabled = !supportsRecording();
    setProgress(1);
    setStatus(`Selected ${result.selectedK} colors. Threshold ${formatNumber(result.threshold, 2)}.`);
  } catch (error) {
    if (state.cancelled) {
      setStatus("Stopped.");
      setProgress(0);
    } else {
      console.error(error);
      setStatus(error instanceof Error ? error.message : String(error));
    }
  } finally {
    stopAnalysisTimer();
    state.activeWorker = null;
    state.currentReject = null;
    state.cancelled = false;
    dom.stopButton.disabled = true;
    dom.analyzeButton.disabled = false;
  }
}

function throwIfCancelled() {
  if (state.cancelled) {
    throw new Error("Stopped");
  }
}

async function ensureReadableVideo() {
  try {
    await ensureMetadata(dom.workVideo);
  } catch (error) {
    if (!shouldAttemptTranscode(error)) {
      throw error;
    }

    await transcodeUnsupportedVideo(error);
    throwIfCancelled();
    await ensureMetadata(dom.workVideo);
  }
}

function shouldAttemptTranscode(error) {
  if (!state.originalFile || state.usedTranscodedSource || state.transcoding) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Could not load video metadata")
    || message.includes("Timed out while reading video metadata")
    || message.includes("unsupported video format or codec");
}

function runAnalysisWorker(firstImageData, lastImageData, settings) {
  return new Promise((resolve, reject) => {
    setTimedStatus("Starting clustering worker");
    const worker = new Worker(`./worker.js?v=${APP_VERSION}`);
    state.activeWorker = worker;
    state.currentReject = reject;
    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "progress") {
        state.lastWorkerMessageAt = performance.now();
        state.lastWorkerMessage = message.message || message.stage || "Working";
        setProgress(message.value);
        setTimedStatus(state.lastWorkerMessage);
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
      {
        type: "analyze",
        payload: {
          firstBuffer: firstImageData.data.buffer,
          lastBuffer: lastImageData.data.buffer,
          settings,
        },
      },
      [firstImageData.data.buffer, lastImageData.data.buffer],
    );
  });
}

async function togglePreview() {
  if (!state.analysis) return;
  if (state.previewing) {
    stopPreview();
    return;
  }

  state.previewing = true;
  dom.stopButton.disabled = false;
  dom.previewButton.textContent = "Stop";
  dom.workVideo.muted = true;
  if (dom.workVideo.ended) {
    dom.workVideo.currentTime = 0;
  }
  await dom.workVideo.play();
  requestAnimationFrame(previewLoop);
}

function stopPreview() {
  state.previewing = false;
  dom.previewButton.textContent = "Preview";
  dom.workVideo.pause();
  if (!state.recording && !state.activeWorker) {
    dom.stopButton.disabled = true;
  }
}

function previewLoop() {
  if (!state.previewing || dom.workVideo.paused || dom.workVideo.ended) {
    stopPreview();
    return;
  }
  drawCurrentFrame();
  requestAnimationFrame(previewLoop);
}

async function recordProcessedVideo() {
  if (!state.analysis || state.recording || !supportsRecording()) return;

  stopPreview();
  state.recording = true;
  state.cancelled = false;
  dom.recordButton.disabled = true;
  dom.analyzeButton.disabled = true;
  dom.previewButton.disabled = true;
  dom.stopButton.disabled = false;
  clearExportedVideo();
  setStatus("Recording WebM");

  const stream = dom.processedCanvas.captureStream(24);
  const mimeType = chooseRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.activeRecorder = recorder;
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();
  await seekVideo(dom.workVideo, 0);
  dom.workVideo.muted = true;
  await dom.workVideo.play();

  await new Promise((resolve) => {
    const step = () => {
      if (state.cancelled) {
        dom.workVideo.pause();
        resolve();
        return;
      }
      drawCurrentFrame();
      setProgress(Math.min(1, dom.workVideo.currentTime / Math.max(0.001, dom.workVideo.duration)));
      if (dom.workVideo.ended || dom.workVideo.paused) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  if (recorder.state !== "inactive") {
    recorder.stop();
  }
  await stopped;

  state.activeRecorder = null;
  if (state.cancelled) {
    state.recording = false;
    state.cancelled = false;
    dom.recordButton.disabled = false;
    dom.analyzeButton.disabled = false;
    dom.previewButton.disabled = false;
    dom.stopButton.disabled = true;
    setProgress(0);
    setStatus("Stopped.");
    return;
  }

  const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
  state.downloadUrl = URL.createObjectURL(blob);
  dom.downloadLink.href = state.downloadUrl;
  dom.downloadLink.download = makeOutputName(state.fileName);
  dom.downloadLink.hidden = false;
  dom.outputVideo.src = state.downloadUrl;
  dom.outputVideo.load();
  dom.outputPanel.hidden = false;

  state.recording = false;
  state.activeRecorder = null;
  dom.recordButton.disabled = false;
  dom.analyzeButton.disabled = false;
  dom.previewButton.disabled = false;
  dom.stopButton.disabled = true;
  setProgress(1);
  setStatus(`Export ready: ${formatBytes(blob.size)}`);
}

function stopAll() {
  state.cancelled = true;
  stopAnalysisTimer();

  if (state.activeWorker) {
    state.activeWorker.terminate();
    state.activeWorker = null;
  }
  if (state.currentReject) {
    const reject = state.currentReject;
    state.currentReject = null;
    reject(new Error("Stopped"));
  }

  stopPreview();

  if (state.activeRecorder && state.activeRecorder.state !== "inactive") {
    state.activeRecorder.stop();
  }
  if (state.ffmpeg && state.transcoding) {
    state.ffmpeg.terminate();
    state.ffmpeg = null;
    state.ffmpegLoaded = false;
    state.transcoding = false;
  }
  dom.workVideo.pause();
  dom.analyzeButton.disabled = !state.objectUrl;
  dom.previewButton.disabled = !state.analysis;
  dom.recordButton.disabled = !state.analysis || !supportsRecording();
  dom.stopButton.disabled = true;
  setProgress(0);
  setStatus("Stopped.");
}

async function transcodeUnsupportedVideo(originalError) {
  state.transcoding = true;
  state.usedTranscodedSource = true;
  setProgress(0.02);
  setTimedStatus("Browser cannot read this codec. Loading converter");

  try {
    const ffmpeg = await getFFmpeg();
    throwIfCancelled();

    const inputName = `input${fileExtension(state.originalFile.name) || ".video"}`;
    const outputName = "browser-compatible.mp4";

    setTimedStatus(`Writing ${state.fileName} to converter memory`);
    await ffmpeg.writeFile(inputName, new Uint8Array(await state.originalFile.arrayBuffer()));
    throwIfCancelled();

    setTimedStatus("Converting to browser-compatible H.264 MP4");
    const exitCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-map",
      "0:v:0",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg conversion failed with exit code ${exitCode}`);
    }
    throwIfCancelled();

    setTimedStatus("Loading converted video");
    const data = await ffmpeg.readFile(outputName);
    const convertedBlob = new Blob([data.buffer], { type: "video/mp4" });
    const convertedUrl = URL.createObjectURL(convertedBlob);

    const oldUrl = state.objectUrl;
    state.objectUrl = convertedUrl;
    resetWorkVideo();
    dom.workVideo.preload = "metadata";
    dom.workVideo.src = state.objectUrl;
    dom.workVideo.load();
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }

    await deleteFFmpegFile(ffmpeg, inputName);
    await deleteFFmpegFile(ffmpeg, outputName);
    setTimedStatus(`Converted for browser playback: ${formatBytes(convertedBlob.size)}`);
  } catch (error) {
    state.usedTranscodedSource = false;
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
      setProgress(0.02 + bounded * 0.18);
      setTimedStatus(`Converting unsupported video ${Math.round(bounded * 100)}%`);
    });
    state.ffmpeg.on("log", ({ message }) => {
      if (message && /frame=|time=|Opening|Output|Input/.test(message)) {
        state.lastWorkerMessageAt = performance.now();
        state.lastWorkerMessage = "Converting unsupported video";
      }
    });
  }

  if (!state.ffmpegLoaded) {
    const coreBase = new URL("./vendor/ffmpeg/core/", window.location.href).href;
    setTimedStatus("Loading ffmpeg.wasm core");
    state.ffmpegLoaded = await state.ffmpeg.load({
      coreURL: `${coreBase}ffmpeg-core.js?v=${APP_VERSION}`,
      wasmURL: `${coreBase}ffmpeg-core.wasm?v=${APP_VERSION}`,
    });
  }

  return state.ffmpeg;
}

async function deleteFFmpegFile(ffmpeg, path) {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // Best-effort cleanup; stale in-memory files are cleared when FFmpeg is terminated.
  }
}

function fileExtension(name) {
  const match = /\.[A-Za-z0-9]+$/.exec(name);
  return match ? match[0].toLowerCase() : "";
}

function drawCurrentFrame() {
  if (!state.analysis) return;

  const sourceCtx = dom.sourceCanvas.getContext("2d", { willReadFrequently: true });
  const processedCtx = dom.processedCanvas.getContext("2d", { willReadFrequently: true });
  const maskCtx = dom.maskCanvas.getContext("2d", { willReadFrequently: true });

  sourceCtx.drawImage(dom.workVideo, 0, 0, dom.sourceCanvas.width, dom.sourceCanvas.height);
  const imageData = sourceCtx.getImageData(0, 0, dom.sourceCanvas.width, dom.sourceCanvas.height);
  const processed = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  processPixels(processed.data, state.analysis.representatives, state.analysis.threshold, state.processedCache, false);
  processedCtx.putImageData(processed, 0, 0);

  const mask = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  processPixels(mask.data, state.analysis.representatives, state.analysis.threshold, state.maskCache, true);
  maskCtx.putImageData(mask, 0, 0);
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
        if (distSq < bestSq) {
          bestSq = distSq;
          best = rep;
        }
      }
      const isNew = bestSq > thresholdSq;
      mapped = maskOnly
        ? isNew
          ? [255, 0, 255]
          : [0, 0, 0]
        : isNew
          ? [255, 0, 255]
          : best;
      cache.set(key, mapped);
    }
    data[index] = mapped[0];
    data[index + 1] = mapped[1];
    data[index + 2] = mapped[2];
    data[index + 3] = 255;
  }
}

async function extractFrame(video, time, shortSide) {
  await ensureMetadata(video);
  await seekVideo(video, Math.min(time, Math.max(0, video.duration - 0.001)));
  const { width, height } = scaledSize(video.videoWidth, video.videoHeight, shortSide);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);
  return {
    width,
    height,
    imageData: ctx.getImageData(0, 0, width, height),
  };
}

function setCanvasSizes(shortSide) {
  const { width, height } = scaledSize(dom.workVideo.videoWidth, dom.workVideo.videoHeight, shortSide);
  for (const canvas of [dom.sourceCanvas, dom.processedCanvas, dom.maskCanvas]) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.aspectRatio = `${width} / ${height}`;
  }
}

function scaledSize(width, height, shortSide) {
  if (!width || !height) {
    return { width: 640, height: 360 };
  }
  const scale = Math.min(1, shortSide / Math.min(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function readSettings() {
  const minClusters = readInt(dom.minClusters, 4);
  const maxClusters = Math.max(minClusters + 1, readInt(dom.maxClusters, 40));
  return {
    analysisShortSide: readInt(dom.analysisShortSide, 540),
    previewShortSide: readInt(dom.previewShortSide, 360),
    maxCandidates: readInt(dom.maxCandidates, 800),
    minRepresentativeDistance: readFloat(dom.minRepDistance, 12),
    minClusters,
    maxClusters,
    thresholdMode: dom.thresholdMode.value,
    fixedThreshold: readFloat(dom.fixedThreshold, 60),
    thresholdQuantile: 0.995,
    thresholdMargin: readFloat(dom.thresholdMargin, 5),
  };
}

function renderPalette(representatives) {
  dom.palette.innerHTML = "";
  representatives.forEach((rgb, index) => {
    const hex = rgbToHex(rgb);
    const item = document.createElement("div");
    item.className = "swatch";
    item.innerHTML = `
      <span class="swatch-color" style="background:${hex}"></span>
      <span>${index + 1}. ${hex}</span>
    `;
    dom.palette.appendChild(item);
  });
}

function renderMetrics(analysis) {
  const thresholdInfo = analysis.thresholdInfo;
  const rows = [
    ["Colors", analysis.selectedK],
    ["Threshold", formatNumber(analysis.threshold, 2)],
    ["Unique RGB", analysis.uniqueColors.toLocaleString()],
    ["Coverage", `${formatNumber(analysis.candidateCoverage * 100, 2)}%`],
    ["Candidates", analysis.candidateCount.toLocaleString()],
    ["Min rep dist", formatNumber(analysis.selectedMinRepresentativeDistance, 2)],
    ["Mode", thresholdInfo.mode],
    ["Quantile", thresholdInfo.quantileDistance == null ? "-" : formatNumber(thresholdInfo.quantileDistance, 2)],
  ];
  dom.metrics.innerHTML = rows
    .map((row) => `<div class="metric"><strong>${row[1]}</strong><span>${row[0]}</span></div>`)
    .join("");
}

function renderCandidateTable(rows, selectedK) {
  dom.candidateTableBody.innerHTML = rows
    .map((row) => {
      const cls = row.k === selectedK ? " class=\"selected-row\"" : "";
      return `
        <tr${cls}>
          <td>${row.k}</td>
          <td>${formatNumber(row.relativeGap, 3)}</td>
          <td>${formatNumber(row.minRepresentativeDistance, 3)}</td>
        </tr>
      `;
    })
    .join("");
}

function ensureMetadata(video) {
  if (hasVideoMetadata(video)) {
    return Promise.resolve();
  }
  if (video.error) {
    return Promise.reject(new Error(`Could not load video metadata: ${mediaErrorMessage(video)}. File: ${state.fileInfo || state.fileName || "unknown"}`));
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while reading video metadata. File: ${state.fileInfo || state.fileName || "unknown"}`));
    }, 20000);
    const onLoaded = () => {
      if (!hasVideoMetadata(video)) {
        return;
      }
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Could not load video metadata: ${mediaErrorMessage(video)}. File: ${state.fileInfo || state.fileName || "unknown"}`));
    };
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
  return video.readyState >= 1
    && Number.isFinite(video.duration)
    && video.duration > 0
    && video.videoWidth > 0
    && video.videoHeight > 0;
}

function mediaErrorMessage(video) {
  const error = video.error;
  if (!error) {
    return "the browser did not provide a media error code";
  }

  const labels = {
    1: "loading was aborted",
    2: "network error while loading the selected file",
    3: "decode error or damaged video stream",
    4: "unsupported video format or codec",
  };
  const label = labels[error.code] || "unknown media error";
  const extra = error.message ? `: ${error.message}` : "";
  return `${label} (code ${error.code})${extra}`;
}

function seekVideo(video, time) {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while seeking video to ${formatNumber(time, 3)}s`));
    }, 30000);
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video seek failed"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

function supportsRecording() {
  return Boolean(dom.processedCanvas.captureStream && window.MediaRecorder);
}

function chooseRecorderMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function makeOutputName(inputName) {
  const base = inputName.replace(/\.[^.]+$/, "") || "palette-reduced";
  return `${base}-palette-reduced.webm`;
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function formatNumber(value, digits) {
  if (!Number.isFinite(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${formatNumber(bytes / 1024, 1)} KB`;
  }
  return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
}

function readInt(input, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) ? value : fallback;
}

function readFloat(input, fallback) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function setStatus(message) {
  dom.statusText.textContent = message;
}

function setTimedStatus(message) {
  state.lastWorkerMessageAt = performance.now();
  state.lastWorkerMessage = message;
  const elapsed = state.analysisStartedAt
    ? Math.floor((performance.now() - state.analysisStartedAt) / 1000)
    : 0;
  dom.statusText.textContent = elapsed > 0 ? `${message} (${elapsed}s)` : message;
}

function startAnalysisTimer(initialMessage) {
  stopAnalysisTimer();
  state.analysisStartedAt = performance.now();
  state.lastWorkerMessageAt = state.analysisStartedAt;
  state.lastWorkerMessage = initialMessage;
  state.analysisTimer = window.setInterval(() => {
    const now = performance.now();
    const elapsed = Math.floor((now - state.analysisStartedAt) / 1000);
    const quietSeconds = Math.floor((now - state.lastWorkerMessageAt) / 1000);
    const prefix = quietSeconds >= 8
      ? `${state.lastWorkerMessage} - still working`
      : state.lastWorkerMessage;
    dom.statusText.textContent = `${prefix} (${elapsed}s)`;
  }, 1000);
}

function stopAnalysisTimer() {
  if (state.analysisTimer !== null) {
    window.clearInterval(state.analysisTimer);
    state.analysisTimer = null;
  }
}

function setProgress(value) {
  dom.progressBar.value = Math.max(0, Math.min(1, value));
}

function clearCanvas(canvas) {
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111820";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

clearCanvas(dom.sourceCanvas);
clearCanvas(dom.processedCanvas);
clearCanvas(dom.maskCanvas);

if (window.location.protocol === "file:") {
  setStatus("Open this app through an HTTP server or GitHub Pages. Web Worker analysis may not run from file://.");
}
