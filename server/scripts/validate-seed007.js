const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seeds', '007_places_ja.sql'), 'utf8');
const lines = raw.split('\n');
let expecting = 'code'; // code → name → short → descr → history → culture → tips
let rowStart = 0;
let starts = 0;
lines.forEach((l, i) => {
  const n = i + 1;
  const t = l.replace(/\r$/, '');
  if (/^--/.test(t) || t === '') return;
  if (/^INSERT|^SELECT|^FROM \(VALUES|^\)/.test(t)) return;
  if (/^\s*\('/.test(t)) {
    starts++;
    rowStart = n;
    expecting = 'short'; // after code-name line
    const endsComma = /',\s*$/.test(t);
    if (!/^\s*\('[^']+',\s+'[^']+',\s*$/.test(t)) console.log(`L${n}: BAD code/name line: ${JSON.stringify(t.slice(0, 60))}`);
    return;
  }
  const has = /'/g;
  const quoteCount = (t.match(/'/g) || []).length;
  const isLast = /'\),\s*$/.test(t);
  const isMid = /',\s*$/.test(t);
  if (isLast) {
    if (expecting !== 'tips') console.log(`L${n}: close-paren row (start L${rowStart}) but expecting "${expecting}": ${JSON.stringify(t.slice(-50))}`);
    expecting = 'code';
  } else if (isMid) {
    if (quoteCount !== 2) console.log(`L${n}: suspect quote count ${quoteCount} (expecting ${expecting}): ${JSON.stringify(t.slice(-50))}`);
    expecting = { short: 'descr', descr: 'history', history: 'culture', culture: 'tips', tips: 'code' }[expecting] || 'code';
  } else {
    console.log(`L${n}: NO string terminator (expecting "${expecting}"): ${JSON.stringify(t.slice(-50))}`);
  }
});
console.log('tuple starts:', starts);
