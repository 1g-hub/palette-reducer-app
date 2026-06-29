"use strict";

const MAGENTA = [255, 0, 255];
const DEFAULT_BUCKET_BITS = 5;
const KMEANS_ITERS = 30;
const SAMPLE_LIMIT = 12000;

self.onmessage = (event) => {
  if (!event.data || event.data.type !== "analyze") return;

  try {
    const result = analyze(event.data.payload);
    self.postMessage({ type: "done", result });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function postProgress(stage, value, message) {
  self.postMessage({ type: "progress", stage, value, message });
}

function analyze(payload) {
  const settings = payload.settings || {};
  const first = new Uint8ClampedArray(payload.firstBuffer);
  const last = new Uint8ClampedArray(payload.lastBuffer);
  const totalPixels = first.length / 4 + last.length / 4;
  const bucketBits = settings.bucketBits || DEFAULT_BUCKET_BITS;

  postProgress("histogram", 0.05, "Bucketing colors");
  const buckets = buildBucketCandidates([first, last], bucketBits);
  const histogram = buckets.candidates;
  const uniqueColors = histogram.length;
  if (!uniqueColors) throw new Error("No colors were available for palette analysis");

  postProgress("histogram", 0.10, `Found ${uniqueColors.toLocaleString()} color buckets`);
  histogram.sort((a, b) => b.count - a.count);

  const requestedCandidates = Math.max(1, settings.maxCandidates || 1200);
  const candidateCount = Math.min(requestedCandidates, histogram.length);
  const candidates = histogram.slice(0, candidateCount);
  const candidateCoverage = candidates.reduce((sum, item) => sum + item.count, 0) / Math.max(1, totalPixels);

  const minClusters = Math.max(1, Math.min(settings.minClusters || 2, candidateCount));
  const maxClusters = Math.max(minClusters, Math.min(settings.maxClusters || minClusters, candidateCount));
  const colors = candidates.map((item) => item.rgb);
  const counts = candidates.map((item) => item.count);
  const weights = candidates.map((item) => Math.sqrt(item.count));

  postProgress("cluster", 0.14, `Preparing ${colors.length.toLocaleString()} candidate colors`);
  const clustered = buildKMeansSnapshots(colors, weights, minClusters, maxClusters, settings);
  const selected = selectClusterCount(clustered.rows, settings);
  const snapshot = clustered.snapshots.get(selected.k);
  if (!snapshot) throw new Error("Selected cluster snapshot was not available");

  postProgress("threshold", 0.94, "Choosing threshold");
  const thresholdInfo = chooseThreshold(colors, counts, snapshot.labels, snapshot.representatives, settings);
  postProgress("plot", 0.98, "Preparing color plot samples");
  const sampleColors = sampleArray(histogram.map((item) => item.rgb), SAMPLE_LIMIT);

  const snapshotsByK = {};
  const availableK = [];
  for (const [k, snap] of clustered.snapshots.entries()) {
    snapshotsByK[k] = {
      representatives: snap.representatives,
      minRepresentativeDistance: snap.minRepresentativeDistance,
      closestRepresentativePair: snap.closestRepresentativePair,
      sse: snap.sse,
    };
    availableK.push(k);
  }
  availableK.sort((a, b) => a - b);

  postProgress("done", 1, "Palette ready");
  return {
    selectedK: selected.k,
    representatives: snapshot.representatives,
    threshold: thresholdInfo.threshold,
    thresholdInfo,
    uniqueColors,
    colorBucketBits: bucketBits,
    candidateCount,
    candidateCoverage,
    rows: selected.rows,
    selectedMinRepresentativeDistance: snapshot.minRepresentativeDistance,
    closestRepresentativePair: snapshot.closestRepresentativePair,
    sampleColors,
    snapshotsByK,
    availableK,
    magenta: MAGENTA,
  };
}

function buildBucketCandidates(buffers, bucketBits) {
  const shift = 8 - Math.max(1, Math.min(8, bucketBits));
  const counts = new Map();

  for (const data of buffers) {
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index] >> shift;
      const g = data[index + 1] >> shift;
      const b = data[index + 2] >> shift;
      const key = (r << (bucketBits * 2)) | (g << bucketBits) | b;
      let row = counts.get(key);
      if (!row) {
        row = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
        counts.set(key, row);
      }
      row.count += 1;
      row.rSum += data[index];
      row.gSum += data[index + 1];
      row.bSum += data[index + 2];
    }
  }

  const candidates = [];
  for (const [key, row] of counts.entries()) {
    const inv = 1 / row.count;
    candidates.push({
      key,
      rgb: [
        Math.round(row.rSum * inv),
        Math.round(row.gSum * inv),
        Math.round(row.bSum * inv),
      ],
      count: row.count,
    });
  }
  return { candidates };
}

function buildKMeansSnapshots(colors, weights, minClusters, maxClusters, settings) {
  const snapshots = new Map();
  const rows = [];
  let prevSse = null;
  const totalK = maxClusters - minClusters + 1;
  postProgress("cluster", 0.16, "Preparing k-means seeds");
  const seedCenters = initCenterSequence(colors, weights, maxClusters);

  for (let k = minClusters; k <= maxClusters; k += 1) {
    const kIndex = k - minClusters;
    const start = 0.20 + (kIndex / totalK) * 0.70;
    const end = 0.20 + ((kIndex + 1) / totalK) * 0.70;
    postProgress("cluster", start, `Weighted k-means: ${k} colors`);

    const model = weightedKMeans(colors, weights, seedCenters, k, KMEANS_ITERS, (iterFrac) => {
      postProgress("cluster", start + (end - start) * iterFrac, `Weighted k-means: ${k} colors`);
    });
    const representatives = representativesFromCenters(colors, model.centers);
    const labels = labelsForRepresentatives(colors, representatives);
    const sse = weightedSse(colors, weights, labels, representatives);
    const pairInfo = minPairwiseDistance(representatives);
    const absoluteGap = prevSse == null ? 0 : Math.max(0, prevSse - sse);
    const improvement = prevSse == null ? 0 : absoluteGap / Math.max(prevSse, 1e-9);
    const relativeGap = 1 + improvement;

    snapshots.set(k, {
      labels,
      representatives,
      sse,
      minRepresentativeDistance: pairInfo.distance,
      closestRepresentativePair: pairInfo.pair,
    });
    rows.push({
      k,
      previous: prevSse == null ? sse : prevSse,
      next: sse,
      absoluteGap,
      relativeGap,
      minRepresentativeDistance: pairInfo.distance,
    });
    prevSse = sse;
    postProgress("cluster", end, `Weighted k-means: ${k} colors`);
  }

  postProgress("cluster", 0.92, "Choosing palette size");
  return { snapshots, rows };
}

function weightedKMeans(colors, weights, seedCenters, k, maxIters, onProgress) {
  const n = colors.length;
  const centers = seedCenters.slice(0, k).map((center) => center.slice());
  const labels = new Int16Array(n);
  labels.fill(-1);
  const sumW = new Float64Array(k);
  const sumR = new Float64Array(k);
  const sumG = new Float64Array(k);
  const sumB = new Float64Array(k);

  for (let iter = 0; iter < maxIters; iter += 1) {
    sumW.fill(0);
    sumR.fill(0);
    sumG.fill(0);
    sumB.fill(0);
    let changed = false;

    for (let i = 0; i < n; i += 1) {
      const label = nearestColorIndex(colors[i], centers);
      if (labels[i] !== label) {
        labels[i] = label;
        changed = true;
      }
      const w = weights[i];
      sumW[label] += w;
      sumR[label] += colors[i][0] * w;
      sumG[label] += colors[i][1] * w;
      sumB[label] += colors[i][2] * w;
    }

    for (let c = 0; c < k; c += 1) {
      if (sumW[c] <= 0) continue;
      const inv = 1 / sumW[c];
      centers[c] = [sumR[c] * inv, sumG[c] * inv, sumB[c] * inv];
    }

    if (onProgress && (iter === 0 || iter % 4 === 3)) onProgress((iter + 1) / maxIters);
    if (!changed && iter > 0) break;
  }

  return { centers, labels: Array.from(labels) };
}

function initCenterSequence(colors, weights, maxK) {
  let first = 0;
  for (let i = 1; i < colors.length; i += 1) {
    if (weights[i] > weights[first]) first = i;
  }

  const centers = [colors[first].slice()];
  while (centers.length < maxK) {
    let bestIndex = 0;
    let bestScore = -1;
    for (let i = 0; i < colors.length; i += 1) {
      let nearestSq = Infinity;
      for (const center of centers) {
        const d = colorDistanceSq(colors[i], center);
        if (d < nearestSq) nearestSq = d;
      }
      const score = nearestSq * Math.sqrt(Math.max(1, weights[i]));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    centers.push(colors[bestIndex].slice());
  }
  return centers;
}

function representativesFromCenters(colors, centers) {
  const reps = [];
  for (const center of centers) {
    let bestIndex = 0, bestDistance = Infinity;
    for (let i = 0; i < colors.length; i += 1) {
      const d = colorDistanceSq(colors[i], center);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    reps.push(colors[bestIndex].slice());
  }
  return reps;
}

function labelsForRepresentatives(colors, representatives) {
  const labels = new Int16Array(colors.length);
  for (let i = 0; i < colors.length; i += 1) {
    labels[i] = nearestColorIndex(colors[i], representatives);
  }
  return Array.from(labels);
}

function weightedSse(colors, counts, labels, representatives) {
  let total = 0;
  for (let i = 0; i < colors.length; i += 1) {
    total += colorDistanceSq(colors[i], representatives[labels[i]]) * counts[i];
  }
  return total;
}

function nearestColorIndex(color, palette) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const d = colorDistanceSq(color, palette[i]);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

function selectClusterCount(rows, settings) {
  if (!rows.length) throw new Error("No cluster-count candidates were available");
  const minDistance = settings.minRepresentativeDistance || 0;
  // Candidate Ks: palettes whose two closest reps are at least `minDistance` apart (the "merge
  // similar colors" strength) and that aren't degenerate (duplicate reps). Fall back progressively
  // so a tiny histogram still yields a choice.
  let pool = rows.filter((r) => r.minRepresentativeDistance >= minDistance && r.minRepresentativeDistance > 0);
  if (pool.length < 2) pool = rows.filter((r) => r.minRepresentativeDistance > 0);
  if (pool.length < 2) pool = rows.slice();

  // Auto K = the ELBOW (knee) of the weighted-SSE-vs-K curve. The curve drops steeply while real,
  // distinct flat colors are still being separated, then flattens into a slow tail that only chips
  // away at gradient/noise. The knee = the K whose point lies farthest BELOW the straight chord
  // joining the first and last candidate K — the natural "enough colors, ignore the noise tail"
  // point. (Old rule = max relative gap → picked the first big drop → too few colors. A
  // variance-explained floor would instead chase the gradient tail → too many. The knee adapts.)
  const xs = pool.map((r) => r.k);
  const ys = pool.map((r) => r.next); // weighted SSE at this k
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const y0 = ys[0], y1 = ys[ys.length - 1];
  const xr = (x1 - x0) || 1, yr = (y0 - y1) || 1; // SSE decreases with k → y0 >= y1
  const below = pool.map((r, i) => {
    const xn = (xs[i] - x0) / xr;     // 0..1
    const yn = (ys[i] - y1) / yr;     // ~1..0
    return (1 - xn) - yn;             // how far the curve dips below the chord (>=0 when convex)
  });
  let peak = 0;
  for (const d of below) if (d > peak) peak = d;
  // Among the Ks within `sensitivity` of the peak knee-ness, take the LARGEST — it sits on the
  // high-K shoulder of the knee (a touch richer / more natural) rather than the bare minimum. This
  // is the single knob: →1.0 = leanest (exact knee), ↓ = more colors.
  const sensitivity = Math.max(0.5, Math.min(1, settings.colorElbowSensitivity || 0.9));
  let chosen = pool[0];
  if (peak > 1e-9) {
    for (let i = 0; i < pool.length; i += 1) if (below[i] >= sensitivity * peak) chosen = pool[i];
  } else {
    // No real knee (monotone / near-linear curve) → a modest default palette size.
    chosen = pool[Math.min(pool.length - 1, Math.max(0, Math.round(pool.length * 0.4)))];
  }

  const rankedRows = rows.slice().sort((a, b) => {
    if (b.relativeGap !== a.relativeGap) return b.relativeGap - a.relativeGap;
    if (b.absoluteGap !== a.absoluteGap) return b.absoluteGap - a.absoluteGap;
    return b.k - a.k;
  });
  return { k: chosen.k, rows: rankedRows };
}

function chooseThreshold(colors, counts, labels, representatives, settings) {
  if (settings.thresholdMode === "fixed") {
    return {
      mode: "fixed",
      threshold: settings.fixedThreshold,
      quantileDistance: null,
      margin: 0,
    };
  }

  const distances = colors.map((color, index) => colorDistance(color, representatives[labels[index]]));
  const quantileDistance = weightedQuantile(distances, counts, settings.thresholdQuantile || 0.995);
  const threshold = quantileDistance + (settings.thresholdMargin || 0);
  return {
    mode: "auto",
    threshold,
    quantile: settings.thresholdQuantile || 0.995,
    quantileDistance,
    margin: settings.thresholdMargin || 0,
  };
}

function weightedQuantile(values, weights, quantile) {
  const order = values.map((value, index) => ({ value, weight: weights[index] }));
  order.sort((a, b) => a.value - b.value);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = total * quantile;
  let cumulative = 0;
  for (const item of order) {
    cumulative += item.weight;
    if (cumulative >= target) return item.value;
  }
  return order.length ? order[order.length - 1].value : 0;
}

function sampleArray(arr, max) {
  if (arr.length <= max) return arr.map((c) => [c[0], c[1], c[2]]);
  const step = arr.length / max;
  const out = [];
  for (let i = 0; i < max; i += 1) {
    const c = arr[Math.floor(i * step)];
    out.push([c[0], c[1], c[2]]);
  }
  return out;
}

function minPairwiseDistance(representatives) {
  if (representatives.length < 2) return { distance: 0, pair: [] };
  let bestDistance = Infinity;
  let bestPair = [];
  for (let i = 0; i < representatives.length - 1; i += 1) {
    for (let j = i + 1; j < representatives.length; j += 1) {
      const distance = colorDistance(representatives[i], representatives[j]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPair = [representatives[i], representatives[j]];
      }
    }
  }
  return { distance: bestDistance, pair: bestPair };
}

function colorDistance(a, b) {
  return Math.sqrt(colorDistanceSq(a, b));
}

function colorDistanceSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}
