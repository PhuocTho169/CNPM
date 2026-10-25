const fs = require('fs');
const raw = fs.readFileSync('E:/Downloads/Download/Code/CNPM/CNPM/database/seeds/007_places_ja.sql', 'utf8');
const lines = raw.split('\n');
const HANGUL = /[\uac00-\ud7af]/;
const hangulLines = [];
lines.forEach((l, i) => { if (HANGUL.test(l)) hangulLines.push(i + 1); });
console.log('lines with hangul:', hangulLines);

const KO_RE = /[ \u2022]*[\uac00-\ud7af\u1100-\u11ff][\uac00-\ud7af\u1100-\u11ff\s]*(?='\))/;
hangulLines.forEach((n) => {
  const l = lines[n - 1];
  console.log('--- L' + n, JSON.stringify(l.replace(/\r$/, '').slice(-70)));
  console.log('   match:', KO_RE.test(l));
});
