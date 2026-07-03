'use strict';
/* 共有 e2e ランナー。シナリオ（test/scenarios/*.js）を puppeteer-core + system Chrome で駆動する。
   file:// のディスクキャッシュ対策として、毎回アプリ一式を一意な一時ディレクトリへコピーして開く。
   ../icm.js 参照が成立するよう <tmp>/icm.js + <tmp>/contour-lab/index.html の構造で配置する。 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLDIR = path.resolve(__dirname, '..');            // .../contour-lab
const REPO = path.resolve(CLDIR, '..');                 // .../palette-reducer-app
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const VIDEO = process.env.CL_VIDEO || path.join(REPO, 'made', '0513_03_moto.mp4');
const OUT = path.join(CLDIR, 'test', 'out');
// index.html が ../ で参照するリポジトリ直下スクリプト（増えたらここに足す）
const SIBLING_SCRIPTS = ['icm.js'];

// contour-lab/ 直下のファイル群 + 兄弟スクリプトを一時ディレクトリへ複製し、index.html の file:// URL を返す。
function stageFiles() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-e2e-'));
  const appdir = path.join(base, 'contour-lab');
  fs.mkdirSync(appdir, { recursive: true });
  for (const name of fs.readdirSync(CLDIR)) {
    const src = path.join(CLDIR, name);
    let st; try { st = fs.statSync(src); } catch (e) { continue; }
    if (st.isFile()) fs.copyFileSync(src, path.join(appdir, name));
  }
  for (const name of SIBLING_SCRIPTS) {
    const src = path.join(REPO, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(base, name));
  }
  return { base, indexUrl: 'file://' + path.join(appdir, 'index.html') };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(scenario) {
  const staged = stageFiles();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
      '--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--window-size=1400,900',
      '--js-flags=--expose-gc'], // window.gc() を許可（cow シナリオのヒープ計測を安定化）
  });
  let pass = 0, fail = 0;
  const errors = [];
  const logs = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    page.on('console', (m) => logs.push('[c.' + m.type() + '] ' + m.text()));
    page.on('pageerror', (e) => { const s = '[PAGEERROR] ' + e.message; errors.push(s); logs.push(s); });
    page.on('requestfailed', (r) => {
      const err = (r.failure() && r.failure().errorText) || '';
      // 無害な既知ノイズは logs だけに残し errs には数えない:
      //  ・favicon.ico … Chrome が file:// で常に自動取得して失敗
      //  ・blob: の ERR_ABORTED … <video> のシーク時に進行中のバイト範囲フェッチが破棄される（デコード自体は成功している）
      const benign = /favicon\.ico$/.test(r.url()) || (/^blob:/.test(r.url()) && /ERR_ABORTED/.test(err));
      const s = '[reqfail] ' + r.url() + ' ' + err;
      logs.push(s);
      if (!benign) errors.push(s);
    });

    await page.goto(staged.indexUrl, { waitUntil: 'domcontentloaded' });

    const t = {
      ok(cond, msg) { if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg); } return !!cond; },
      eq(a, b, msg) { return this.ok(a === b, msg + '  [got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b) + ']'); },
    };

    const ctx = {
      page, t, logs, errors, sleep, VIDEO, base: staged.base,
      async uploadVideo(v) { const input = await page.$('#fileInput'); await input.uploadFile(v || scenario.videoPath || VIDEO); },
      async waitVideoLoaded(timeout = 25000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
          const txt = await page.$eval('#videoInfo', (e) => e.textContent).catch(() => '');
          if (txt && txt !== '動画未読込') return txt;
          await sleep(400);
        }
        return false;
      },
      async waitFrameDrawn(timeout = 25000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
          const pct = await ctx.canvasPct();
          if (pct > 0) return true;
          await sleep(400);
        }
        return false;
      },
      async canvasPct() {
        return page.evaluate(() => {
          const c = document.getElementById('view'); if (!c) return -1;
          const g = c.getContext('2d'); let nz = 0, n = 0;
          try { const d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) { n++; if (d[i]) nz++; } }
          catch (e) { return -2; }
          return n ? (100 * nz / n) : 0;
        });
      },
      async viewBox() { return (await page.$('#view')).boundingBox(); },
      async shot(name) { await page.screenshot({ path: path.join(OUT, (scenario.name || 'scn') + '_' + name + '.png') }); },
      eval: (fn, ...a) => page.evaluate(fn, ...a),
      $eval: (sel, fn, ...a) => page.$eval(sel, fn, ...a),
    };

    if (scenario.video !== false) {
      await ctx.uploadVideo();
      t.ok(await ctx.waitVideoLoaded(), 'video loaded (videoInfo populated)');
      t.ok(await ctx.waitFrameDrawn(), 'first frame drawn on canvas (pct>0)');
    }

    await scenario.fn(ctx);
  } catch (e) {
    console.error('DRIVER/SCENARIO ERROR:', (e && e.stack) || e);
    fail++;
  } finally {
    try { await browser.close(); } catch (e) {}
    try { fs.rmSync(staged.base, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n[' + scenario.name + '] ' + pass + ' PASS / ' + fail + ' FAIL');
  if (errors.length) console.log('page errors (' + errors.length + '):\n' + errors.join('\n'));
  if (process.env.CL_E2E_VERBOSE) console.log('\n--- console log ---\n' + logs.join('\n'));
  process.exit(fail ? 1 : 0);
}

module.exports = { run, VIDEO, CLDIR, REPO, OUT };
