'use strict';
/* morpho.js — 純関数（DOM非依存）。ContourLab 名前空間に co-attach。
   maskToLines: 塗り領域(mask) → 「線」(内側境界)。even-odd の computeFill と合わせて lines∪fill===mask を復元する
     ため、取込(ワンド/スクリブル/モデル出力/PNG)は全てこれ経由で lines に変換する（fill は導出物）。
     定義: mask 画素のうち4近傍に「非mask or 画像端」を持つ画素＝内側境界。
     制約: mask が画像全体(=外部が無い)だと even-odd の外部シードが存在せず復元不可（モデルの本質的限界）。
   zipStore: 無圧縮(store)ZIP。PNG は圧縮済みなので store で十分。 */
(function (global) {
  function maskToLines(mask, W, H) {
    const N = W * H, lines = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !mask[i - 1] || !mask[i + 1] || !mask[i - W] || !mask[i + W]) lines[i] = 1;
    }
    return lines;
  }

  // ---- CRC32 (zip 用) ----
  const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(bytes, start, end) { start = start || 0; end = end == null ? bytes.length : end; let c = 0xFFFFFFFF; for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function concat(arrs) { let n = 0; for (const a of arrs) n += a.length; const out = new Uint8Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; }
  const u16 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255]);
  const u32 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
  const enc = (s) => { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };

  // files: [{name, data:Uint8Array}] → Uint8Array（無圧縮ZIP）
  function zipStore(files) {
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc(f.name), data = f.data, crc = crc32(data, 0, data.length), sz = data.length;
      const lh = concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0), name]);
      parts.push(lh, data);
      central.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
      offset += lh.length + sz;
    }
    const cd = concat(central);
    const eocd = concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)]);
    return concat([...parts, cd, eocd]);
  }

  const API = { maskToLines, crc32, zipStore };
  if (typeof window !== 'undefined') window.ContourLab = Object.assign(window.ContourLab || {}, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.CLMorpho = API;
})(typeof self !== 'undefined' ? self : this);
