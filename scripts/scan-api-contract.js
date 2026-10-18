// Cross-check every API path the frontends call against the routes the backend
// actually registers.
//
// A typo or a stale endpoint does not break any build — it fails at runtime
// with a 404 on the screen the visitor is looking at. This is the cheapest way
// to catch that class of bug.
//
// Usage: node scripts/scan-api-contract.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---- 1. routes the backend registers ----
const routesFile = path.join(ROOT, 'server', 'src', 'routes', 'index.js');
const routeSrc = fs.readFileSync(routesFile, 'utf8');
const routes = new Set();

for (const m of routeSrc.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)) {
  routes.add(`${m[1].toUpperCase()} ${m[2]}`);
}

// A router.<verb>('/x') inside a mounted sub-router becomes /prefix/x; this
// project mounts a single flat router, but guard anyway.
const mounted = routeSrc.match(/app\.use\(\s*'([^']+)'/);

// ---- 2. calls the frontends make ----
function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  // The target list mixes directories with single files (App.js).
  if (fs.statSync(abs).isFile()) {
    if (/\.jsx?$/.test(abs)) out.push(abs);
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) walk(path.relative(ROOT, full), out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const calls = [];
for (const dir of ['apps/web/src', 'apps/mobile/src', 'apps/mobile/App.js']) {
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    // Match the whole literal properly: a template literal can contain single
    // quotes inside `${cond ? 'a' : 'b'}`, so capturing up to "any quote" would
    // truncate the path and produce bogus route mismatches.
    const re = /\bapi\.(get|post|put|patch|delete)\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g;
    let m;
    while ((m = re.exec(src))) {
      const literal = m[2] ?? m[3] ?? m[4] ?? '';
      if (literal) calls.push({ verb: m[1].toUpperCase(), path: literal, file: rel });
    }
  }
}

/**
 * Turn a frontend call into the route pattern(s) the router would register.
 *
 * A template hole like `${id}` becomes `:param`. A hole that picks between
 * literals (`${regenerate ? '/regenerate' : ''}`) means one call site can reach
 * two different routes, so both are returned and checked.
 */
/**
 * Drop the query string, ignoring any `?` that lives inside a `${…}` hole.
 *
 * `${regenerate ? '/regenerate' : ''}` contains a ternary `?` that is NOT a
 * query separator. Splitting on the first `?` truncates the path mid-template
 * and makes the template parser below see an unterminated hole.
 */
function stripQuery(p) {
  let depth = 0;
  for (let i = 0; i < p.length; i++) {
    if (p.startsWith('${', i)) { depth++; i++; continue; }
    if (p[i] === '}') { depth = Math.max(0, depth - 1); continue; }
    if (p[i] === '?' && depth === 0) return p.slice(0, i);
  }
  return p;
}

function variantsOf(p) {
  const path_ = stripQuery(p);
  const holeRe = /\$\{([^}]*)\}/g;
  const holes = [...path_.matchAll(holeRe)];
  if (!holes.length) return [tidy(path_)];

  // Text between the holes, e.g. ['/places/', '/guide'] for
  // `/places/${id}/guide`. These must be preserved when expanding branches.
  const segments = path_.split(holeRe).filter((s, i) => i % 2 === 0);

  // Each hole: the literal branches it could produce, plus a generic param.
  const optionsPerHole = holes.map((h) => {
    const literals = [...h[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
    return literals.length ? [...new Set(literals), ':param'] : [':param'];
  });

  const out = [];
  // Iterate holes, not segments: segments has one more entry (the tail after
  // the last hole), which is appended when the holes run out.
  const build = (i, acc) => {
    if (i >= optionsPerHole.length) {
      out.push(tidy(acc + segments[i]));
      return;
    }
    for (const opt of optionsPerHole[i]) build(i + 1, acc + segments[i] + opt);
  };
  build(0, '');
  return [...new Set(out)];
}

function tidy(p) {
  return p.replace(/\/\//g, '/').replace(/\/$/, '');
}

function matches(callPath, routePath) {
  const c = tidy(callPath).split('/');
  const r = routePath.split('/');
  if (c.length !== r.length) return false;
  return c.every((seg, i) => r[i].startsWith(':') || seg === r[i]);
}

const problems = [];
const seen = new Set();

for (const call of calls) {
  const key = `${call.verb} ${call.path}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const found = variantsOf(call.path).some((variant) =>
    [...routes].some((r) => {
      const [verb, p] = r.split(' ');
      return verb === call.verb && matches(variant, p);
    })
  );

  if (!found) problems.push(call);
}

console.log(`Backend đăng ký ${routes.size} route.`);
console.log(`Frontend gọi ${seen.size} endpoint khác nhau.\n`);

if (problems.length) {
  for (const p of problems) {
    console.error(`  KHÔNG KHỚP  ${p.verb} ${p.path}\n              gọi từ ${p.file}`);
  }
  console.log(`\n${problems.length} endpoint không tìm thấy route tương ứng.`);
  process.exitCode = 1;
} else {
  console.log('Mọi endpoint frontend gọi đều có route trong backend. ✓');
}
void mounted;