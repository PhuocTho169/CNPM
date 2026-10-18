const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error:', err.message);
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function getOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

async function getMany(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function healthCheck() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, query, getOne, getMany, healthCheck };
