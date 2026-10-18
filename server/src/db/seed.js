const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

const SEEDS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'seeds');

async function seed() {
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`[seed] applied ${file}`);
    } catch (err) {
      console.error(`[seed] FAILED on ${file}: ${err.message}`);
      // Continue with next file instead of crashing the server
    }
  }
  console.log('[seed] done.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  // Do not exit — server can still start without all seed data
});
