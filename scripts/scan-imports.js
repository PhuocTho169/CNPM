// Static scan for the two mistakes that produce a blank screen or an immediate
// crash and are otherwise invisible until the app runs:
//
//   1. a relative import that does not resolve (renamed/moved file, typo)
//   2. a React hook or helper used in the file but never imported
//
// The second one actually shipped in this repo before: SettingsScreen called
// useCallback without importing it, so opening the Settings tab threw
// ReferenceError. Vite and Metro both let that through at build time.
//
// Usage: node scripts/scan-imports.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['apps/web/src', 'apps/mobile/src', 'apps/mobile/App.js', 'server/src'];

// Hooks and helpers that must be imported if referenced.
const MUST_IMPORT = [
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  'useReducer', 'useEffectEvent', 'useFocusEffect', 'useNavigation', 'useSafeAreaInsets',
];

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];

function walk(target, out = []) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) return out;
  if (fs.statSync(abs).isFile()) {
    if (/\.jsx?$/.test(abs)) out.push(abs);
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    walk(path.join(target, entry.name), out);
  }
  return out;
}

function resolves(specifier, fromFile) {
  if (!specifier.startsWith('.')) return true; // bare package: assume node_modules
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;
  return EXTENSIONS.some((ext) => fs.existsSync(base + ext));
}

let brokenImports = 0;
let missingHooks = 0;
let files = 0;

for (const target of TARGETS) {
  for (const file of walk(target)) {
    files++;
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    // --- import statements ---
    const importRe = /(?:import\s[^'"]*from\s*|import\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
    let m;
    const imported = new Set();
    while ((m = importRe.exec(src))) {
      const spec = m[1];
      const names = src.slice(m.index, m.index + 400);
      for (const hook of MUST_IMPORT) {
        if (new RegExp(`\\b${hook}\\b`).test(names)) imported.add(hook);
      }
      if (!resolves(spec, file)) {
        console.error(`  BROKEN IMPORT  ${rel}\n                 -> ${spec}`);
        brokenImports++;
      }
    }

    // --- hooks referenced but not imported ---
    const body = src.replace(importRe, '');
    for (const hook of MUST_IMPORT) {
      const used = new RegExp(`(^|[^.\\w])${hook}\\s*[(<]`).test(body);
      if (used && !imported.has(hook) && !new RegExp(`function\\s+${hook}\\b`).test(body)) {
        console.error(`  MISSING IMPORT  ${rel}\n                 -> ${hook}() dùng nhưng chưa import`);
        missingHooks++;
      }
    }
  }
}

console.log(`\nquét ${files} file.`);
console.log(`import hỏng: ${brokenImports}   hook thiếu import: ${missingHooks}`);
process.exitCode = brokenImports + missingHooks ? 1 : 0;