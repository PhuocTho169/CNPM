const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', '..', 'database', 'seeds', '007_places_ja.sql');
let raw = fs.readFileSync(p, 'utf8');

const HISTORY_A = '\u8d77\u3053\u3055\u305b\u308b\u3002'; // bun-rieu history ending
const HISTORY_B = '\u306e\u3067\u3042\u308b\u3002';       // che (dessert) history ending
const HANGUL = /[\uac00-\ud7af\u1100-\u11ff]/;

let closeFixed = 0;
let bulletTrim = 0;

const fixed = raw.split('\n').map((line) => {
  let l = line;
  // 1. The two history rows: a stray `)` after the string close ended the
  //    VALUES tuple early. Pristine-damage and prior-attempt-damage forms:
  if ((l.includes(HISTORY_A) || l.includes(HISTORY_B)) && /'\),\s*$/.test(l)) {
    closeFixed++;
    l = l.replace(/'\),(\s*)$/, "','$1");
  } else if ((l.includes(HISTORY_A) || l.includes(HISTORY_B)) && /','\s*$/.test(l)) {
    closeFixed++;
    l = l.replace(/'(\r?)$/, '$1');
  }
  // 2. Leftover bullet/space just before a tips string close (`'),`).
  const before = l;
  l = l.replace(/[ \u2022]+(?='\))/, '');
  if (l !== before) bulletTrim++;
  return l;
});

const hangulStill = fixed.some((l) => HANGUL.test(l));
console.log('closeFixed =', closeFixed, ', bulletTrim =', bulletTrim, ', hangulStill =', hangulStill);

if (!closeFixed) throw new Error('no history-close fix applied');
if (hangulStill) throw new Error('korean fragment still present');
fs.writeFileSync(p, fixed.join('\n'), 'utf8');
console.log('wrote repaired 007_places_ja.sql');
