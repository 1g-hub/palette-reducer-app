'use strict';
/* e2e CLI: `node test/e2e.js <scenario>` → test/scenarios/<scenario>.js を driver で駆動。 */
const path = require('path');
const fs = require('fs');
const { run } = require('./driver');

const name = process.argv[2];
if (!name) {
  const dir = path.join(__dirname, 'scenarios');
  const avail = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')) : [];
  console.error('usage: node test/e2e.js <scenario>\n  available: ' + (avail.join(', ') || '(none)'));
  process.exit(2);
}
const file = path.join(__dirname, 'scenarios', name + '.js');
if (!fs.existsSync(file)) { console.error('no such scenario: ' + name + '  (' + file + ')'); process.exit(2); }
const scenario = require(file);
if (!scenario.name) scenario.name = name;
run(scenario);
