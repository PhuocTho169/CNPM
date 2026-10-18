const db = require('../db');

async function health(req, res) {
  const dbOk = await db.healthCheck();
  res.status(dbOk ? 200 : 503).json({
    success: true,
    service: 'district4-culinary-guide-api',
    database: dbOk ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
}

module.exports = { health };
