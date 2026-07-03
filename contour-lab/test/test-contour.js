const A = require('../contour-lab.js');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  FAIL:', msg); } }
const at = (arr, W, x, y) => arr[y * W + x];
function rect(a, W, H, x0, y0, x1, y1) { A.bresenham(a, W, H, x0, y0, x1, y0, 1, null); A.bresenham(a, W, H, x1, y0, x1, y1, 1, null); A.bresenham(a, W, H, x1, y1, x0, y1, 1, null); A.bresenham(a, W, H, x0, y1, x0, y0, 1, null); }
function fcount(f) { let c = 0; for (let i = 0; i < f.length; i++) c += f[i]; return c; }

// ---- snapFps ----
ok(A.snapFps(29.97) === 29.97, 'snapFps keeps 29.97');
ok(A.snapFps(1 / (1001 / 30000)) === 29.97, 'snapFps 1/delta -> 29.97');
ok(A.snapFps(30.0) === 30, 'snapFps 30 -> 30 (nearest, NOT 29.97)');
ok(A.snapFps(23.976) === 23.976, 'snapFps 23.976');
ok(A.snapFps(24.0) === 24, 'snapFps 24 -> 24 (nearest, NOT 23.976)');
ok(A.snapFps(29.9) === 29.97, 'snapFps 29.9 -> 29.97 (within 1.2%)');
ok(A.snapFps(31) === 31, 'snapFps 31 stays');
ok(A.snapFps(0) === 0, 'snapFps 0 -> 0');

// ---- bresenham 8-connected diagonal ----
{
  const W = 4, H = 4, a = new Uint8Array(W * H);
  A.bresenham(a, W, H, 0, 0, 3, 3, 1, null);
  ok(at(a, W, 0, 0) && at(a, W, 1, 1) && at(a, W, 2, 2) && at(a, W, 3, 3), 'diagonal sets (0,0)(1,1)(2,2)(3,3)');
  let cnt = 0; for (let i = 0; i < a.length; i++) cnt += a[i];
  ok(cnt === 4, 'diagonal is exactly 4 px (8-connected, thin)');
}

// ---- closed diamond (8-conn edges) sealed by 4-conn fill ----
{
  const W = 7, H = 7, a = new Uint8Array(W * H), ch = new Map();
  const v = [[3, 0], [6, 3], [3, 6], [0, 3], [3, 0]];
  for (let i = 0; i < 4; i++) A.bresenham(a, W, H, v[i][0], v[i][1], v[i + 1][0], v[i + 1][1], 1, ch);
  const fill = A.computeFill(a, W, H);
  ok(at(fill, W, 3, 3) === 1, 'diamond center filled');
  ok(at(fill, W, 4, 2) === 1, 'diamond interior (4,2) filled');
  ok(at(fill, W, 0, 0) === 0 && at(fill, W, 6, 6) === 0, 'corners not filled');
  ok(at(fill, W, 5, 1) === 0, 'exterior pocket (5,1) NOT leaked (8-line vs 4-fill seal)');
  let ov = 0; for (let i = 0; i < a.length; i++) if (a[i] && fill[i]) ov++;
  ok(ov === 0, 'fill excludes the line pixels');
}

// ---- OPEN loop => leak-safe (fills nothing) ----
{
  const W = 7, H = 7, a = new Uint8Array(W * H);
  const v = [[3, 0], [6, 3], [3, 6], [0, 3], [3, 0]];
  for (let i = 0; i < 4; i++) A.bresenham(a, W, H, v[i][0], v[i][1], v[i + 1][0], v[i + 1][1], 1, null);
  a[1 * W + 4] = 0; // gap
  ok(fcount(A.computeFill(a, W, H)) === 0, 'un-closed loop fills nothing (no whole-frame flood)');
}

// ---- lone open stroke => no fill ----
{
  const W = 10, H = 10, a = new Uint8Array(W * H);
  A.bresenham(a, W, H, 1, 5, 8, 5, 1, null);
  ok(fcount(A.computeFill(a, W, H)) === 0, 'lone open stroke => no fill');
}

// ---- DONUT: closed loop inside a filled region => hole (even-odd) ----
{
  const W = 9, H = 9, a = new Uint8Array(W * H);
  rect(a, W, H, 1, 1, 7, 7); rect(a, W, H, 3, 3, 5, 5);
  const fill = A.computeFill(a, W, H);
  ok(at(fill, W, 2, 4) === 1, 'donut: annulus (2,4) filled');
  ok(at(fill, W, 4, 4) === 0, 'donut: inner (4,4) is a HOLE (not filled)');
  ok(at(fill, W, 0, 0) === 0, 'donut: exterior not filled');
}

// ---- CHORD across a region: a line touching the outer boundary at both ends => BOTH halves filled ----
{
  const W = 9, H = 9, a = new Uint8Array(W * H);
  rect(a, W, H, 1, 1, 7, 7);
  A.bresenham(a, W, H, 4, 1, 4, 7, 1, null); // vertical chord dividing the square
  const fill = A.computeFill(a, W, H);
  ok(at(fill, W, 2, 4) === 1, 'chord: left half filled');
  ok(at(fill, W, 6, 4) === 1, 'chord: right half filled (NOT wrongly holed)');
  ok(at(fill, W, 0, 0) === 0, 'chord: exterior not filled');
}

// ---- TRIPLE NEST: fill / hole / fill by depth parity ----
{
  const W = 13, H = 13, a = new Uint8Array(W * H);
  rect(a, W, H, 1, 1, 11, 11); rect(a, W, H, 3, 3, 9, 9); rect(a, W, H, 5, 5, 7, 7);
  const fill = A.computeFill(a, W, H);
  ok(at(fill, W, 2, 6) === 1, 'nest depth1 (ring) filled');
  ok(at(fill, W, 4, 6) === 0, 'nest depth2 (ring) is hole');
  ok(at(fill, W, 6, 6) === 1, 'nest depth3 (core) filled');
}

// ---- sobelRGBA: edges must be BINARY (no blur) and 1px thin (NMS) ----
{
  const W = 8, H = 8; const src = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = (y * W + x) * 4; const val = x < 4 ? 0 : 255; src[p] = src[p + 1] = src[p + 2] = val; src[p + 3] = 255; }
  const e = A.sobelRGBA(src, W, H, 30);
  let nonzero = 0, nonBinary = 0, perRowMax = 0;
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { const a = e[(y * W + x) * 4 + 3]; if (a) { nonzero++; row++; if (a !== 255) nonBinary++; } } if (row > perRowMax) perRowMax = row; }
  ok(nonzero > 0, 'step edge -> some edge pixels');
  ok(nonBinary === 0, 'edges are BINARY alpha (0/255) — no blur/gradient');
  ok(perRowMax === 1, 'edge is 1px thin (≤1 edge px per row across a vertical step)');
  const flat = new Uint8ClampedArray(W * H * 4).fill(120); const e2 = A.sobelRGBA(flat, W, H, 30);
  let sum = 0; for (let i = 3; i < e2.length; i += 4) sum += e2[i];
  ok(sum === 0, 'flat image -> zero edges');
}

// ---- "clean interior" must clear a buried internal line in ONE pass (no dotted remnant) ----
{
  const W = 9, H = 9;
  const lines = new Uint8Array(W * H);
  rect(lines, W, H, 1, 1, 7, 7);                  // outer contour
  A.bresenham(lines, W, H, 3, 4, 5, 4, 1, null);  // buried internal line (3,4)(4,4)(5,4), not touching walls
  const fill = A.computeFill(lines, W, H);
  const isInternal = (p) => (p === 4 * W + 3 || p === 4 * W + 4 || p === 4 * W + 5);
  // app's cleanInterior predicate: remove a line px iff NO 8-neighbor is empty (non-line & non-fill)
  const pred = (L, F, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (!L[q] && !F[q]) return false; } return true; };
  const countInternal = (a) => { let c = 0; for (let p = 0; p < W * H; p++) if (isInternal(p) && a[p]) c++; return c; };
  // OLD (buggy): mutate lines DURING the scan
  const buggy = Uint8Array.from(lines);
  for (let p = 0; p < W * H; p++) if (buggy[p] && pred(buggy, fill, p % W, (p / W) | 0)) buggy[p] = 0;
  // NEW (fixed): collect from the ORIGINAL, then apply
  const fixed = Uint8Array.from(lines); const rm = [];
  for (let p = 0; p < W * H; p++) if (fixed[p] && pred(fixed, fill, p % W, (p / W) | 0)) rm.push(p);
  for (const p of rm) fixed[p] = 0;
  ok(countInternal(buggy) > 0, 'repro: mutate-in-scan leaves a dotted internal remnant (' + countInternal(buggy) + 'px)');
  ok(countInternal(fixed) === 0, 'FIX: collect-then-apply clears the whole internal line in ONE pass');
  ok(fixed[1 * W + 1] === 1, 'FIX: outer contour preserved');
}

// ---- RLE roundtrip (rleFromBitmap / bitmapFromRle) — P1-1 のスナップUndo/保存の要 ----
{
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; // 決定的PRNG（再現性）
  let allEq = true, worst = '';
  for (let t = 0; t < 100 && allEq; t++) {
    const N = 1 + ((rnd() * 500) | 0), b = new Uint8Array(N), density = rnd() * 0.5;
    for (let i = 0; i < N; i++) if (rnd() < density) b[i] = 1;
    const back = A.bitmapFromRle(A.rleFromBitmap(b), N);
    for (let i = 0; i < N; i++) if (b[i] !== back[i]) { allEq = false; worst = 'N=' + N + ' i=' + i; break; }
  }
  ok(allEq, 'RLE roundtrip on 100 random sparse bitmaps' + (allEq ? '' : ' FAIL@' + worst));
  ok(A.rleFromBitmap(new Uint8Array(10)).length === 0, 'RLE of empty bitmap = no runs');
  const fr = A.rleFromBitmap(new Uint8Array(8).fill(1));
  ok(fr.length === 2 && fr[0] === 0 && fr[1] === 8, 'RLE of all-set = one run [0,8]');
  const single = new Uint8Array(5); single[3] = 1; const sr = A.rleFromBitmap(single);
  ok(sr.length === 2 && sr[0] === 3 && sr[1] === 1, 'RLE of single px = run [3,1]');
  ok(A.bitmapFromRle(null, 5).every((v) => v === 0), 'bitmapFromRle(null) = all zeros');
}

// ---- P0-3: index.html の ?v= キャッシュバスター整合 ----
{
  const path = require('path');
  const { checkVersions } = require('./check-version.js');
  const vr = checkVersions(path.resolve(__dirname, '..', 'index.html'));
  ok(vr.ok, 'index.html cache-busters unified' + (vr.ok ? ' (?v=' + vr.versions[0] + ', ' + vr.count + ' refs)' : ' MIXED ' + JSON.stringify(vr.versions)));
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
