const A = require('../contour-lab.js');
const M = require('../morpho.js');
const T = require('../timeline.js');
const Q = require('../quantize.js');
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

// ---- maskToLines ∘ computeFill が mask を復元する（P1-4 の要石） ----
{
  const orInto = (a, b) => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = (a[i] || b[i]) ? 1 : 0; return o; };
  const eqArr = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if ((a[i] ? 1 : 0) !== (b[i] ? 1 : 0)) return false; return true; };
  const borderHasNonMask = (m, W, H) => { for (let x = 0; x < W; x++) if (!m[x] || !m[(H - 1) * W + x]) return true; for (let y = 0; y < H; y++) if (!m[y * W] || !m[y * W + W - 1]) return true; return false; };
  const round = (m, W, H) => orInto(M.maskToLines(m, W, H), A.computeFill(M.maskToLines(m, W, H), W, H));
  let seed2 = 98765; const rnd2 = () => { seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff; return seed2 / 0x7fffffff; };
  const ri = (a, b) => a + ((rnd2() * (b - a + 1)) | 0);
  // 単一の凸形状（単連結）= even-odd で必ず復元可能なドメイン。ここでの失敗は maskToLines の真のバグ。
  function genMask(W, H) {
    const m = new Uint8Array(W * H);
    if (rnd2() < 0.5) { const x0 = ri(0, W - 2), y0 = ri(0, H - 2), x1 = Math.min(W - 1, x0 + ri(2, 12)), y1 = Math.min(H - 1, y0 + ri(2, 12)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y * W + x] = 1; }
    else { const cx = ri(2, W - 3), cy = ri(2, H - 3), r = ri(2, 7); for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) m[y * W + x] = 1; }
    return m;
  }
  let tested = 0, skipped = 0, failMsg = '';
  for (let t = 0; t < 300 && !failMsg; t++) {
    const W = ri(12, 40), H = ri(12, 40), mask = genMask(W, H);
    let pop = 0; for (let i = 0; i < mask.length; i++) pop += mask[i];
    if (!pop || !borderHasNonMask(mask, W, H)) { skipped++; continue; } // 空 or 外部シード無(画像全面被覆)
    if (!eqArr(round(mask, W, H), mask)) failMsg = 'W=' + W + ' H=' + H + ' t=' + t; else tested++;
  }
  ok(!failMsg, 'maskToLines∘computeFill reconstructs ' + tested + ' single convex shapes' + (failMsg ? ' FAIL@' + failMsg : '') + ' (' + skipped + ' degenerate skipped)');
  // maskToLines の定義（内側境界）を直接検証: 5x5 塗り四角の内側境界＝外周リング（中心のみ非線）
  { const m = new Uint8Array(49); for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) m[y * 7 + x] = 1; const L = M.maskToLines(m, 7, 7); ok(L[3 * 7 + 3] === 0 && L[1 * 7 + 1] === 1 && L[2 * 7 + 2] === 0, 'maskToLines = inner boundary (center non-line, corner is line, 1-in interior non-line)'); }
  // 複雑だが壁の厚い形状（代表的な実マスク）
  const L_shape = new Uint8Array(100); for (let y = 1; y <= 8; y++) for (let x = 1; x <= 3; x++) L_shape[y * 10 + x] = 1; for (let y = 6; y <= 8; y++) for (let x = 1; x <= 8; x++) L_shape[y * 10 + x] = 1;
  ok(eqArr(round(L_shape, 10, 10), L_shape), 'roundtrip: L-shape (thick, non-convex)');
  const two = new Uint8Array(120); for (let y = 2; y <= 5; y++) for (let x = 1; x <= 4; x++) two[y * 12 + x] = 1; for (let y = 3; y <= 7; y++) for (let x = 7; x <= 10; x++) two[y * 12 + x] = 1;
  ok(eqArr(round(two, 12, 10), two), 'roundtrip: two disjoint blobs');
  // 既知の限界（黙って壊れないよう明示テスト）: 壁1pxの穴(3x3リングの中心)は even-odd で塗られる＝復元は穴を埋める。
  // 一方、壁2px以上の穴（上のdonut）は保持される。実マスク(キャラ輪郭)では細壁の穴はほぼ無く実害は無視できる。
  { const W = 5, H = 5, m = new Uint8Array(W * H); for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) m[y * W + x] = 1; m[2 * W + 2] = 0; const r = round(m, W, H); ok(r[2 * W + 2] === 1, 'known limit: 1px-walled hole (3x3 ring) is filled by even-odd — documented model limitation'); }
  // 手作りケース
  const sq = new Uint8Array(81); for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) sq[y * 9 + x] = 1;
  ok(eqArr(round(sq, 9, 9), sq), 'roundtrip: solid square');
  const dn = new Uint8Array(81); for (let y = 1; y <= 7; y++) for (let x = 1; x <= 7; x++) dn[y * 9 + x] = 1; for (let y = 3; y <= 5; y++) for (let x = 3; x <= 5; x++) dn[y * 9 + x] = 0;
  ok(eqArr(round(dn, 9, 9), dn), 'roundtrip: donut (hole preserved)');
  const lh = new Uint8Array(81); for (let y = 0; y < 9; y++) for (let x = 0; x <= 4; x++) lh[y * 9 + x] = 1;
  ok(eqArr(round(lh, 9, 9), lh), 'roundtrip: edge-touching left half');
  const px = new Uint8Array(81); px[4 * 9 + 4] = 1;
  ok(eqArr(round(px, 9, 9), px), 'roundtrip: single pixel');
}

// ---- zipStore（無圧縮ZIP）の構造と、あれば system unzip での検証 ----
{
  const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  const zip = M.zipStore([{ name: 'a.txt', data: enc('hello') }, { name: 'dir/b.bin', data: new Uint8Array([1, 2, 3, 4, 5]) }]);
  ok(zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x03 && zip[3] === 0x04, 'zip starts with local-file-header signature');
  let eocd = -1; for (let i = zip.length - 22; i >= 0; i--) if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) { eocd = i; break; }
  ok(eocd >= 0, 'zip has EOCD record');
  ok(eocd >= 0 && (zip[eocd + 10] | (zip[eocd + 11] << 8)) === 2, 'EOCD central-directory count = 2');
  try {
    const os = require('os'), fs = require('fs'), cp = require('child_process'), path = require('path');
    let haveUnzip = true; try { cp.execSync('unzip -v', { stdio: 'pipe' }); } catch (e) { if (e.code === 'ENOENT') haveUnzip = false; }
    if (!haveUnzip) { console.log('  (note: system unzip not installed — skipped unzip -t)'); }
    else { const tmp = path.join(os.tmpdir(), 'cl-ziptest-' + process.pid + '.zip'); fs.writeFileSync(tmp, Buffer.from(zip)); let good = true; try { cp.execSync('unzip -t ' + tmp, { stdio: 'pipe' }); } catch (e) { good = false; } fs.unlinkSync(tmp); ok(good, 'system unzip -t validates the archive'); }
  } catch (e) { console.log('  (note: unzip -t check skipped: ' + e.message + ')'); }
}

// ---- detectCuts（P2 カット検出） ----
{
  // ノイズ0.1 + frame10 で大きなジャンプ0.9 → cut=[10]
  const d = new Float32Array(20); for (let i = 1; i < 20; i++) d[i] = 0.1; d[10] = 0.9;
  const c = T.detectCuts(d, 0.5);
  ok(c.length === 1 && c[0] === 10, 'detectCuts finds the single spike at frame 10 (got ' + JSON.stringify(Array.from(c)) + ')');
  // 全て平坦(0.1) → カット無し（0.1 < threshold 0.5）
  const flat = new Float32Array(20).fill(0.1); flat[0] = 0;
  ok(T.detectCuts(flat, 0.5).length === 0, 'detectCuts: flat distances -> no cuts');
  // 連続超過は先頭のみ
  const run = new Float32Array(20); for (let i = 1; i < 20; i++) run[i] = 0.1; run[8] = 0.9; run[9] = 0.9;
  const cr = T.detectCuts(run, 0.5);
  ok(cr.length === 1 && cr[0] === 8, 'detectCuts: consecutive over-threshold counts once at the start (got ' + JSON.stringify(Array.from(cr)) + ')');
  // しきい値は 0.82 で上限（med+3MAD が大きくても 0.85 のスパイクは拾える）
  const hi = new Float32Array(30); for (let i = 1; i < 30; i++) hi[i] = 0.3; hi[15] = 0.85;
  const chi = T.detectCuts(hi, 0.5);
  ok(chi.includes(15), 'detectCuts: 0.82 cap lets a 0.85 spike through even with elevated baseline');
  // 2シーンの模擬（前半0.05, カット0.95, 後半0.05）
  const two = new Float32Array(40); for (let i = 1; i < 40; i++) two[i] = 0.05; two[25] = 0.95;
  ok(JSON.stringify(Array.from(T.detectCuts(two, 0.5))) === '[25]', 'detectCuts: two-scene clip -> cut at 25');
}

// ---- sceneTarget（Shift+←→ シーン移動、次シーンの先頭へ） ----
{
  const st = T.sceneTarget;
  ok(st([300], 100, 1) === 300, 'forward from mid scene0 -> next scene first frame (300)');
  ok(st([300], 300, 1) === null, 'forward from last scene -> null (no jump to video end)');
  ok(st([300], 400, 1) === null, 'forward in last scene -> null');
  ok(st([], 100, 1) === null, 'forward with no cuts -> null (was jumping to last frame — the reported bug)');
  ok(st([100, 300, 500], 350, 1) === 500, 'forward skips to the NEXT scene start (500), not current end');
  ok(st([300], 400, -1) === 300, 'backward -> current scene first frame (300)');
  ok(st([300], 300, -1) === 0, 'backward at scene start -> previous scene start (0)');
  ok(st([300], 100, -1) === 0, 'backward in scene0 -> 0');
  ok(st([300], 0, -1) === null, 'backward at very start -> null');
  ok(st([100, 300, 500], 350, -1) === 300, 'backward -> current scene start (300)');
}

// ---- guidedFilterRGB（P4-1: エッジ保存平滑化） ----
{
  const W = 20, H = 20, N = W * H;
  // ステップエッジ + 平坦部にノイズ
  const rgba = new Uint8ClampedArray(N * 4);
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = (y * W + x) * 4; let v = x < 10 ? 50 : 200; v += (rnd() - 0.5) * 30; rgba[p] = rgba[p + 1] = rgba[p + 2] = v; rgba[p + 3] = 255; }
  const g = Q.guidedFilterRGB(rgba, W, H, 3, 0.005);
  const at = (x, y) => g[(y * W + x) * 4];
  ok(at(10, 10) - at(9, 10) > 100, 'guided filter keeps the step edge sharp (jump ' + (at(10, 10) - at(9, 10)).toFixed(0) + ' > 100)');
  // 平坦部の分散が下がる（左半分 x<10 の生 vs 平滑後）
  const varOf = (arr, raw) => { let s = 0, s2 = 0, n = 0; for (let y = 2; y < H - 2; y++) for (let x = 2; x < 8; x++) { const v = raw ? arr[(y * W + x) * 4] : arr[y * W + x]; s += v; s2 += v * v; n++; } return s2 / n - (s / n) * (s / n); };
  ok(varOf(g, true) < varOf(rgba, true), 'guided filter reduces flat-region noise variance (' + varOf(rgba, true).toFixed(0) + '->' + varOf(g, true).toFixed(0) + ')');
  ok(g.length === N * 4 && g[3] === 255, 'guided filter output is RGBA, opaque');
}

// ---- quantizeLabels（P4-2） ----
{
  const W = 12, H = 12, N = W * H, rgba = new Uint8ClampedArray(N * 4);
  const pal = [[220, 30, 30], [30, 200, 40], [40, 60, 210], [230, 210, 40]];
  for (let i = 0, p = 0; i < N; i++, p += 4) { const c = pal[i % 4]; rgba[p] = c[0]; rgba[p + 1] = c[1]; rgba[p + 2] = c[2]; rgba[p + 3] = 255; }
  const r4 = Q.quantizeLabels(rgba, W, H, 4, 10);
  ok(new Set(r4.labels).size <= 4 && r4.centers.length === 4, 'quantize K=4 on 4-color image -> <=4 labels, 4 centers');
  const r2 = Q.quantizeLabels(rgba, W, H, 2, 10);
  ok(new Set(r2.labels).size <= 2, 'quantize K=2 merges to <=2 labels');
  ok(r2.labels.length === N, 'labels cover every pixel');
  // 各ラベルの中心が実在色に近い
  const near = r4.centers.every((c) => pal.some((p) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2 < 400));
  ok(near, 'quantize centers land on the true palette colors');
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
