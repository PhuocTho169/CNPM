// Parse-check every mobile source file.
//
// Metro will not tell you a file is broken until the bundler hits it on a
// device, which is a slow way to learn you have a typo. This parses the sources
// offline using the parser bundled inside @babel/core.
//
// Parsing only (no transform) on purpose: babel-preset-expo is not installed
// in this checkout, and we only need to catch syntax errors, not produce
// output. The syntax flags cover what this app actually uses.
//
// Usage: node scripts/check-syntax.js
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const SRC = path.join(__dirname, '..', 'src');
const ROOT_FILE = path.join(__dirname, '..', 'App.js');

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const PARSER_PLUGINS = [
  'jsx',
  'classProperties',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'dynamicImport',
  'topLevelAwait',
];

const files = [ROOT_FILE, ...collect(SRC)];
let failed = 0;

for (const file of files) {
  const relative = path.relative(path.join(__dirname, '..'), file);
  try {
    babel.parseSync(fs.readFileSync(file, 'utf8'), {
      filename: file,
      configFile: false,
      babelrc: false,
      parserOpts: { sourceType: 'module', plugins: PARSER_PLUGINS },
    });
    console.log(`  ok   ${relative}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${relative}\n       ${err.message.split('\n')[0]}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} files parsed.`);
process.exitCode = failed ? 1 : 0;