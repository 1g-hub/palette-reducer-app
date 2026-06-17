"use strict";

const MAGENTA = [255, 0, 255];

self.onmessage = (event) => {
  if (!event.data || event.data.type !== "analyze") {
    return;
  }

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
  const settings = payload.settings;
  const first = new Uint8ClampedArray(payload.firstBuffer);
  const last = new Uint8ClampedArray(payload.lastBuffer);
  const totalPixels = first.length / 4 + last.length / 4;

  postProgress("histogram", 0.05, "Counting colors");
  const histogram = buildHistogram([first, last]);
  const uniqueColors = histogram.length;
  postProgress("histogram", 0.09, `Found ${uniqueColors.toLocaleString()} unique colors`);
  histogram.sort((a, b) => b.count - a.count);

  const candidateCount = Math.min(settings.maxCandidates, histogram.length);
  const candidates = histogram.slice(0, candidateCount);
  const candidateCoverage = candidates.reduce((sum, item) => sum + item.count, 0) / totalPixels;

  const colors = candidates.map((item) => item.rgb);
  const counts = candidates.map((item) => item.count);

  postProgress("cluster", 0.15, `Preparing ${colors.length} candidate colors`);
  const clustered = completeLinkage(colors, counts, settings);
  const selected = selectClusterCount(clustered, settings);
  const snapshot = clustered.snapshots.get(selected.k);
  if (!snapshot) {
    throw new Error("Selected cluster snapshot was not available");
  }

  const thresholdInfo = chooseThreshold(colors, counts, snapshot.labels, snapshot.representatives, settings);
  // Plot ALL of the analyzed colors (full unique histogram, not just the clustering candidates),
  // so colors that fall outside every representative's threshold show up as magenta in the 3D plot.
  const sampleColors = sampleArray(histogram.map((item) => item.rgb), 12000);

  const snapshotsByK = {};
  const availableK = [];
  for (const [k, snap] of clustered.snapshots.entries()) {
    snapshotsByK[k] = {
      representatives: snap.representatives,
      minRepresentativeDistance: snap.minRepresentativeDistance,
    };
    availableK.push(k);
  }
  availableK.sort((a, b) => a - b);

  return {
    selectedK: selected.k,
    representatives: snapshot.representatives,
    threshold: thresholdInfo.threshold,
    thresholdInfo,
    uniqueColors,
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

function sampleArray(arr, max) {
  if (arr.length <= max) {
    return arr.map((c) => [c[0], c[1], c[2]]);
  }
  const step = arr.length / max;
  const out = [];
  for (let i = 0; i < max; i += 1) {
    const c = arr[Math.floor(i * step)];
    out.push([c[0], c[1], c[2]]);
  }
  return out;
}

function buildHistogram(buffers) {
  const counts = new Map();
  for (const data of buffers) {
    for (let index = 0; index < data.length; index += 4) {
      const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const rows = [];
  for (const [key, count] of counts.entries()) {
    rows.push({
      key,
      rgb: [(key >> 16) & 255, (key >> 8) & 255, key & 255],
      count,
    });
  }
  return rows;
}

function completeLinkage(colors, counts, settings) {
  const n = colors.length;
  if (n < settings.minClusters + 1) {
    throw new Error("Not enough candidate colors for the requested cluster range");
  }

  const distances = new Float32Array(n * n);
  const heapItems = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const distance = colorDistance(colors[i], colors[j]);
      distances[i * n + j] = distance;
      distances[j * n + i] = distance;
      heapItems.push({ distance: distances[i * n + j], i, j });
    }
    if (i % 24 === 0 || i === n - 1) {
      const progress = 0.15 + (i / Math.max(1, n - 1)) * 0.1;
      postProgress("distance", progress, `Building RGB distance table: ${i + 1}/${n}`);
    }
  }
  const heap = new MinPairHeap(heapItems);
  postProgress("cluster", 0.25, `Prepared ${heap.size().toLocaleString()} color pairs`);

  const active = new Uint8Array(n);
  active.fill(1);
  const members = Array.from({ length: n }, (_, index) => [index]);
  const weights = counts.slice();
  const distanceAtReduction = new Map();
  const snapshots = new Map();
  let activeCount = n;
  let mergeIndex = 0;
  const stopAt = Math.max(1, settings.minClusters - 1);

  while (activeCount > stopAt) {
    const best = takeNearestActivePair(heap, distances, active, n);
    const bestDistance = best.distance;
    const bestI = best.i;
    const bestJ = best.j;

    if (bestI < 0 || bestJ < 0) {
      throw new Error("Could not find a cluster pair to merge");
    }

    distanceAtReduction.set(activeCount, bestDistance);
    members[bestI] = members[bestI].concat(members[bestJ]);
    members[bestJ] = [];
    weights[bestI] += weights[bestJ];
    weights[bestJ] = 0;
    active[bestJ] = 0;

    for (let x = 0; x < n; x += 1) {
      if (!active[x] || x === bestI) continue;
      const updated = Math.max(distances[bestI * n + x], distances[bestJ * n + x]);
      distances[bestI * n + x] = updated;
      distances[x * n + bestI] = updated;
      heap.push({
        distance: updated,
        i: Math.min(bestI, x),
        j: Math.max(bestI, x),
      });
    }

    activeCount -= 1;
    mergeIndex += 1;

    if (activeCount <= settings.maxClusters && activeCount >= settings.minClusters) {
      snapshots.set(activeCount, makeSnapshot(colors, counts, active, members, weights));
    }

    if (mergeIndex % 8 === 0 || activeCount <= settings.maxClusters) {
      const done = (n - activeCount) / Math.max(1, n - stopAt);
      postProgress("cluster", 0.25 + done * 0.62, `Clustering: ${activeCount} clusters`);
    }
  }

  return { distanceAtReduction, snapshots };
}

function takeNearestActivePair(heap, distances, active, n) {
  while (heap.size() > 0) {
    const item = heap.pop();
    if (!active[item.i] || !active[item.j]) {
      continue;
    }

    const current = distances[item.i * n + item.j];
    if (Math.abs(current - item.distance) > 1e-5) {
      continue;
    }

    return item;
  }
  return { distance: Infinity, i: -1, j: -1 };
}

class MinPairHeap {
  constructor(items) {
    this.items = items;
    for (let index = Math.floor(this.items.length / 2) - 1; index >= 0; index -= 1) {
      this.sink(index);
    }
  }

  size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.swim(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) {
      return null;
    }

    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sink(0);
    }
    return first;
  }

  swim(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].distance <= this.items[index].distance) {
        break;
      }
      this.swap(parent, index);
      index = parent;
    }
  }

  sink(index) {
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < length && this.items[left].distance < this.items[smallest].distance) {
        smallest = left;
      }
      if (right < length && this.items[right].distance < this.items[smallest].distance) {
        smallest = right;
      }
      if (smallest === index) {
        break;
      }
      this.swap(index, smallest);
      index = smallest;
    }
  }

  swap(a, b) {
    const item = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = item;
  }
}

function makeSnapshot(colors, counts, active, members, weights) {
  const clusters = [];
  for (let index = 0; index < active.length; index += 1) {
    if (!active[index]) continue;
    const memberIndices = members[index];
    let repCandidate = memberIndices[0];
    for (const member of memberIndices) {
      if (counts[member] > counts[repCandidate]) {
        repCandidate = member;
      }
    }
    clusters.push({
      activeIndex: index,
      members: memberIndices,
      weight: weights[index],
      representative: colors[repCandidate],
    });
  }

  clusters.sort((a, b) => b.weight - a.weight);
  const labels = new Int16Array(colors.length);
  const representatives = [];
  for (let label = 0; label < clusters.length; label += 1) {
    representatives.push(clusters[label].representative);
    for (const member of clusters[label].members) {
      labels[member] = label;
    }
  }

  const pairInfo = minPairwiseDistance(representatives);
  return {
    labels: Array.from(labels),
    representatives,
    minRepresentativeDistance: pairInfo.distance,
    closestRepresentativePair: pairInfo.pair,
  };
}

function selectClusterCount(clustered, settings) {
  const rows = [];
  for (let k = settings.minClusters; k <= settings.maxClusters; k += 1) {
    const previous = clustered.distanceAtReduction.get(k + 1);
    const next = clustered.distanceAtReduction.get(k);
    const snapshot = clustered.snapshots.get(k);
    if (!Number.isFinite(previous) || !Number.isFinite(next) || !snapshot) {
      continue;
    }

    const absoluteGap = next - previous;
    const relativeGap = next / Math.max(previous, 1e-9);
    rows.push({
      k,
      previous,
      next,
      absoluteGap,
      relativeGap,
      minRepresentativeDistance: snapshot.minRepresentativeDistance,
    });
  }

  if (!rows.length) {
    throw new Error("No cluster-count candidates were available");
  }

  const valid = rows.filter((row) => row.minRepresentativeDistance >= settings.minRepresentativeDistance);
  const pool = valid.length ? valid : rows;
  const best = pool.reduce((current, row) => {
    if (!current) return row;
    if (row.relativeGap !== current.relativeGap) {
      return row.relativeGap > current.relativeGap ? row : current;
    }
    if (row.absoluteGap !== current.absoluteGap) {
      return row.absoluteGap > current.absoluteGap ? row : current;
    }
    return row.k > current.k ? row : current;
  }, null);

  rows.sort((a, b) => b.relativeGap - a.relativeGap);
  return { k: best.k, rows };
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

  const distances = colors.map((color, index) => {
    return colorDistance(color, representatives[labels[index]]);
  });
  const quantileDistance = weightedQuantile(distances, counts, settings.thresholdQuantile);
  const threshold = quantileDistance + settings.thresholdMargin;
  return {
    mode: "auto",
    threshold,
    quantile: settings.thresholdQuantile,
    quantileDistance,
    margin: settings.thresholdMargin,
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
    if (cumulative >= target) {
      return item.value;
    }
  }
  return order[order.length - 1].value;
}

function minPairwiseDistance(representatives) {
  if (representatives.length < 2) {
    return { distance: 0, pair: [] };
  }

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
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
