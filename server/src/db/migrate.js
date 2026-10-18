const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const applied = new Set(
    (await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      console.error(`[migrate] FAILED on ${file}: ${err.message}`);
      throw err;
    }
  }
  console.log('[migrate] done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
