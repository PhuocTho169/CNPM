/* Verifies every backend JS file parses cleanly (node --check per file). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const roots = ['server/src', 'scripts'];
let failed = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (entry.name.endsWith('.js')) {
      try {
        execFileSync('node', ['--check', full], { stdio: 'pipe' });
        console.log(`OK  ${full}`);
      } catch (err) {
        failed++;
        console.error(`ERR ${full}\n${err.stderr}`);
      }
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}
process.exit(failed ? 1 : 0);
