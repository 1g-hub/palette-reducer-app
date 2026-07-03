'use strict';
/* index.html 内の全 ?v= キャッシュバスターが同一値かを検査（コード編集時の取り違え防止）。
   単体実行: node test/check-version.js  ／  test-contour.js からも呼ばれる。 */
const fs = require('fs');
const path = require('path');

function checkVersions(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const vs = [...html.matchAll(/(?:src|href)="[^"]*\?v=([0-9]+)"/g)].map((m) => m[1]);
  const uniq = [...new Set(vs)];
  return { ok: vs.length > 0 && uniq.length === 1, count: vs.length, versions: uniq };
}

if (require.main === module) {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const r = checkVersions(htmlPath);
  if (r.ok) { console.log('version-check ok: ' + r.count + ' refs all ?v=' + r.versions[0]); process.exit(0); }
  console.log('version-check FAIL: mixed ?v= ' + JSON.stringify(r.versions) + ' across ' + r.count + ' refs');
  process.exit(1);
}
module.exports = { checkVersions };
